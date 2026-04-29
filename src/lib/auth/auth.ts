import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'

type OAuthAccountInput = {
  provider: string
  providerAccountId: string
  type: string
  refresh_token?: string | null
  access_token?: string | null
  expires_at?: number | null
  token_type?: string | null
  scope?: string | null
  id_token?: string | null
  session_state?: string | null
}

async function linkOAuthAccount(userId: string, account: OAuthAccountInput) {
  await prisma.account.upsert({
    where: {
      provider_providerAccountId: {
        provider: account.provider,
        providerAccountId: account.providerAccountId,
      },
    },
    update: { userId },
    create: {
      userId,
      type: account.type,
      provider: account.provider,
      providerAccountId: account.providerAccountId,
      refresh_token: account.refresh_token,
      access_token: account.access_token,
      expires_at: account.expires_at,
      token_type: account.token_type,
      scope: account.scope,
      id_token: account.id_token,
      session_state: account.session_state,
    },
  })
}

async function ensureOAuthUser(email: string, name: string | null | undefined, image: string | null | undefined, account: OAuthAccountInput) {
  const normalizedEmail = email.trim().toLowerCase()
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } })

  if (existing) {
    await linkOAuthAccount(existing.id, account)
    return true
  }

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: normalizedEmail,
        name: name || undefined,
        image: image || undefined,
        emailVerified: new Date(),
      },
    })

    await tx.creditTransaction.create({
      data: {
        userId: user.id,
        amount: 100,
        type: 'signup_bonus',
        description: '新用户注册赠送',
      },
    })

    await tx.account.create({
      data: {
        userId: user.id,
        type: account.type,
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        refresh_token: account.refresh_token,
        access_token: account.access_token,
        expires_at: account.expires_at,
        token_type: account.token_type,
        scope: account.scope,
        id_token: account.id_token,
        session_state: account.session_state,
      },
    })
  })

  return true
}

async function getPrimaryVerifiedGitHubEmail(accessToken?: string | null) {
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
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
      authorization: { params: { scope: 'read:user user:email' } },
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
      if (!account || account.provider === 'credentials') return true

      const oauthAccount: OAuthAccountInput = {
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        type: account.type,
        refresh_token: account.refresh_token,
        access_token: account.access_token,
        expires_at: account.expires_at,
        token_type: account.token_type,
        scope: account.scope,
        id_token: account.id_token,
        session_state: account.session_state as string | null | undefined,
      }

      if (account.provider === 'google') {
        const googleProfile = profile as { email?: string | null; email_verified?: boolean }
        if (!googleProfile.email || !googleProfile.email_verified) return false
        return ensureOAuthUser(googleProfile.email, user.name, user.image, oauthAccount)
      }

      if (account.provider === 'github') {
        const email = await getPrimaryVerifiedGitHubEmail(account.access_token)
        if (!email) return false
        return ensureOAuthUser(email, user.name, user.image, oauthAccount)
      }

      return false
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
}
