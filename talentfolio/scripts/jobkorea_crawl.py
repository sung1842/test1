"""JobKorea first-run crawler: scroll + paginate, then extract 10 postings."""

from __future__ import annotations

import asyncio
import json
import os
import re
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

from dotenv import load_dotenv

from crawl4ai import AsyncWebCrawler, BrowserConfig, CacheMode, CrawlerRunConfig

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env.local")

SEARCH_URL = (
    "https://www.jobkorea.co.kr/Search/"
    "?stext=%EA%B0%9C%EB%B0%9C%EC%9E%90&tabType=recruit"
)
TARGET_COUNT = 10
MAX_LIST_PAGES = 5
PAGE_PAUSE_SEC = 1.5
DETAIL_PAUSE_SEC = 1.2
GI_RE = re.compile(r"/Recruit/GI_Read/(\d+)", re.I)
OUTPUT_PATH = Path(__file__).resolve().parent / "output" / "jobkorea_jobs.json"
SUMMARY_MODELS = (
    "gemini-flash-lite-latest",
    "gemini-2.5-flash-lite",
)
INLINE_STOP = (
    "급여",
    "스킬",
    "접수기간",
    "남은기간",
    "이 기업",
    "직무 인터뷰",
    "합격자소서",
    "관련 태그",
    "지도보기",
    "인근지하철",
)

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/129.0.0.0 Safari/537.36"
)

FIELD_LABELS = {
    "employment_type": ("고용형태",),
    "salary": ("급여",),
    "work_hours": ("근무시간",),
    "work_address": ("근무지주소", "근무지 주소"),
    "career": ("경력",),
    "education": ("학력",),
    "required_skills": ("스킬", "필수조건", "필수 조건"),
    "preferred": ("우대조건", "우대 조건", "기본우대"),
}
STOP_LABELS = (
    "모집분야",
    "모집인원",
    "고용형태",
    "직급/직책",
    "급여",
    "근무시간",
    "근무지주소",
    "근무지 주소",
    "근무지역",
    "인근지하철",
    "지원자격",
    "경력",
    "학력",
    "스킬",
    "핵심역량",
    "우대조건",
    "우대 조건",
    "기본우대",
    "접수기간",
    "시작일",
    "마감일",
    "접수방법",
    "지원양식",
    "기업정보",
    "복리후생",
    "관련 태그",
    "추천공고",
    "이 기업과 나의 적합도",
)
NOISE = (
    "회원가입",
    "기업 서비스",
    "JOB 찾기",
    "합격축하금",
    "공채정보",
    "즉시 지원",
    "홈페이지 지원",
    "스크랩",
    "로그인",
    "잡코리아",
    "Skip to",
)


def require_gemini_key() -> str:
    key = (os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or "").strip()
    if not key:
        raise SystemExit("GEMINI_API_KEY 가 talentfolio/.env.local 에 없다.")
    os.environ["GEMINI_API_KEY"] = key
    os.environ["GOOGLE_API_KEY"] = key
    return key


def search_url_for_page(page: int) -> str:
    parsed = urlparse(SEARCH_URL)
    query = parse_qs(parsed.query)
    query["Page_No"] = [str(page)]
    return urlunparse(parsed._replace(query=urlencode(query, doseq=True)))


def extract_job_ids(*blobs: str | None) -> list[str]:
    ids: list[str] = []
    seen: set[str] = set()
    for blob in blobs:
        if not blob:
            continue
        for match in GI_RE.finditer(blob):
            job_id = match.group(1)
            if job_id not in seen:
                seen.add(job_id)
                ids.append(job_id)
    return ids


def links_blob(result) -> str:
    parts: list[str] = []
    links = getattr(result, "links", None) or {}
    for bucket in ("internal", "external"):
        for item in links.get(bucket, []) or []:
            if isinstance(item, dict):
                parts.append(str(item.get("href") or ""))
            else:
                parts.append(str(item))
    return "\n".join(parts)


def detail_url(job_id: str) -> str:
    return f"https://www.jobkorea.co.kr/Recruit/GI_Read/{job_id}?Oem_Code=C1"


def page_text(result) -> str:
    markdown = str(getattr(result, "markdown", "") or "")
    html = str(getattr(result, "cleaned_html", "") or getattr(result, "html", "") or "")
    html_text = re.sub(r"<script[\s\S]*?</script>", " ", html, flags=re.I)
    html_text = re.sub(r"<style[\s\S]*?</style>", " ", html_text, flags=re.I)
    html_text = re.sub(r"<[^>]+>", "\n", html_text)
    html_text = re.sub(r"&nbsp;", " ", html_text)
    html_text = re.sub(r"&amp;", "&", html_text)
    merged = f"{markdown}\n{html_text}"
    lines = [re.sub(r"\s+", " ", line).strip() for line in merged.splitlines()]
    return "\n".join(line for line in lines if line)


