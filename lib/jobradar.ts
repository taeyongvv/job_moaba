// lib/jobradar.ts
// JOB RADAR 데이터 액세스 — Contest Radar와 동일한 Supabase 프로젝트의 jobradar_* 테이블을 읽습니다.
import { createClient } from "@supabase/supabase-js";

// 이미 lib/supabase/server.ts 등 클라이언트가 있으면 그걸 import 해서 써도 됩니다.
// 여기서는 공개 읽기(RLS: status='open'만 노출)이므로 anon 키로 충분합니다.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export type Tier = 1 | 2 | 3 | 4;

export interface Job {
  id: string;
  tier: Tier;
  title: string;
  deadline: string | null; // 'YYYY-MM-DD' | null(상시)
  apply_url: string;
  location: string | null;
  is_global: boolean;
  fit_score: number | null;
  status: "open" | "closed" | "draft";
  week_label: string | null;
  posted_at: string;
  company_key: string;
  company_name: string;
  company_name_en: string | null;
  brand_color: string;
  careers_url: string | null;
}

export const TIERS: { id: Tier; label: string; color: string }[] = [
  { id: 1, label: "인턴 / 신입 / 경력 1년+", color: "var(--t1)" },
  { id: 2, label: "경력 3년+", color: "var(--t2)" },
  { id: 3, label: "경력 5년+", color: "var(--t3)" },
  { id: 4, label: "경력 7년+", color: "var(--t4)" },
];

// ── 그룹사 통합 필터 ──────────────────────────────────────────
// company_key → 소속 그룹. 그룹 칩 하나로 계열사 공고를 묶어서 본다.
export type GroupKey = "kakao" | "naver";

export const GROUPS: { key: GroupKey; label: string; color: string; members: string[] }[] = [
  { key: "kakao", label: "카카오", color: "#FEE500", members: ["kakao", "kakaopay", "kakaobank"] },
  { key: "naver", label: "네이버", color: "#03C75A", members: ["naver", "webtoon"] },
];

const GROUP_OF: Record<string, GroupKey> = GROUPS.reduce(
  (acc, g) => {
    g.members.forEach((m) => (acc[m] = g.key));
    return acc;
  },
  {} as Record<string, GroupKey>,
);

export const groupOf = (companyKey: string): GroupKey | null =>
  GROUP_OF[companyKey] ?? null;

// 회사 필터에 항상 노출하는 고정 목록 — 네카라쿠배당토(라인은 네이버 그룹에 포함) + 글로벌 3사.
// 공고가 0건인 회사도 칩은 항상 보이게 한다(데이터 의존 X).
// kind 'grp'는 계열사를 묶은 단일 칩(네이버=naver/webtoon/line, 카카오=kakao/kakaopay/kakaobank).
// 네카라쿠배당토 순: 네이버 · 카카오 · 라인 · 쿠팡 · 배민 · 당근 · 토스, 그 뒤 글로벌 3사.
// (네이버=naver/webtoon 묶음, 카카오=kakao/kakaopay/kakaobank 묶음, 라인은 독립)
export const COMPANY_FILTER: { kind: "co" | "grp"; key: string; name: string; color: string }[] = [
  { kind: "grp", key: "naver", name: "네이버", color: "#03C75A" },
  { kind: "grp", key: "kakao", name: "카카오", color: "#FEE500" },
  { kind: "co", key: "line", name: "라인", color: "#06C755" },
  { kind: "co", key: "coupang", name: "쿠팡", color: "#C81E2E" },
  { kind: "co", key: "baemin", name: "배민", color: "#2AC1BC" },
  { kind: "co", key: "daangn", name: "당근", color: "#FF6F0F" },
  { kind: "co", key: "toss", name: "토스", color: "#3182F6" },
  { kind: "co", key: "anthropic", name: "Anthropic", color: "#CC785C" },
  { kind: "co", key: "openai", name: "OpenAI", color: "#10A37F" },
  { kind: "co", key: "disney", name: "Disney", color: "#2B49C9" },
];

