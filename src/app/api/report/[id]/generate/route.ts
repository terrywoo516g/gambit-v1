import { NextResponse } from 'next/server'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  console.log('Generating report for:', params.id)
  // TODO: D3 之后实现生成 PDF 逻辑
  return NextResponse.json({ status: 'generating', pdfUrl: null })
}
