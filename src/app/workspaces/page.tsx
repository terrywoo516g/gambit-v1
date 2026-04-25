import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, ArrowRight } from 'lucide-react'

export default async function WorkspacesPage() {
  const cookieStore = cookies()
  const session = cookieStore.get('gambit_invite')
  if (!session?.value) redirect('/login')

  const workspaces = await prisma.workspace.findMany({
    where: { userId: session.value },
    orderBy: { updatedAt: 'desc' },
    take: 30,
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-xl font-bold text-gray-900">我的工作台</h1>
          <Link
            href="/"
            className="flex items-center gap-1.5 bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus size={14} />
            新建
          </Link>
        </div>

        {workspaces.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-gray-400 text-sm">还没有工作台</p>
            <Link href="/" className="text-blue-500 text-sm mt-2 inline-block hover:underline">
              去首页创建第一个 →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {workspaces.map((ws: any) => (
              <Link
                key={ws.id}
                href={`/workspace/${ws.id}`}
                className="flex items-center justify-between bg-white rounded-xl border border-gray-100 px-4 py-3.5 hover:border-blue-200 hover:shadow-sm transition-all group"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {ws.title || '未命名工作台'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(ws.updatedAt).toLocaleDateString('zh-CN', {
                      month: 'short', day: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
                <ArrowRight size={14} className="text-gray-300 group-hover:text-blue-400 shrink-0 ml-3 transition-colors" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
