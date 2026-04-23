export interface ModelInfo {
  id: string
  apiId: string
  provider: string
  description: string
  contextLength: string
  inputPrice: string
  outputPrice: string
}

export const MODEL_REGISTRY: ModelInfo[] = [
  {
    id: 'DeepSeek V3.2',
    apiId: 'deepseek-v3-2-251201',
    provider: 'Volcano',
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
    id: 'Doubao Seed 2.0 Pro',
    apiId: 'doubao-seed-2-0-pro-260215',
    provider: 'Volcano',
    description: '多模态理解',
    contextLength: '256K',
    inputPrice: '0.0032',
    outputPrice: '0.016',
  },
  {
    id: 'Doubao Seed 2.0 Mini',
    apiId: 'doubao-seed-2-0-mini-260215',
    provider: 'Volcano',
    description: '超低成本日常问答',
    contextLength: '256K',
    inputPrice: '0.0002',
    outputPrice: '0.002',
  },
  {
    id: 'Qwen3.6 Plus',
    apiId: 'qwen/qwen3.6-plus',
    provider: 'Aliyun',
    description: '最新一代，超长上下文 1000K',
    contextLength: '1000K',
    inputPrice: '0.002',
    outputPrice: '0.012',
  },
  {
    id: 'Qwen3 Max',
    apiId: 'qwen3-max',
    provider: 'Aliyun',
    description: '阿里旗舰模型',
    contextLength: '262K',
    inputPrice: '0.006',
    outputPrice: '0.024',
  },
  {
    id: 'GLM 5.1',
    apiId: 'z-ai/glm-5.1',
    provider: 'Zhipu',
    description: '国产顶级，编程强',
    contextLength: '200K',
    inputPrice: '0.006',
    outputPrice: '0.024',
  },
  {
    id: 'GLM 5',
    apiId: 'z-ai/glm-5',
    provider: 'Zhipu',
    description: '稳定版 GLM',
    contextLength: '200K',
    inputPrice: '0.004',
    outputPrice: '0.018',
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

export const DEFAULT_MODELS = ['DeepSeek V3.2', 'Doubao Seed 2.0 Pro', 'Kimi K2.6']

export function getModelByName(name: string): ModelInfo | undefined {
  return MODEL_REGISTRY.find(m => m.id === name)
}