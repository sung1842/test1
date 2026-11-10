import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

/**
 * 포트폴리오 작업물 (디자이너·개발자 공통). 기업 화면(공개 포트폴리오)에도 보여야 해서 공개 버킷 works 에 올린다.
 * 목록은 같은 버킷의 <uid>/works.json 에 둔다 (스키마 변경 없이 동작). 쓰기는 서비스 롤, 본인 확인은 세션 쿠키로.
 * GET ?uid= 는 누구나 (공개 포트폴리오용), POST·PATCH·DELETE 는 본인만.
 */
const BUCKET = "works";
const MAX_BYTES = 8 * 1024 * 1024;
const MAX_WORKS = 30;
const TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface PortfolioWork {
  id: string;
  title: string;
  description: string;
  role: string;
  tools: string[];
  year: string;
  url: string;
  images: string[];
  created_at: string;
}

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !service) return null;
  return createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
}
type Admin = NonNullable<ReturnType<typeof admin>>;

async function sessionUser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anon) return null;
  const jar = await cookies();
  const c = createServerClient(url, anon, { cookies: { getAll: () => jar.getAll(), setAll: () => {} } });
  const { data } = await c.auth.getUser();
  return data.user ?? null;
}

async function ensureBucket(a: Admin) {
  const { data } = await a.storage.getBucket(BUCKET);
  if (!data) {
    await a.storage.createBucket(BUCKET, {
      public: true, fileSizeLimit: MAX_BYTES, allowedMimeTypes: [...Object.keys(TYPES), "application/json"],
    });
  }
}

async function readWorks(a: Admin, uid: string): Promise<PortfolioWork[]> {
  // 방금 쓴 목록을 바로 읽어야 해서 캐시를 피한다 (download 는 짧게 캐시된 이전 본을 줄 때가 있다)
  const base = a.storage.from(BUCKET).getPublicUrl(`${uid}/works.json`).data.publicUrl;
  const res = await fetch(`${base}?t=${Date.now()}`, { cache: "no-store" }).catch(() => null);
  if (!res?.ok) return [];
  try {
    const list = JSON.parse(await res.text());
    return Array.isArray(list) ? (list as PortfolioWork[]) : [];
  } catch {
    return [];
  }
}

async function writeWorks(a: Admin, uid: string, list: PortfolioWork[]) {
  const body = new Blob([JSON.stringify(list)], { type: "application/json" });
  const { error } = await a.storage.from(BUCKET).upload(`${uid}/works.json`, body, { contentType: "application/json", upsert: true, cacheControl: "0" });
  if (error) throw new Error(error.message);
}

const pathOf = (publicUrl: string) => {
  const m = publicUrl.match(new RegExp(`/storage/v1/object/public/${BUCKET}/(.+)$`));
  return m ? decodeURIComponent(m[1]) : null;
};

const text = (v: FormDataEntryValue | null, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const tools = (v: FormDataEntryValue | null) =>
  text(v, 400).split(",").map((t) => t.trim()).filter(Boolean).slice(0, 12);
const safeUrl = (v: string) => (/^https?:\/\//i.test(v) ? v : "");

export async function GET(req: Request) {
  const a = admin();
  if (!a) return Response.json({ works: [] });
  const uid = new URL(req.url).searchParams.get("uid") ?? (await sessionUser())?.id ?? "";
  if (!UUID.test(uid)) return Response.json({ works: [] });
  return Response.json({ works: await readWorks(a, uid) }, { headers: { "Cache-Control": "no-store" } });
}

/** 새 작업물: multipart (title, description, role, tools(쉼표), year, url, files[]) */
export async function POST(req: Request) {
  const a = admin();
  if (!a) return Response.json({ error: "작업물 저장소가 설정되지 않았습니다." }, { status: 503 });
  const user = await sessionUser();
  if (!user) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const form = await req.formData().catch(() => null);
  if (!form) return Response.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });

  const title = text(form.get("title"), 120);
  if (!title) return Response.json({ error: "작업물 제목을 입력해 주세요." }, { status: 400 });
  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0).slice(0, 6);
  if (!files.length) return Response.json({ error: "이미지를 한 장 이상 올려 주세요." }, { status: 400 });
  for (const f of files) {
    if (!TYPES[f.type]) return Response.json({ error: "PNG·JPG·WEBP·GIF 이미지만 올릴 수 있어요" }, { status: 400 });
    if (f.size > MAX_BYTES) return Response.json({ error: "이미지는 한 장에 8MB 이하만 올릴 수 있어요" }, { status: 400 });
  }

  await ensureBucket(a);
  const list = await readWorks(a, user.id);
  if (list.length >= MAX_WORKS) return Response.json({ error: `작업물은 ${MAX_WORKS}개까지 올릴 수 있어요` }, { status: 400 });

  const id = crypto.randomUUID();
  const uploaded: string[] = [];
  for (const [i, f] of files.entries()) {
    const path = `${user.id}/${id}/${i + 1}-${Date.now()}.${TYPES[f.type]}`;
    const { error } = await a.storage.from(BUCKET).upload(path, f, { contentType: f.type });
    if (error) {
      if (uploaded.length) await a.storage.from(BUCKET).remove(uploaded);
      return Response.json({ error: "이미지를 올리지 못했어요" }, { status: 500 });
    }
    uploaded.push(path);
  }
  const work: PortfolioWork = {
    id, title,
    description: text(form.get("description"), 2000),
    role: text(form.get("role"), 120),
    tools: tools(form.get("tools")),
    year: text(form.get("year"), 20),
    url: safeUrl(text(form.get("url"), 500)),
    images: uploaded.map((p) => a.storage.from(BUCKET).getPublicUrl(p).data.publicUrl),
    created_at: new Date().toISOString(),
  };
  try {
    await writeWorks(a, user.id, [work, ...list]);
  } catch {
    await a.storage.from(BUCKET).remove(uploaded);
    return Response.json({ error: "작업물을 저장하지 못했어요" }, { status: 500 });
  }
  return Response.json({ work }, { status: 201 });
}

/** 순서 바꾸기: { order: id[] } */
export async function PATCH(req: Request) {
  const a = admin();
  const user = await sessionUser();
  if (!a || !user) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { order?: unknown };
  if (!Array.isArray(body.order)) return Response.json({ error: "순서가 없습니다." }, { status: 400 });
  const list = await readWorks(a, user.id);
  const rank = new Map((body.order as unknown[]).map((v, i) => [String(v), i]));
  list.sort((x, y) => (rank.get(x.id) ?? 999) - (rank.get(y.id) ?? 999));
  await writeWorks(a, user.id, list);
  return Response.json({ works: list });
}

export async function DELETE(req: Request) {
  const a = admin();
  const user = await sessionUser();
  if (!a || !user) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const list = await readWorks(a, user.id);
  const target = list.find((w) => w.id === id);
  if (!target) return Response.json({ error: "작업물을 찾을 수 없습니다." }, { status: 404 });
  await writeWorks(a, user.id, list.filter((w) => w.id !== id));
  const paths = target.images.map(pathOf).filter((p): p is string => !!p && p.startsWith(`${user.id}/`));
  if (paths.length) await a.storage.from(BUCKET).remove(paths);
  return new Response(null, { status: 204 });
}
