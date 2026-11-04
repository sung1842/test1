import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

/**
 * 회원 탈퇴 (앱스토어 계정 삭제 요구). 본인 세션으로만 부를 수 있다.
 *   1) 본인 세션으로 fit.delete_my_account() — FK 없는 후보·기업 기록 삭제 (SQL 034)
 *   2) 저장소의 본인 폴더(avatars·evidence) 삭제
 *   3) 서비스 롤로 auth 사용자 삭제 — FK cascade 표가 함께 지워진다
 * body { confirm: "탈퇴" } 가 있어야 한다 (실수 방지).
 */
const BUCKETS = ["avatars", "evidence"];
const adminClient = (url: string, key: string) => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
type AdminClient = ReturnType<typeof adminClient>;

/** 폴더 안 파일 경로 전부 (하위 폴더 포함). 폴더 항목은 id 가 없다 */
async function listFiles(admin: AdminClient, bucket: string, dir: string, depth = 0): Promise<string[]> {
  const { data } = await admin.storage.from(bucket).list(dir, { limit: 1000 });
  const out: string[] = [];
  for (const f of data ?? []) {
    const p = `${dir}/${f.name}`;
    if (f.id) out.push(p);
    else if (depth < 5) out.push(...(await listFiles(admin, bucket, p, depth + 1)));
  }
  return out;
}

export async function DELETE(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !anon || !service) return Response.json({ error: "탈퇴 기능이 설정되지 않았습니다." }, { status: 503 });

  const body = (await req.json().catch(() => null)) as { confirm?: string } | null;
  if (body?.confirm !== "탈퇴") return Response.json({ error: "확인 문구가 맞지 않습니다." }, { status: 400 });

  const jar = await cookies();
  const user = createServerClient(url, anon, { cookies: { getAll: () => jar.getAll(), setAll: () => {} } });
  const { data: { user: me } } = await user.auth.getUser();
  if (!me) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const admin = adminClient(url, service);

  const wiped = await user.schema("fit").rpc("delete_my_account");
  if (wiped.error) {
    // SQL 034 미적용이면 cascade 표만 지워진다 — 탈퇴 자체는 막지 않고 서버 로그로 남긴다
    console.warn(`[account] delete_my_account 실패 (SQL 034 확인): ${wiped.error.message}`);
  }

  for (const bucket of BUCKETS) {
    const paths = await listFiles(admin, bucket, me.id);
    for (let i = 0; i < paths.length; i += 100) await admin.storage.from(bucket).remove(paths.slice(i, i + 100));
  }

  const { error } = await admin.auth.admin.deleteUser(me.id);
  if (error) return Response.json({ error: `계정을 지우지 못했습니다: ${error.message}` }, { status: 500 });
  return new Response(null, { status: 204 });
}
