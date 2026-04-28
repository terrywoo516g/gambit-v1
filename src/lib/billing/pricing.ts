export const PRICING = {
  MODEL_CALL_PER_MODEL: 10,
  REFLECTION: 5,
  FINAL_DRAFT: 5,
} as const

export type PricingKey = keyof typeof PRICING

export function calcModelCallCost(modelCount: number): number {
  if (modelCount <= 0) return 0
  return modelCount * PRICING.MODEL_CALL_PER_MODEL
}