def company_title_from_meta(result, text: str) -> tuple[str, str]:
    meta = getattr(result, "metadata", None) or {}
    raw_title = str(meta.get("title") or "")
    raw_title = raw_title.replace("| 잡코리아", "").replace("|잡코리아", "").strip()
    if " 채용 - " in raw_title:
        company, title = raw_title.split(" 채용 - ", 1)
        return clean_value(company), clean_value(title)
    if " - " in raw_title:
        left, right = raw_title.split(" - ", 1)
        if "채용" in left:
            return clean_value(left.replace("채용", "")), clean_value(right)
    headings = re.findall(r"^#{1,3}\s+(.+)$", str(result.markdown or ""), flags=re.M)
    company = clean_value(headings[0]) if headings else "미기재"
    title = clean_value(headings[1]) if len(headings) > 1 else "미기재"
    if title == "미기재":
        for line in text.splitlines()[:40]:
            if 8 <= len(line) <= 80 and not any(noise in line for noise in NOISE):
                title = line
                break
    return company or "미기재", title or "미기재"


def clean_value(value: str) -> str:
    value = re.sub(r"!\[[^\]]*\]\([^)]+\)", " ", value or "")
    value = re.sub(r"\[[^\]]*\]\([^)]+\)", " ", value)
    value = re.sub(r"https?://\S+", " ", value)
    value = re.sub(r"[*`>]+", " ", value)
    value = re.sub(r"^기본우대", "", value)
    for stop in INLINE_STOP:
        if stop in value:
            value = value.split(stop, 1)[0]
    value = re.sub(r"\s+", " ", value).strip(" :-|.,")
    if not value or value in {"더보기", "지도보기", "문의"}:
        return "미기재"
    return value


def value_after_label(text: str, labels: tuple[str, ...]) -> str:
    lines = text.splitlines()
    collected: list[str] = []
    capturing = False
    for line in lines:
        if not capturing and line in labels:
            capturing = True
            continue
        if capturing:
            if line in STOP_LABELS and line not in labels:
                break
            if any(noise in line for noise in ("지도보기", "이 기업과", "로그인", "취업 전략")):
                break
            cut = line
            for stop in INLINE_STOP:
                if stop in cut and cut not in labels:
                    cut = cut.split(stop, 1)[0].strip()
                    collected.append(cut)
                    return clean_value(" ".join(x for x in collected if x))
            collected.append(cut)
            if len(" ".join(collected)) > 220:
                break
    return clean_value(" ".join(collected))


def extract_body_block(text: str) -> str:
    start = -1
    for marker in ("모집요강", "상세요강", "담당업무", "주요업무", "자격요건"):
        start = text.find(marker)
        if start >= 0:
            break
    end = len(text)
    for marker in ("접수기간", "지원자 현황", "기업 정보", "관련 태그", "추천공고"):
        pos = text.find(marker, start + 1 if start >= 0 else 0)
        if pos > 0:
            end = min(end, pos)
    block = text[start if start >= 0 else 0 : end]
    keep: list[str] = []
    for line in block.splitlines():
        if any(noise in line for noise in NOISE):
            continue
        if len(line) < 2:
            continue
        keep.append(line)
    return "\n".join(keep)[:4000]


SUMMARY_SCHEMA = {
    "type": "object",
    "properties": {
        "role_summary": {"type": "string", "description": "직무를 한 문장으로"},
        "key_duties": {
            "type": "array",
            "items": {"type": "string"},
            "description": "주요 업무 핵심 3~5개",
        },
        "must_have": {
            "type": "array",
            "items": {"type": "string"},
            "description": "필수 자격요건 핵심",
        },
        "nice_to_have": {
            "type": "array",
            "items": {"type": "string"},
            "description": "우대사항 핵심",
        },
        "skills": {
            "type": "array",
            "items": {"type": "string"},
            "description": "본문에 명시된 기술·도구·역량만. 필수/우대 구분 없이",
        },
        "compressed_text": {
            "type": "string",
            "description": "위 내용을 합친 300자 이내 한국어 압축문",
        },
    },
    "required": [
        "role_summary",
        "key_duties",
        "must_have",
        "nice_to_have",
        "skills",
        "compressed_text",
    ],
}


def split_items(value: str | None) -> list[str]:
    if not value or value == "미기재":
        return []
    parts = re.split(r"\s*[,/·;]\s*|\s+및\s+", value)
    out: list[str] = []
    seen: set[str] = set()
    for part in parts:
        item = clean_value(part)
        key = item.lower()
        if item != "미기재" and key not in seen:
            seen.add(key)
            out.append(item)
    return out