// ── 근무지(지역) 필터 ─────────────────────────────────────────
// global = is_global, metro = 국내 수도권(서울·경기), domestic = 국내 비수도권.
// 서울·경기(metro)는 국내(domestic 포함)의 부분집합으로 취급한다.
export type Region = "metro" | "domestic" | "global";

// 국내사 중 수도권(서울·경기)에 주 근무지가 있는 회사. (글로벌사는 is_global로 자동 분류)
const METRO_COMPANIES = new Set<string>([
  "toss", "coupang", "baemin", "line", "kakao", "kakaopay",
  "kakaobank", "daangn", "webtoon", "naver",
]);

export const REGIONS: { id: "all" | Region; label: string }[] = [
  { id: "all", label: "전체" },
  { id: "metro", label: "서울·경기" },
  { id: "domestic", label: "국내" },
  { id: "global", label: "글로벌" },
];

/** 공고의 지역 분류. 글로벌이면 global, 아니면 회사 수도권 여부로 metro/domestic. */
export function regionOf(job: Pick<Job, "is_global" | "company_key">): Region {
  if (job.is_global) return "global";
  return METRO_COMPANIES.has(job.company_key) ? "metro" : "domestic";
}

// 개별 공고를 카드로 노출하는 회사 — 링크 검증이 가능한 곳.
// 네이버·카카오·카카오뱅크·라인은 SPA/봇차단이라 개별 공고 검증이 불가능해 제외하고,
// 대신 CAREERS_FALLBACK의 '채용 페이지 바로가기' 카드로 대체한다.
export const TRACKED_COMPANIES = new Set<string>([
  "toss", "coupang", "baemin", "webtoon",
  "kakaopay", "daangn",
  "anthropic", "openai", "disney",
]);

// 검증 불가(SPA/봇차단) 회사 — 개별 공고 대신 채용 목록/검색 페이지로 바로 연결한다.
// 채용 공고는 빨리 마감되므로 항상 열리는 채용 페이지가 더 신뢰성 있다.
export const CAREERS_FALLBACK: {
  company_key: string;
  name: string;
  color: string;
  careers_url: string;
}[] = [
  { company_key: "naver", name: "네이버", color: "#03C75A", careers_url: "https://recruit.navercorp.com/" },
  { company_key: "kakao", name: "카카오", color: "#FEE500", careers_url: "https://careers.kakao.com/jobs" },
  { company_key: "kakaobank", name: "카카오뱅크", color: "#FED007", careers_url: "https://recruit.kakaobank.com/" },
  { company_key: "line", name: "라인", color: "#06C755", careers_url: "https://careers.linecorp.com/ko/jobs" },
];

export async function getJobs(): Promise<Job[]> {
  const { data, error } = await supabase
    .from("jobradar_v_jobs")
    .select("*")
    .eq("status", "open")
    .order("tier", { ascending: true })
    .order("posted_at", { ascending: false });

  if (error) throw new Error(`[jobradar] ${error.message}`);
  return ((data ?? []) as Job[]).filter((j) => TRACKED_COMPANIES.has(j.company_key));
}

/** 'YYYY-MM-DD' -> 'MM/DD' */
export function formatDeadline(d: string | null): string | null {
  if (!d) return null;
  const x = new Date(d);
  return `${String(x.getMonth() + 1).padStart(2, "0")}/${String(x.getDate()).padStart(2, "0")}`;
}

/**
 * 공개(open) 공고 데이터의 마지막 갱신 시각(ISO 문자열).
 * 정적 export에서는 빌드 시점에 한 번 조회되어, 그때의 DB 기준 시각을 보여준다.
 */
export async function getDataUpdatedAt(): Promise<string | null> {
  const { data, error } = await supabase
    .from("jobradar_jobs")
    .select("updated_at")
    .eq("status", "open")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return (data as { updated_at: string }).updated_at;
}

/** ISO -> '2026.06.21 00:39 KST' (Asia/Seoul) */
export function formatKST(iso: string | null): string | null {
  if (!iso) return null;
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${g("year")}.${g("month")}.${g("day")} ${g("hour")}:${g("minute")} KST`;
}
