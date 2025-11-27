import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const response = NextResponse.next();

  // Get user ID from cookie (set by client)
  const userId = request.cookies.get("currentUserId")?.value;

  if (userId) {
    response.headers.set("x-user-id", userId);
  }

  return response;
}

export const config = {
  matcher: "/api/:path*",
};
