import type { User } from "@supabase/supabase-js";

/**
 * 계정 유형. Supabase Auth 의 app_metadata.account_type 에 저장한다.
 * app_metadata 는 서비스 롤로만 쓸 수 있어 사용자가 스스로 바꿀 수 없다 (user_metadata 와 다름).
 */
export type AccountType = "seeker" | "company";

export const ACCOUNT_LABEL: Record<AccountType, string> = { seeker: "구직자", company: "기업" };

export function accountTypeOf(user: User | null | undefined): AccountType | null {
  const v = user?.app_metadata?.account_type;
  return v === "seeker" || v === "company" ? v : null;
}

export function homeOf(type: AccountType): string {
  return type === "company" ? "/desk" : "/studio";
}

const SEEKER_PREFIXES = ["/studio"];
const COMPANY_PREFIXES = ["/desk", "/review", "/sourcing", "/settings", "/discover"];

const under = (path: string, p: string) => path === p || path.startsWith(p + "/");

/** 이 경로에 들어갈 수 있는 계정 유형. null = 공용 화면(랜딩, 로그인, /talent, /brief 등). */
export function zoneOwner(path: string): AccountType | null {
  if (SEEKER_PREFIXES.some((p) => under(path, p))) return "seeker";
  if (COMPANY_PREFIXES.some((p) => under(path, p))) return "company";
  return null;
}
