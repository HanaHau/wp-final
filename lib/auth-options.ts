import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { prisma } from '@/lib/prisma'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'test@example.com' },
      },
      async authorize(credentials) {
        if (!credentials?.email) {
          return null
        }

        // 簡化版本：直接使用 email 作為使用者識別
        // 如果使用者不存在，自動建立
        let user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user) {
          user = await prisma.user.create({
            data: {
              email: credentials.email,
              name: credentials.email.split('@')[0],
            },
          })
        }

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
    async signIn({ user, account }) {
      // For Google OAuth, ensure user exists in database
      if (account?.provider === 'google' && user.email) {
        try {
          // Upsert user - create if doesn't exist, update if exists
          // 允許更新 name 和 image（name 可以更新，只有 userID 不能改）
          await prisma.user.upsert({
            where: { email: user.email },
            update: {
              name: user.name || undefined,
              image: user.image || undefined,
            },
            create: {
              email: user.email,
              name: user.name || user.email.split('@')[0],
              image: user.image || null,
            },
          })
        } catch (error) {
          console.error('Error creating/updating user:', error)
          return false
        }
      }
      return true
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub
      }
      return session
    },
    async jwt({ token, user, account }) {
      if (user) {
        // For Google OAuth, fetch the actual database user ID by email
        if (user.email) {
          const dbUser = await prisma.user.findUnique({
            where: { email: user.email },
            select: { id: true },
          })
          if (dbUser) {
            token.sub = dbUser.id
          } else {
            token.sub = user.id
          }
        } else {
          token.sub = user.id
        }
      }
      if (account) {
        token.accessToken = account.access_token
      }
      return token
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  session: {
    strategy: 'jwt',
  },
}

