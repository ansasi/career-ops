import NextAuth from 'next-auth';
import { authConfig } from './lib/auth/auth.config';

export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth|api/inngest|api/stripe/webhook|.*\\.(?:png|jpg|jpeg|svg|woff2?)).*)'],
};
