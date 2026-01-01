import { type NextRequest, NextResponse } from "next/server"

export async function proxy(request: NextRequest): Promise<NextResponse> {
  // Just pass through - don't refresh session on every request
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
