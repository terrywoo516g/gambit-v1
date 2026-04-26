import { NextResponse } from 'next/server'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(_req: Request) {
  // TODO: D3 之后实现创建 report 记录逻辑
  return NextResponse.json({ id: 'test123_report_id', status: 'pending' })
}
