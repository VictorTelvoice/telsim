import NextAuth from "next-auth"
import authConfig from "./auth.config"
import { NextResponse } from "next/server"

const { auth } = NextAuth(authConfig)

const publicRoutes = ["/"]
const authRoutes = ["/login", "/register"]

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth
  
  // Explicitly ignore API auth routes to prevent middleware interception
  if (nextUrl.pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const user = req.auth?.user as any
  const userRole = user?.role as string | undefined
  const isOnboardingCompleted = user?.onboardingCompleted

  const isPublicRoute = publicRoutes.includes(nextUrl.pathname)
  const isAuthRoute = authRoutes.includes(nextUrl.pathname)
  const isAdminRoute = nextUrl.pathname.startsWith("/admin")
  const isAppRoute = nextUrl.pathname.startsWith("/app") || nextUrl.pathname.startsWith("/dashboard")

  // 1. Auth routes (Login/Register) - Redirect logged-in users away
  if (isAuthRoute) {
    if (isLoggedIn) {
      if (userRole === "ADMIN") return NextResponse.redirect(new URL("/admin", nextUrl))
      return NextResponse.redirect(new URL("/dashboard", nextUrl))
    }
    return NextResponse.next()
  }

  // 2. Not logged in - Allow landing page and auth routes, everything else to login
  if (!isLoggedIn) {
    if (isPublicRoute || isAuthRoute) return NextResponse.next()
    return NextResponse.redirect(new URL("/login", nextUrl))
  }

  // 3. Logged in - Access control
  if (isLoggedIn) {
    // Landing page ("/") is ALWAYS accessible to everyone even if logged in
    if (nextUrl.pathname === "/") return NextResponse.next()

    // Dashboard central route - Decision based on role and onboarding
    if (nextUrl.pathname === "/dashboard") {
       if (userRole === "ADMIN") return NextResponse.redirect(new URL("/admin", nextUrl))
       if (!isOnboardingCompleted) return NextResponse.redirect(new URL("/onboarding/plan", nextUrl))
       return NextResponse.redirect(new URL("/app/dashboard", nextUrl))
    }

    // Protect Admin route from non-admins
    if (isAdminRoute && userRole !== "ADMIN") {
      return NextResponse.redirect(new URL("/app/dashboard", nextUrl))
    }
    
    // Redirect Admin users away from App user routes
    if (isAppRoute && userRole === "ADMIN") {
      return NextResponse.redirect(new URL("/admin", nextUrl))
    }

    // Force onboarding ONLY when accessing App routes, otherwise allowed (e.g. landing)
    if (isAppRoute && userRole !== "ADMIN" && !isOnboardingCompleted) {
      if (!nextUrl.pathname.startsWith("/onboarding")) {
        return NextResponse.redirect(new URL("/onboarding/plan", nextUrl))
      }
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
