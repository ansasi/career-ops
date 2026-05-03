import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';

export const authConfig = {
  pages: {
    signIn: '/auth/sign-in',
    newUser: '/billing/checkout',
  },
  session: { strategy: 'jwt' },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async () => {
        // Real authorize logic lives in `auth.ts` so the edge config stays slim.
        return null;
      },
    }),
  ],
  callbacks: {
    authorized: ({ request, auth }) => {
      const url = request.nextUrl;
      const isAuthed = !!auth?.user;
      const PUBLIC = ['/', '/auth', '/api/auth', '/api/stripe/webhook', '/api/inngest'];
      if (PUBLIC.some((p) => url.pathname === p || url.pathname.startsWith(p + '/'))) return true;
      return isAuthed;
    },
    jwt: async ({ token, user, trigger, session }) => {
      if (user) {
        token.id = user.id;
        token.subscriptionStatus = (user as { subscriptionStatus?: string }).subscriptionStatus;
      }
      if (trigger === 'update' && session?.subscriptionStatus) {
        token.subscriptionStatus = session.subscriptionStatus;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user && token.id) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { subscriptionStatus?: string }).subscriptionStatus = token.subscriptionStatus as string | undefined;
      }
      return session;
    },
  },
  trustHost: true,
} satisfies NextAuthConfig;

export const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
