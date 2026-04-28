import RegisterForm from '@/components/auth/RegisterForm'

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-ink mb-2">GAMBIT</h1>
        <p className="text-inkLight text-sm">创建您的工作台账号</p>
      </div>
      <RegisterForm />
    </div>
  )
}