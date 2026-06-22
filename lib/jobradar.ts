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
  { key: "naver", label: "네이버", color: "#03C75A", members: ["naver", "webtoon", "line"] },
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

// ── 근무지(지역) 필터 ─────────────────────────────────────────
// global = is_global, metro = 국내 수도권(서울·경기), domestic = 국내 비수도권.
// 서울·경기(metro)는 국내(domestic 포함)의 부분집합으로 취급한다.
export type Region = "metro" | "domestic" | "global";

// 국내사 중 수도권(서울·경기)에 주 근무지가 있는 회사. (글로벌사는 is_global로 자동 분류)
const METRO_COMPANIES = new Set<string>([
  "toss", "coupang", "baemin", "woowa", "line", "kakao", "kakaopay",
  "kakaobank", "daangn", "webtoon", "naver", "moloco", "sendbird",
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

export async function getJobs(): Promise<Job[]> {
  const { data, error } = await supabase
    .from("jobradar_v_jobs")
    .select("*")
    .eq("status", "open")
    .order("tier", { ascending: true })
    .order("posted_at", { ascending: false });

  if (error) throw new Error(`[jobradar] ${error.message}`);
  return (data ?? []) as Job[];
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
