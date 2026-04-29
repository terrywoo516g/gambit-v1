import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'

async function fetchGitHubVerifiedEmail(accessToken?: string | null) {
  if (!accessToken) return null

  const res = await fetch('https://api.github.com/user/emails', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'gambit-v1',
    },
  })
  if (!res.ok) return null

  const emails = (await res.json()) as Array<{
    email?: string
    primary?: boolean
    verified?: boolean
  }>
  const primaryVerified = emails.find((item) => item.primary && item.verified && item.email)
  return primaryVerified?.email || null
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: '/login',
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // 仅对已校验邮箱的 provider 开启，校验在 signIn callback。
      allowDangerousEmailAccountLinking: true,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: { params: { scope: 'read:user user:email' } },
      // 仅对已校验邮箱的 provider 开启，校验在 signIn callback。
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        })
        if (!user || !user.passwordHash) return null
        const ok = await bcrypt.compare(credentials.password, user.passwordHash)
        if (!ok) return null
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        const emailVerified = (profile as { email_verified?: boolean })?.email_verified
        if (!emailVerified) return false
        if (!user.email) return false
        return true
      }

      if (account?.provider === 'github') {
        const verifiedEmail = await fetchGitHubVerifiedEmail(account.access_token)
        if (!verifiedEmail) return false
        user.email = verifiedEmail
        return true
      }

      return true
    },
    async jwt({ token, user }) {
      if (user) token.id = user.id
      return token
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        (session.user as any).id = token.id
      }
      return session
    },
  },
  events: {
    async createUser({ user }) {
      // 幂等：防止同邮箱绑定第二个 provider 时重复写 signup_bonus 流水。
      const existing = await prisma.creditTransaction.findFirst({
        where: { userId: user.id, type: 'signup_bonus' },
      })
      if (existing) return

      await prisma.creditTransaction.create({
        data: {
          userId: user.id,
          amount: 100,
          type: 'signup_bonus',
          description: '新用户注册赠送',
        },
      })
    },
    async linkAccount({ user, account }) {
      // OAuth provider 已校验 email，回填避免邮箱验证功能上线后误锁。
      if (account.provider === 'google' || account.provider === 'github') {
        const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
        if (dbUser && !dbUser.emailVerified) {
          await prisma.user.update({
            where: { id: user.id },
            data: { emailVerified: new Date() },
          })
        }
      }
    },
  },
}
