export const PRICING = {
  MODEL_CALL_PER_MODEL: 10,
  REFLECTION: 5,
  FINAL_DRAFT: 5,
  FINAL_DRAFT_STREAM: 10,
  FINAL_DRAFT_COMPOSE: 10,
  FINAL_DRAFT_POLISH: 3,
  FINAL_DRAFT_SPARK: 3,
  FINAL_DRAFT_REVIEW: 3,
  CHAT_STREAM: 10,
  OBSERVER: 5,
  RECOMMEND_SCENE: 3,
  SCENE_BRAINSTORM: 10,
  SCENE_COMPARE: 10,
  SCENE_REVIEW: 5,
  SCENE_GENERATE: 10,
  STREAM_SINGLE: 5,
} as const

export type PricingKey = keyof typeof PRICING

export function calcModelCallCost(modelCount: number): number {
  if (modelCount <= 0) return 0
  return modelCount * PRICING.MODEL_CALL_PER_MODEL
}

