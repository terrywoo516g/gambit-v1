import { Suspense } from 'react'
import LoginForm from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-ink mb-2">GAMBIT</h1>
        <p className="text-inkLight text-sm">智能协作工作台</p>
      </div>
      <Suspense fallback={<div className="p-8 text-center text-sm text-inkLight">加载中...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  )
}