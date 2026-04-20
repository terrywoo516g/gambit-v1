import OpenAI from 'openai'
import { prisma } from './db'
import { v4 as uuidv4 } from 'uuid'

// ─── Types ───────────────────────────────────────────────────────────────────

export type Provider = 'qiniu' | 'volcano' | 'dmxapi'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LLMCallOptions {
  model: string
  provider: Provider
  messages: ChatMessage[]
  temperature?: number
  messageId?: string // 关联 messages 表，用于日志
}

export type StreamChunk =
  | { type: 'token'; data: string }
  | { type: 'done'; data: { tokensIn: number; tokensOut: number; latency: number; cost: number } }
  | { type: 'error'; data: string }

// ─── Provider Config ──────────────────────────────────────────────────────────

const PROVIDER_CONFIG: Record<Provider, { baseURL: string; apiKeyVar: string }> = {
  qiniu: {
    baseURL: process.env.QINIU_BASE_URL ?? 'https://api.qnaigc.com/v1',
    apiKeyVar: 'QINIU_API_KEY',
  },
  volcano: {
    baseURL: process.env.VOLCANO_BASE_URL ?? 'https://ark.cn-beijing.volces.com/api/v3',
    apiKeyVar: 'VOLCANO_API_KEY',
  },
  dmxapi: {
    baseURL: process.env.DMXAPI_BASE_URL ?? 'https://www.dmxapi.cn/v1',
    apiKeyVar: 'DMXAPI_API_KEY',
  },
}

// ─── 模型价格（¥/1M tokens，估算用）─────────────────────────────────────────

const MODEL_RATES: Record<string, { in: number; out: number }> = {
  'doubao-seed-1.6':      { in: 1,  out: 3  },
  'deepseek-v3':          { in: 1,  out: 3  },
  'deepseek-r1':          { in: 4,  out: 16 },
  'moonshotai/kimi-k2.5': { in: 4,  out: 13 },
  'z-ai/glm-4.7':         { in: 2,  out: 6  },
}

// ─── 模型注册表（前端 mention name → 实际 modelId + provider）────────────────

export const MODEL_REGISTRY: Record<string, { modelId: string; provider: Provider }> = {
  '豆包':        { modelId: 'doubao-seed-1.6',      provider: 'qiniu' },
  'DeepSeek':    { modelId: 'deepseek-v3',           provider: 'qiniu' },
  'DeepSeek-R1': { modelId: 'deepseek-r1',           provider: 'qiniu' },
  'Kimi':        { modelId: 'moonshotai/kimi-k2.5',  provider: 'qiniu' },
  'GLM':         { modelId: 'z-ai/glm-4.7',          provider: 'qiniu' },
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

function buildClient(provider: Provider): OpenAI {
  const cfg = PROVIDER_CONFIG[provider]
  const apiKey = process.env[cfg.apiKeyVar]
  if (!apiKey) throw new Error(`Missing env var: ${cfg.apiKeyVar}`)
  return new OpenAI({ apiKey, baseURL: cfg.baseURL })
}

function calcCost(model: string, tokensIn: number, tokensOut: number): number {
  const rates = MODEL_RATES[model] ?? { in: 2, out: 6 }
  return (tokensIn * rates.in + tokensOut * rates.out) / 1_000_000
}

async function logCall(opts: {
  id: string
  messageId?: string
  provider: string
  model: string
  tokensIn: number
  tokensOut: number
  latency: number
  cost: number
  status: string
}) {
  try {
    await prisma.llmCall.create({ data: opts })
  } catch (e) {
    // 日志失败不应影响主流程
    console.error('[llm-client] log failed:', e)
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * 流式调用 — 用于 SSE 路由
 * 用法：for await (const chunk of streamChat(opts)) { ... }
 */
export async function* streamChat(opts: LLMCallOptions): AsyncGenerator<StreamChunk> {
  const { model, provider, messages, temperature = 0.7, messageId } = opts
  const client = buildClient(provider)
  const callId = uuidv4()
  const t0 = Date.now()
  let tokensIn = 0
  let tokensOut = 0

  try {
    const stream = await client.chat.completions.create({
      model,
      messages,
      stream: true,
      temperature,
      stream_options: { include_usage: true },
    })

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content ?? ''
      if (text) yield { type: 'token', data: text }

      // 七牛云在最后一个 chunk 返回 usage
      if (chunk.usage) {
        tokensIn = chunk.usage.prompt_tokens
        tokensOut = chunk.usage.completion_tokens
      }
    }

    const latency = Date.now() - t0
    const cost = calcCost(model, tokensIn, tokensOut)
    yield { type: 'done', data: { tokensIn, tokensOut, latency, cost } }

    await logCall({
      id: callId, messageId, provider, model,
      tokensIn, tokensOut, latency, cost, status: 'success',
    })
  } catch (err: unknown) {
    const latency = Date.now() - t0
    const msg = err instanceof Error ? err.message : 'LLM call failed'
    yield { type: 'error', data: msg }

    await logCall({
      id: callId, messageId, provider, model,
      tokensIn: 0, tokensOut: 0, latency, cost: 0, status: 'error',
    })
  }
}

/**
 * 非流式调用 — 用于工具引导、合成等场景
 */
export async function chatOnce(opts: LLMCallOptions): Promise<string> {
  const { model, provider, messages, temperature = 0.7, messageId } = opts
  const client = buildClient(provider)
  const callId = uuidv4()
  const t0 = Date.now()

  try {
    const res = await client.chat.completions.create({
      model,
      messages,
      stream: false,
      temperature,
    })

    const content = res.choices[0]?.message?.content ?? ''
    const tokensIn = res.usage?.prompt_tokens ?? 0
    const tokensOut = res.usage?.completion_tokens ?? 0
    const latency = Date.now() - t0
    const cost = calcCost(model, tokensIn, tokensOut)

    await logCall({
      id: callId, messageId, provider, model,
      tokensIn, tokensOut, latency, cost, status: 'success',
    })

    return content
  } catch (err: unknown) {
    const latency = Date.now() - t0
    await logCall({
      id: callId, messageId, provider, model,
      tokensIn: 0, tokensOut: 0, latency, cost: 0, status: 'error',
    })
    throw err
  }
}
