import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Buat middleware dengan withAuth untuk route yang memerlukan autentikasi
const authMiddleware = withAuth(
  function middleware(req) {
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname
        
        // Hanya izinkan akses ke /dashboard jika user sudah login
        if (pathname.startsWith("/dashboard")) {
          return !!token
        }
        
        // Route lain bisa diakses (akan di-handle oleh komponen masing-masing)
        return true
      },
    },
    pages: {
      signIn: "/login",
    },
  }
)

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname

  // Route auth (login, register, forgot-password, reset-password) bisa diakses tanpa autentikasi
  // Return langsung tanpa memproses dengan withAuth
  // CRITICAL: Reset-password harus di-exclude dari NextAuth untuk menghindari redirect ke login
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password")
  ) {
    // Tambahkan header untuk mencegah caching di production
    const response = NextResponse.next()
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    return response
  }

  // Route detail magang bisa diakses tanpa autentikasi (public)
  if (pathname.startsWith("/magang/detail/")) {
    return NextResponse.next()
  }

  // Untuk route lain, gunakan authMiddleware
  return authMiddleware(req)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}







