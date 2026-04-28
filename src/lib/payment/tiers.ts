export interface Tier {
  id: string
  amountCents: number
  credits: number
  label: string
}

export const TIERS: Tier[] = [
  { id: 'tier_19', amountCents: 190, credits: 190, label: '¥1.9 / 190 积分' },
  { id: 'tier_99', amountCents: 990, credits: 990, label: '¥9.9 / 990 积分' },
  { id: 'tier_299', amountCents: 2990, credits: 2990, label: '¥29.9 / 2990 积分' },
]

export function getTier(id: string): Tier | undefined {
  return TIERS.find(t => t.id === id)
}