def merge_skills(*groups: list[str]) -> list[str]:
    merged: list[str] = []
    seen: set[str] = set()
    for group in groups:
        for item in group:
            token = item.strip()
            key = token.lower()
            if token and key not in seen:
                seen.add(key)
                merged.append(token)
    return merged[:20]


def fallback_summary(parsed: dict, block: str) -> dict:
    skills = split_items(parsed.get("required_skills"))
    must = [item for item in (parsed.get("career"), parsed.get("education")) if item and item != "미기재"]
    must.extend(skills)
    duties = [line for line in block.splitlines() if 8 <= len(line) <= 80][:5]
    compact = " ".join(line.strip() for line in block.splitlines() if len(line.strip()) >= 8)
    return {
        "role_summary": clean_value(f"{parsed.get('company', '')} {parsed.get('title', '')}"),
        "key_duties": duties,
        "must_have": must,
        "nice_to_have": split_items(parsed.get("preferred")),
        "skills": skills,
        "compressed_text": clean_value(compact[:300]),
    }


def normalize_summary(raw: dict, extra_skills: list[str]) -> dict:
    def as_list(value) -> list[str]:
        if isinstance(value, list):
            return [clean_value(str(item)) for item in value if clean_value(str(item)) != "미기재"]
        if isinstance(value, str) and value.strip() and value != "미기재":
            return split_items(value)
        return []

    text = clean_value(str(raw.get("compressed_text") or ""))
    if text == "미기재":
        text = ""
    return {
        "role_summary": clean_value(str(raw.get("role_summary") or "")),
        "key_duties": as_list(raw.get("key_duties")),
        "must_have": as_list(raw.get("must_have")),
        "nice_to_have": as_list(raw.get("nice_to_have")),
        "skills": merge_skills(as_list(raw.get("skills")), extra_skills),
        "compressed_text": text[:400],
    }


def summarize_body(block: str, parsed: dict, api_token: str) -> tuple[dict, str]:
    backup = fallback_summary(parsed, block)
    extra_skills = split_items(parsed.get("required_skills"))
    if not block.strip():
        return backup, "extractive"
    prompt = "\n".join(
        [
            "채용공고 본문을 '주요 내용 중심'으로 압축하라.",
            "규칙: 본문에 없는 내용은 추정·추가하지 말 것. 해당 항목이 본문에 없으면 빈 배열/빈 문자열. 기술 이름은 본문에 적힌 것만.",
            "복리후생·회사 소개·지원 절차는 직무 파악에 필요한 만큼만 반영한다.",
            "",
            f"제목: {parsed.get('title') or ''}",
            f"회사: {parsed.get('company') or ''}",
            "",
            "[본문]",
            block[:6000],
        ]
    )
    payload = json.dumps(
        {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.1,
                "maxOutputTokens": 1400,
                "responseMimeType": "application/json",
                "responseSchema": SUMMARY_SCHEMA,
            },
        }
    ).encode("utf-8")
    for model in SUMMARY_MODELS:
        req = urllib.request.Request(
            f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
            data=payload,
            headers={"Content-Type": "application/json", "x-goog-api-key": api_token},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=45) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            text = (
                data.get("candidates", [{}])[0]
                .get("content", {})
                .get("parts", [{}])[0]
                .get("text", "")
            )
            raw = json.loads(text)
            summary = normalize_summary(raw, extra_skills)
            if summary["role_summary"] != "미기재" or summary["skills"] or summary["key_duties"]:
                return summary, model
        except Exception as exc:
            print(f"[summary] {model} fail: {exc}", flush=True)
            continue
    return backup, "extractive"


def parse_job(result) -> dict:
    text = page_text(result)
    company, title = company_title_from_meta(result, text)
    fields = {
        key: value_after_label(text, labels) for key, labels in FIELD_LABELS.items()
    }
    if fields["work_address"] == "미기재":
        fields["work_address"] = value_after_label(text, ("근무지역", "위치"))
    body = extract_body_block(text)
    return {
        "company": company,
        "title": title,
        **fields,
        "_body_block": body,
        "_text_chars": len(text),
    }


def browser_config() -> BrowserConfig:
    return BrowserConfig(
        headless=True,
        verbose=True,
        user_agent=USER_AGENT,
        extra_args=["--disable-blink-features=AutomationControlled"],
    )


