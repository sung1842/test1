import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { accountTypeOf, homeOf, zoneOwner } from "@/lib/accountType";

/**
 * 서버 접근 제어. 세션은 쿠키(@supabase/ssr)에 있다.
 * - 비로그인: 메인(/)과 로그인·회원가입, Slack unfurl 용 /brief/* 만 열린다. 나머지 페이지는 /login 으로, API 는 401.
 * - 로그인: 구직자는 /studio 계열, 기업은 /desk 계열만 (lib/accountType.ts zoneOwner).
 * 이 함수가 만료된 토큰 갱신(쿠키 재발급)도 맡는다.
 */
const PUBLIC_PAGES = ["/", "/login", "/signup", "/terms", "/privacy", "/location-terms", "/youth-policy", "/support", "/account-deletion"];
const PUBLIC_API = ["/api/auth/signup"];
// Slack 봇은 쿠키가 없다. Brief 는 공개용 요약만 보여 주는 화면이라 연다 (23 문서 G5).
const PUBLIC_PREFIXES = ["/brief/"];

export async function proxy(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const path = req.nextUrl.pathname;
  const isApi = path.startsWith("/api/");
  const isPublic = isApi ? PUBLIC_API.includes(path) : PUBLIC_PAGES.includes(path) || PUBLIC_PREFIXES.some((p) => path.startsWith(p));

  let res = NextResponse.next({ request: req });
  if (!url || !key) return isPublic ? res : deny(req, isApi, "/");

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list: { name: string; value: string; options: CookieOptions }[]) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  // getUser 는 Auth 서버에 토큰을 검증받는다 (쿠키 위조 방지).
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return isPublic ? res : deny(req, isApi, "/login", path);

  const type = accountTypeOf(user);
  const owner = zoneOwner(path);
  if (owner && owner !== type) {
    return redirect(req, res, type ? homeOf(type) : "/login?unclassified=1");
  }
  // 로그인한 사용자가 로그인·가입 화면에 오면 자기 홈으로.
  if (type && (path === "/login" || path === "/signup")) return redirect(req, res, homeOf(type));
  return res;
}

function deny(req: NextRequest, isApi: boolean, to: string, next?: string) {
  if (isApi) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const dest = new URL(to, req.url);
  if (next && next !== "/") dest.searchParams.set("next", next + req.nextUrl.search);
  return NextResponse.redirect(dest);
}

// 갱신된 세션 쿠키를 리다이렉트 응답에도 실어 보낸다.
function redirect(req: NextRequest, res: NextResponse, to: string) {
  const r = NextResponse.redirect(new URL(to, req.url));
  res.cookies.getAll().forEach((c) => r.cookies.set(c));
  return r;
}

export const config = {
  // 정적 파일·이미지·폰트는 건너뛴다.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|fonts/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|ttf|woff2?|css|js|map|txt)$).*)"],
};
