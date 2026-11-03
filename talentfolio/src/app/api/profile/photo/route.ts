import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

/**
 * 프로필 사진 (23 문서 G8). 기업 화면(인재풀·Brief)에도 보이도록 공개 버킷 avatars 에 올리고
 * profiles.avatar_url 에 공개 주소를 넣는다. 버킷 쓰기는 서비스 롤, profiles 갱신은 본인 세션(RLS)으로.
 */
const BUCKET = "avatars";
const MAX_BYTES = 5 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

async function clients() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !anon || !service) return null;
  const jar = await cookies();
  const user = createServerClient(url, anon, { cookies: { getAll: () => jar.getAll(), setAll: () => {} } });
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  return { user, admin };
}

/** 이 버킷의 공개 주소에서 저장 경로를 꺼낸다 (지난 사진 지우기용) */
function pathOf(publicUrl: string | null | undefined) {
  const m = publicUrl?.match(new RegExp(`/storage/v1/object/public/${BUCKET}/(.+)$`));
  return m ? decodeURIComponent(m[1]) : null;
}

async function ensureBucket(admin: NonNullable<Awaited<ReturnType<typeof clients>>>["admin"]) {
  const { data } = await admin.storage.getBucket(BUCKET);
  if (!data) await admin.storage.createBucket(BUCKET, { public: true, fileSizeLimit: MAX_BYTES, allowedMimeTypes: Object.keys(TYPES) });
}

async function currentAvatar(c: NonNullable<Awaited<ReturnType<typeof clients>>>, uid: string) {
  const { data } = await c.user.from("profiles").select("avatar_url").eq("id", uid).maybeSingle();
  return (data?.avatar_url as string | null) ?? null;
}

export async function POST(req: Request) {
  const c = await clients();
  if (!c) return Response.json({ error: "사진 저장소가 설정되지 않았습니다." }, { status: 503 });
  const { data: { user } } = await c.user.auth.getUser();
  if (!user) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const file = (await req.formData().catch(() => null))?.get("file");
  if (!(file instanceof File)) return Response.json({ error: "사진 파일이 없습니다." }, { status: 400 });
  const ext = TYPES[file.type];
  if (!ext) return Response.json({ error: "PNG·JPG·WEBP 사진만 올릴 수 있어요" }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: "5MB 이하 사진만 올릴 수 있어요" }, { status: 400 });

  await ensureBucket(c.admin);
  const path = `${user.id}/photo-${Date.now()}.${ext}`;
  const { error } = await c.admin.storage.from(BUCKET).upload(path, file, { contentType: file.type });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const url = c.admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

  const old = pathOf(await currentAvatar(c, user.id));
  const { error: e2 } = await c.user.from("profiles").update({ avatar_url: url }).eq("id", user.id);
  if (e2) {
    await c.admin.storage.from(BUCKET).remove([path]);
    return Response.json({ error: e2.message }, { status: 500 });
  }
  if (old?.startsWith(`${user.id}/`)) await c.admin.storage.from(BUCKET).remove([old]);
  return Response.json({ url });
}

export async function DELETE() {
  const c = await clients();
  if (!c) return Response.json({ error: "사진 저장소가 설정되지 않았습니다." }, { status: 503 });
  const { data: { user } } = await c.user.auth.getUser();
  if (!user) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const old = pathOf(await currentAvatar(c, user.id));
  await c.user.from("profiles").update({ avatar_url: null }).eq("id", user.id);
  if (old?.startsWith(`${user.id}/`)) await c.admin.storage.from(BUCKET).remove([old]);
  return new Response(null, { status: 204 });
}
