import OpenAI from 'openai'
import { prisma } from './db'
import { v4 as uuidv4 } from 'uuid'

// ─── Types ───────────────────────────────────────────────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var qiniuKeyIndex: number | undefined
}

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

function getNextQiniuKey(): string {
  const keys: string[] = []
  // 动态读取环境变量，避免 Next.js 静态内联或 PM2 多进程导致的环境变量未加载问题
  for (let i = 1; i <= 10; i++) {
    const val = process.env[`QINIU_API_KEY_${i}`]
    if (val) keys.push(val)
  }
  if (keys.length === 0) {
    if (process.env.QINIU_API_KEY) keys.push(process.env.QINIU_API_KEY)
  }

  // 兜底方案：如果没有配置环境变量，给一个占位的错误Key，让后续请求在真正发送到大模型时再报错
  // 避免抛出错误导致应用启动崩溃 (PM2 无限重启)
  if (keys.length === 0) {
    console.error('[llm-client] ERROR: No QINIU API keys configured in environment variables.')
    return 'MISSING_API_KEY'
  }

  // 使用简单的全局计数器轮询，避免随机可能导致的某些 Key 被频繁使用
  if (typeof globalThis.qiniuKeyIndex === 'undefined') {
    globalThis.qiniuKeyIndex = 0
  }
  
  const index = globalThis.qiniuKeyIndex % keys.length
  globalThis.qiniuKeyIndex++
  
  return keys[index]
}

// ─── 模型价格（¥/1K tokens）─────────────────────────────────────────

const MODEL_RATES: Record<string, { in: number; out: number }> = {
  'deepseek/deepseek-v3.2-251201':  { in: 2,    out: 3    },
  'deepseek-v3-2-251201':           { in: 2,    out: 3    },
  'deepseek-r1-0528':               { in: 4,    out: 16   },
  'moonshotai/kimi-k2.6':           { in: 6.5,  out: 27   },
  'moonshotai/kimi-k2.5':           { in: 4,    out: 21   },
  'doubao-seed-2.0-pro':            { in: 3.2,  out: 16   },
  'doubao-seed-2-0-pro-260215':     { in: 3.2,  out: 16   },
  'doubao-seed-2.0-mini':           { in: 0.2,  out: 2    },
  'qwen/qwen3.6-plus':              { in: 2,    out: 12   },
  'qwen3-max':                      { in: 6,    out: 24   },
  'z-ai/glm-5.1':                   { in: 6,    out: 24   },
  'z-ai/glm-5':                     { in: 4,    out: 18   },
  'minimax/minimax-m2.7':           { in: 2.1,  out: 8.4  },
  'MiniMax-M1':                     { in: 4,    out: 16   },
}

// ─── 模型注册表（兼容旧引用，实际路由用 model-registry.ts）────────────────

export const MODEL_REGISTRY: Record<string, { modelId: string; provider: Provider }> = {
  'DeepSeek V3.2':        { modelId: 'deepseek-v3-2-251201',           provider: 'volcano' },
  'DeepSeek R1':          { modelId: 'deepseek-r1-0528',               provider: 'qiniu' },
  'Kimi K2.6':            { modelId: 'moonshotai/kimi-k2.6',           provider: 'qiniu' },
  'Kimi K2.5':            { modelId: 'moonshotai/kimi-k2.5',           provider: 'qiniu' },
  'Doubao Seed 2.0 Pro':  { modelId: 'doubao-seed-2-0-pro-260215',     provider: 'volcano' },
  'Doubao Seed 2.0 Mini': { modelId: 'doubao-seed-2.0-mini',           provider: 'qiniu' },
  'Qwen3.6 Plus':         { modelId: 'qwen/qwen3.6-plus',             provider: 'qiniu' },
  'Qwen3 Max':            { modelId: 'qwen3-max',                      provider: 'qiniu' },
  'GLM 5.1':              { modelId: 'z-ai/glm-5.1',                   provider: 'qiniu' },
  'GLM 5':                { modelId: 'z-ai/glm-5',                     provider: 'qiniu' },
  'MiniMax M2.7':         { modelId: 'minimax/minimax-m2.7',           provider: 'qiniu' },
  'MiniMax M1':           { modelId: 'MiniMax-M1',                     provider: 'qiniu' },
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

function buildClient(provider: Provider): OpenAI {
  const cfg = PROVIDER_CONFIG[provider]
  if (provider === 'qiniu') {
    const apiKey = getNextQiniuKey()
    return new OpenAI({ apiKey, baseURL: cfg.baseURL })
  }

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
