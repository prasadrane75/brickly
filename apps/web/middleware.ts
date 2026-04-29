import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const WWW_HOST = "www.bricklyusa.com";
const APP_HOST = "app.bricklyusa.com";

export function middleware(request: NextRequest) {
  const hostHeader = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  const host = hostHeader.toLowerCase().split(":")[0];

  if (host === WWW_HOST) {
    const location = `https://${APP_HOST}${request.nextUrl.pathname}${request.nextUrl.search}`;
    return new NextResponse(null, {
      status: 308,
      headers: {
        Location: location,
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
