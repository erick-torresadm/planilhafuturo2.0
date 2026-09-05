import { next, rewrite } from "@vercel/functions";

export const config = {
  matcher: ["/", "/assinar"],
};

const CLUB_HOST = "club.planilhafuturo.com.br";

export default function middleware(request: Request) {
  const url = new URL(request.url);
  const host = request.headers.get("host") || "";

  if (host === CLUB_HOST) {
    if (url.pathname === "/") {
      return rewrite(new URL("/club", request.url));
    }
    if (url.pathname === "/assinar") {
      return rewrite(new URL("/club/assinar" + url.search, request.url));
    }
  }

  return next();
}
