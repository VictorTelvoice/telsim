import type { NextAuthConfig } from "next-auth"
import Google from "next-auth/providers/google"

export default {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.role = (user as any).role;
        token.onboardingCompleted = (user as any).onboardingCompleted;
        token.onboardingStep = (user as any).onboardingStep;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        (session.user as any).role = token.role;
        (session.user as any).onboardingCompleted = token.onboardingCompleted;
        (session.user as any).onboardingStep = token.onboardingStep;
      }
      return session;
    },
    authorized({ auth }) {
      return !!auth;
    },
  },
} satisfies NextAuthConfig
