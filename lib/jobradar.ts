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
