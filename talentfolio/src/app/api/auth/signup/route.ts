import { createClient } from "@supabase/supabase-js";
import type { AccountType } from "@/lib/accountType";
import { isJobCategory, legacyRoleOf } from "@/lib/jobCategories";

/**
 * 회원가입. account_type 은 app_metadata 라 클라이언트 signUp 으로는 넣을 수 없어
 * 서버에서 서비스 롤로 계정을 만든다. 성공하면 클라이언트가 이어서 signInWithPassword 한다.
 */
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return Response.json({ error: "회원가입 서버가 설정되지 않았습니다." }, { status: 503 });

  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const name = String(body?.name ?? "").trim();
  const title = String(body?.title ?? "").trim();
  const accountType = body?.accountType as AccountType;
  const jobCategory = isJobCategory(body?.jobCategory) ? body.jobCategory : null;
  const role = jobCategory ? legacyRoleOf(jobCategory) : body?.role === "designer" ? "designer" : "developer";

  if (accountType !== "seeker" && accountType !== "company") return Response.json({ error: "계정 유형을 선택해 주세요." }, { status: 400 });
  if (accountType === "seeker" && body?.jobCategory !== undefined && !jobCategory) return Response.json({ error: "직군을 다시 선택해 주세요." }, { status: 400 });
  if (!EMAIL_RE.test(email)) return Response.json({ error: "이메일 형식이 올바르지 않습니다." }, { status: 400 });
  if (password.length < 6) return Response.json({ error: "비밀번호는 6자 이상이어야 합니다." }, { status: 400 });
  if (!name || name.length > 50) return Response.json({ error: "이름을 입력해 주세요." }, { status: 400 });
  if (title.length > 80) return Response.json({ error: "직함·회사명이 너무 깁니다." }, { status: 400 });

  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { account_type: accountType },
    user_metadata: { name, role, title, ...(jobCategory ? { job_category: jobCategory } : {}) },
  });
  if (error) {
    const dup = /already|registered|exists/i.test(error.message);
    return Response.json({ error: dup ? "이미 가입된 이메일입니다." : error.message }, { status: dup ? 409 : 400 });
  }
  return Response.json({ ok: true }, { status: 201 });
}
