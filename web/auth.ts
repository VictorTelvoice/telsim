import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import Credentials from "next-auth/providers/credentials"
import authConfig from "./auth.config"
import bcrypt from "bcryptjs"

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  ...authConfig,
  providers: [
    ...authConfig.providers,
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) return null;
        
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string }
        });

        if (!user || (!user.password && user.email)) {
             // User exists but has no password (probably signed up with Google)
             return null;
        }

        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.password as string
        );

        if (!passwordMatch) return null;
        
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          onboardingCompleted: user.onboardingCompleted,
          onboardingStep: user.onboardingStep
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger }) {
      // 1. Al loguear (sign in), guardamos los datos iniciales
      if (user) {
        token.role = (user as any).role;
        token.onboardingCompleted = (user as any).onboardingCompleted;
        token.onboardingStep = (user as any).onboardingStep;
      }
      
      // 2. En cada petición, buscamos los datos frescos de la DB para evitar bloqueos del middleware
      // solo si no es el trigger de login inicial (para ahorrar una consulta)
      if (token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { role: true, onboardingCompleted: true, onboardingStep: true }
        });
        
        if (dbUser) {
          token.role = dbUser.role;
          token.onboardingCompleted = dbUser.onboardingCompleted;
          token.onboardingStep = dbUser.onboardingStep;
        }
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
    }
  }
})
