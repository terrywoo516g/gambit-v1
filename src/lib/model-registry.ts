export interface ModelInfo {
  id: string          // 显示名，用于前端展示和 ModelRun.model 字段
  apiId: string       // 七牛云 API 的 model ID
  provider: string    // 厂商名
  description: string // 一句话描述
  contextLength: string
  inputPrice: string  // 每 K tokens
  outputPrice: string
}

export const MODEL_REGISTRY: ModelInfo[] = [
  {
    id: 'DeepSeek V3.2',
    apiId: 'deepseek/deepseek-v3.2-251201',
    provider: 'DeepSeek',
    description: '主力通用模型',
    contextLength: '128K',
    inputPrice: '0.002',
    outputPrice: '0.003',
  },
  {
    id: 'DeepSeek R1',
    apiId: 'deepseek-r1-0528',
    provider: 'DeepSeek',
    description: '深度思考推理',
    contextLength: '128K',
    inputPrice: '0.004',
    outputPrice: '0.016',
  },
  {
    id: 'Kimi K2.6',
    apiId: 'moonshotai/kimi-k2.6',
    provider: 'Moonshot',
    description: '最新旗舰，长上下文',
    contextLength: '262K',
    inputPrice: '0.0065',
    outputPrice: '0.027',
  },
  {
    id: 'Kimi K2.5',
    apiId: 'moonshotai/kimi-k2.5',
    provider: 'Moonshot',
    description: '性价比版 Kimi',
    contextLength: '256K',
    inputPrice: '0.004',
    outputPrice: '0.021',
  },
  {
    id: 'GLM 5.1',
    apiId: 'z-ai/glm-5.1',
    provider: '智谱',
    description: '国产顶级，编程强',
    contextLength: '200K',
    inputPrice: '0.006',
    outputPrice: '0.024',
  },
  {
    id: 'GLM 5',
    apiId: 'z-ai/glm-5',
    provider: '智谱',
    description: '稳定版 GLM',
    contextLength: '200K',
    inputPrice: '0.004',
    outputPrice: '0.018',
  },
  {
    id: '豆包 Seed 2.0 Pro',
    apiId: 'doubao-seed-2.0-pro',
    provider: '字节跳动',
    description: '多模态理解',
    contextLength: '256K',
    inputPrice: '0.0032',
    outputPrice: '0.016',
  },
  {
    id: '豆包 Seed 2.0 Mini',
    apiId: 'doubao-seed-2.0-mini',
    provider: '字节跳动',
    description: '超低成本日常问答',
    contextLength: '256K',
    inputPrice: '0.0002',
    outputPrice: '0.002',
  },
  {
    id: 'Qwen3 Max',
    apiId: 'qwen3-max',
    provider: '阿里云',
    description: '阿里旗舰模型',
    contextLength: '262K',
    inputPrice: '0.006',
    outputPrice: '0.024',
  },
  {
    id: 'Qwen3.5 Plus',
    apiId: 'qwen/qwen3.5-plus',
    provider: '阿里云',
    description: '超长上下文 1000K',
    contextLength: '1000K',
    inputPrice: '0.0008',
    outputPrice: '0.0048',
  },
  {
    id: 'MiniMax M2.7',
    apiId: 'minimax/minimax-m2.7',
    provider: 'MiniMax',
    description: '性价比编程模型',
    contextLength: '204K',
    inputPrice: '0.0021',
    outputPrice: '0.0084',
  },
  {
    id: 'MiniMax M1',
    apiId: 'MiniMax-M1',
    provider: 'MiniMax',
    description: '深度思考 1000K',
    contextLength: '1000K',
    inputPrice: '0.004',
    outputPrice: '0.016',
  },
]

export const DEFAULT_MODELS = ['DeepSeek V3.2', '豆包 Seed 2.0 Pro', 'Kimi K2.5']

export function getModelByName(name: string): ModelInfo | undefined {
  return MODEL_REGISTRY.find(m => m.id === name)
}
