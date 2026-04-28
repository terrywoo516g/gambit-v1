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
    id: 'Qwen3.5 Flash',
    apiId: 'qwen/qwen3.5-35b-a3b',
    provider: 'Aliyun',
    description: '新一代轻量高速模型',
    contextLength: '262K',
    inputPrice: '--',
    outputPrice: '--',
  },
  {
    id: 'MiniMax M2.5',
    apiId: 'minimax/minimax-m2.5',
    provider: 'MiniMax',
    description: '稳定高速模型',
    contextLength: '204.8K',
    inputPrice: '0.0021',
    outputPrice: '0.0084',
  },
  {
    id: 'Doubao 2.0 Mini',
    apiId: 'doubao-seed-2.0-mini',
    provider: 'ByteDance',
    description: '超低成本日常问答',
    contextLength: '256K',
    inputPrice: '0.0002',
    outputPrice: '0.002',
  },
  {
    id: 'Doubao 2.0 Pro',
    apiId: 'doubao-seed-2.0-pro',
    provider: 'ByteDance',
    description: '高质量通用模型',
    contextLength: '256K',
    inputPrice: '0.0032',
    outputPrice: '0.016',
  },
  {
    id: 'DeepSeek V4 Flash',
    apiId: 'deepseek/deepseek-v4-flash',
    provider: 'DeepSeek',
    description: '高 TPS 长上下文模型',
    contextLength: '1000K',
    inputPrice: '0.001',
    outputPrice: '0.002',
  },
  {
    id: 'DeepSeek V4 Pro',
    apiId: 'deepseek/deepseek-v4-pro',
    provider: 'DeepSeek',
    description: '旗舰深度思考模型',
    contextLength: '1000K',
    inputPrice: '0.012',
    outputPrice: '0.024',
  },
  {
    id: 'MiniMax M2.7',
    apiId: 'minimax/minimax-m2.7',
    provider: 'MiniMax',
    description: '新一代性价比模型',
    contextLength: '204.8K',
    inputPrice: '0.0021',
    outputPrice: '0.0084',
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
    id: 'GLM 5.1',
    apiId: 'z-ai/glm-5.1',
    provider: 'Zhipu',
    description: '最新 GLM 高级模型',
    contextLength: '200K',
    inputPrice: '0.006',
    outputPrice: '0.024',
  },
  {
    id: 'Qwen3.6 Plus',
    apiId: 'qwen/qwen3.6-plus',
    provider: 'Aliyun',
    description: '最新一代长上下文模型',
    contextLength: '1000K',
    inputPrice: '0.002',
    outputPrice: '0.012',
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
    id: 'Kimi K2.6',
    apiId: 'moonshotai/kimi-k2.6',
    provider: 'Moonshot',
    description: '最新旗舰 Kimi',
    contextLength: '262K',
    inputPrice: '0.0065',
    outputPrice: '0.027',
  },
  {
    id: 'GPT-OSS 120B',
    apiId: 'gpt-oss-120b',
    provider: 'OpenAI',
    description: '开放权重高性价比模型',
    contextLength: '128K',
    inputPrice: '0.00108',
    outputPrice: '0.0054',
  },
]

export const DEFAULT_MODELS = ['Qwen3.5 Flash', 'MiniMax M2.5', 'Doubao 2.0 Mini']

export function getModelByName(name: string): ModelInfo | undefined {
  return MODEL_REGISTRY.find(m => m.id === name)
}