def list_config() -> CrawlerRunConfig:
    return CrawlerRunConfig(
        cache_mode=CacheMode.BYPASS,
        wait_until="networkidle",
        page_timeout=90_000,
        delay_before_return_html=2.5,
        scan_full_page=True,
        scroll_delay=0.45,
        max_scroll_steps=10,
        remove_overlay_elements=True,
        verbose=True,
    )


def detail_config() -> CrawlerRunConfig:
    return CrawlerRunConfig(
        cache_mode=CacheMode.BYPASS,
        wait_until="domcontentloaded",
        page_timeout=90_000,
        delay_before_return_html=2.5,
        scan_full_page=True,
        scroll_delay=0.35,
        max_scroll_steps=8,
        process_iframes=True,
        remove_overlay_elements=True,
        verbose=True,
    )


async def collect_job_ids(crawler: AsyncWebCrawler) -> tuple[list[str], list[dict]]:
    collected: list[str] = []
    seen: set[str] = set()
    pages: list[dict] = []

    for page in range(1, MAX_LIST_PAGES + 1):
        url = search_url_for_page(page)
        print(f"[list] page={page} url={url}", flush=True)
        result = await crawler.arun(url=url, config=list_config())
        if not result.success:
            print(f"[list] fail page={page}: {result.error_message}", flush=True)
            pages.append({"page": page, "url": url, "ok": False, "found": 0})
            if collected:
                break
            continue

        found = extract_job_ids(
            result.html,
            getattr(result, "cleaned_html", None),
            str(result.markdown or ""),
            links_blob(result),
        )
        new_ids = [job_id for job_id in found if job_id not in seen]
        for job_id in new_ids:
            seen.add(job_id)
            collected.append(job_id)

        pages.append(
            {
                "page": page,
                "url": url,
                "ok": True,
                "found": len(found),
                "new": len(new_ids),
                "total": len(collected),
            }
        )
        print(
            f"[list] page={page} found={len(found)} new={len(new_ids)} total={len(collected)}",
            flush=True,
        )
        if len(collected) >= TARGET_COUNT:
            break
        if page < MAX_LIST_PAGES:
            await asyncio.sleep(PAGE_PAUSE_SEC)

    return collected[:TARGET_COUNT], pages


async def extract_job(crawler: AsyncWebCrawler, job_id: str, api_token: str) -> dict:
    url = detail_url(job_id)
    print(f"[detail] {job_id} {url}", flush=True)
    result = await crawler.arun(url=url, config=detail_config())
    record = {
        "job_id": job_id,
        "url": url,
        "crawled_at": datetime.now(timezone.utc).isoformat(),
        "ok": False,
    }
    if not result.success:
        record["error"] = result.error_message
        return record

    parsed = parse_job(result)
    body_block = parsed.pop("_body_block")
    text_chars = parsed.pop("_text_chars")
    summary, summarizer = summarize_body(body_block, parsed, api_token)
    record.update(parsed)
    record["summary"] = summary
    record["summarizer"] = summarizer
    record["ok"] = parsed["company"] != "미기재" or parsed["title"] != "미기재"
    record["text_chars"] = text_chars
    return record


async def main() -> int:
    api_token = require_gemini_key()
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    jobs: list[dict] = []
    async with AsyncWebCrawler(config=browser_config()) as crawler:
        job_ids, pages = await collect_job_ids(crawler)
        print(f"[list] selected={len(job_ids)} ids={job_ids}", flush=True)
        if not job_ids:
            payload = {
                "source": SEARCH_URL,
                "target": TARGET_COUNT,
                "pages": pages,
                "jobs": [],
                "error": "목록에서 GI_Read URL을 못 찾았다.",
            }
            OUTPUT_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
            print(f"[done] wrote {OUTPUT_PATH}", flush=True)
            return 1

        for index, job_id in enumerate(job_ids, start=1):
            jobs.append(await extract_job(crawler, job_id, api_token))
            print(
                f"[detail] {index}/{len(job_ids)} ok={jobs[-1].get('ok')} "
                f"company={jobs[-1].get('company')} title={jobs[-1].get('title')}",
                flush=True,
            )
            if index < len(job_ids):
                await asyncio.sleep(DETAIL_PAUSE_SEC)

    payload = {
        "source": SEARCH_URL,
        "crawled_at": datetime.now(timezone.utc).isoformat(),
        "engine": "crawl4ai 0.9.5 + labeled parse + jd-fit summary schema",
        "target": TARGET_COUNT,
        "collected": len(jobs),
        "ok_count": sum(1 for job in jobs if job.get("ok")),
        "pages": pages,
        "jobs": jobs,
    }
    OUTPUT_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[done] {payload['ok_count']}/{payload['collected']} -> {OUTPUT_PATH}", flush=True)
    return 0 if payload["ok_count"] else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
