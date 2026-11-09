"use client";

/**
 * 화면 데이터 캐시 (stale-while-revalidate). SWR / TanStack Query 와 같은 방식을 의존성 없이 작게 구현했다.
 *
 * - 처음 열 때만 서버를 기다린다. 이후 탭 이동은 캐시를 즉시 그리고, 뒤에서 다시 받아 바뀐 게 있을 때만 다시 그린다
 *   (응답 JSON 문자열이 같으면 setState 를 하지 않는다 = 변동분만 반영).
 * - 같은 key 를 여러 화면이 동시에 요청하면 요청은 한 번만 나간다 (in-flight dedup).
 * - 창으로 돌아올 때(focus)·지정 주기마다 조용히 갱신한다.
 * - sessionStorage 에도 남겨 새로고침 직후에도 바로 그린다. 계정이 바뀌면 scope 로 분리·초기화한다.
 */
import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";

interface Entry { data: unknown; json: string; at: number; error: string | null }

const mem = new Map<string, Entry>();
const inflight = new Map<string, Promise<void>>();
const subs = new Map<string, Set<() => void>>();
let scope = "anon";
const STORE_PREFIX = "tf-cache:";

function storeKey(key: string) {
  return `${STORE_PREFIX}${scope}:${key}`;
}

function readStore(key: string): Entry | undefined {
  try {
    const raw = sessionStorage.getItem(storeKey(key));
    if (!raw) return undefined;
    const { at, json } = JSON.parse(raw) as { at: number; json: string };
    return { data: JSON.parse(json), json, at, error: null };
  } catch {
    return undefined;
  }
}

function writeStore(key: string, e: Entry) {
  try {
    if (e.json.length > 1_500_000) return; // 너무 큰 응답은 메모리에만
    sessionStorage.setItem(storeKey(key), JSON.stringify({ at: e.at, json: e.json }));
  } catch {
    /* 저장 불가(사파리 개인 모드 등) — 메모리 캐시만 쓴다 */
  }
}

function emit(key: string) {
  subs.get(key)?.forEach((f) => f());
}

function entry(key: string): Entry | undefined {
  let e = mem.get(key);
  if (!e && typeof window !== "undefined") {
    e = readStore(key);
    if (e) mem.set(key, e);
  }
  return e;
}

/** 로그인 계정이 바뀌면 이전 계정 데이터가 보이지 않게 비운다 */
export function setCacheScope(next: string | null | undefined, opts: { silent?: boolean } = {}) {
  const s = next || "anon";
  if (s === scope) return;
  scope = s;
  mem.clear();
  if (!opts.silent) notifyScopeChange();
}

/** 계정이 바뀌면 지금 화면에 걸린 데이터를 새 계정으로 다시 받는다 */
export function notifyScopeChange() {
  for (const [key, set] of subs) {
    if (set.size === 0) continue;
    emit(key);
    const f = fetchers.get(key);
    if (f && !mem.has(key)) void fetchInto(key, f);
  }
}

async function fetchInto<T>(key: string, fetcher: () => Promise<T>): Promise<void> {
  const running = inflight.get(key);
  if (running) return running;
  const p = (async () => {
    try {
      const data = await fetcher();
      const json = JSON.stringify(data ?? null);
      const prev = mem.get(key);
      if (prev && prev.json === json && !prev.error) {
        prev.at = Date.now(); // 바뀐 것 없음 → 다시 그리지 않는다
        return;
      }
      const e = { data, json, at: Date.now(), error: null };
      mem.set(key, e);
      writeStore(key, e);
    } catch (err) {
      const prev = mem.get(key);
      const msg = err instanceof Error ? err.message : String(err);
      // 캐시가 있으면 그대로 보여 주고 오류만 기록 (화면을 깨지 않는다)
      mem.set(key, prev ? { ...prev, error: msg } : { data: undefined, json: "", at: Date.now(), error: msg });
    } finally {
      inflight.delete(key);
    }
    emit(key);
  })();
  inflight.set(key, p);
  return p;
}

/** 화면 밖에서 캐시를 갱신 (예: 승인 처리 후 다른 탭 데이터도 새로) */
export function revalidate(key: string, fetcher?: () => Promise<unknown>) {
  const f = fetcher ?? fetchers.get(key);
  if (f) void fetchInto(key, f);
}

/** 응답을 기다리지 않고 캐시를 먼저 고친다 (낙관적 갱신) */
export function mutateCache<T>(key: string, update: (cur: T | undefined) => T) {
  const cur = entry(key)?.data as T | undefined;
  const data = update(cur);
  const e = { data, json: JSON.stringify(data ?? null), at: Date.now(), error: null };
  mem.set(key, e);
  writeStore(key, e);
  emit(key);
}

const fetchers = new Map<string, () => Promise<unknown>>();
const EMPTY = { data: undefined, json: "", at: 0, error: null } as Entry;

export interface Cached<T> {
  data: T | undefined;
  error: string | null;
  /** 캐시도 없이 처음 불러오는 중 — 로딩 화면은 이때만 */
  loading: boolean;
  /** 뒤에서 갱신 중 (캐시는 보이는 상태) */
  refreshing: boolean;
  reload: () => Promise<void>;
}

export function useCached<T>(
  key: string | null,
  fetcher: () => Promise<T>,
  opts: { refreshMs?: number; staleMs?: number } = {},
): Cached<T> {
  const { refreshMs, staleMs = 5_000 } = opts;
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
    // 화면 밖 갱신(revalidate)용으로 이 key 의 fetcher 를 등록
    if (key) fetchers.set(key, () => fetcherRef.current());
  });
  const run = useCallback(() => (key ? fetchInto(key, () => fetcherRef.current()) : Promise.resolve()), [key]);

  const subscribe = useCallback(
    (cb: () => void) => {
      if (!key) return () => undefined;
      const set = subs.get(key) ?? new Set();
      set.add(cb);
      subs.set(key, set);
      return () => set.delete(cb);
    },
    [key],
  );
  const snap = useSyncExternalStore(
    subscribe,
    () => (key ? entry(key) ?? EMPTY : EMPTY),
    () => EMPTY,
  );

  useEffect(() => {
    if (!key) return;
    const e = entry(key);
    // 방금 받은 데이터면 다시 요청하지 않는다 (탭을 빠르게 오갈 때)
    if (!e || e.error || Date.now() - e.at > staleMs) void run();
  }, [key, run, staleMs]);

  useEffect(() => {
    if (!key) return;
    const onFocus = () => {
      if (document.visibilityState === "visible") void run();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    const timer = refreshMs ? setInterval(() => document.visibilityState === "visible" && void run(), refreshMs) : null;
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      if (timer) clearInterval(timer);
    };
  }, [key, run, refreshMs]);

  return {
    data: snap.data as T | undefined,
    error: snap.data === undefined ? snap.error : null,
    loading: !!key && snap.data === undefined && !snap.error,
    refreshing: !!key && inflight.has(key),
    reload: run,
  };
}
