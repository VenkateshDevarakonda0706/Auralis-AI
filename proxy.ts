import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

const protectedPrefixes = ["/chat", "/dashboard", "/settings", "/profile"]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isProtectedPage = protectedPrefixes.some((prefix) => pathname.startsWith(prefix))
  const isPreferencesApi = pathname.startsWith("/api/preferences")
  const isProfileApi = pathname.startsWith("/api/profile")

  if (!isProtectedPage && !isPreferencesApi && !isProfileApi) {
    return NextResponse.next()
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  if (token) {
    return NextResponse.next()
  }

  if (isPreferencesApi || isProfileApi) {
    return NextResponse.json(
      { success: false, error: "Unauthorized", message: "Please sign in to continue" },
      { status: 401 },
    )
  }

  const loginUrl = new URL("/login", request.url)
  loginUrl.searchParams.set("callbackUrl", pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: [
    "/chat/:path*",
    "/dashboard/:path*",
    "/settings/:path*",
    "/profile",
    "/profile/:path*",
    "/api/preferences/:path*",
    "/api/profile",
    "/api/profile/:path*",
  ],
}
