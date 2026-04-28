import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import { redirect } from 'next/navigation'
import { TIERS } from '@/lib/payment/tiers'
import RechargeClient from './RechargeClient'

export default async function RechargePage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login?next=/recharge')

  const isMock = (process.env.PAYMENT_PROVIDER || 'mock') === 'mock'

  return <RechargeClient tiers={TIERS} isMock={isMock} />
}

