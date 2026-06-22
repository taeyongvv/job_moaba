"use client";

import { useMemo, useState, type CSSProperties } from "react";
import {
  TIERS,
  GROUPS,
  REGIONS,
  groupOf,
  regionOf,
  formatDeadline,
  type Job,
  type Tier,
  type Region,
} from "@/lib/jobradar";
import styles from "./jobs.module.css";

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");

export default function JobsBoard({ jobs }: { jobs: Job[] }) {
  // 회사 선택 토큰: 'all' | 'co:<company_key>' | 'grp:<groupKey>'
  const [activeSel, setActiveSel] = useState<string>("all");
  const [activeRegion, setActiveRegion] = useState<"all" | Region>("all");
  const [activeTier, setActiveTier] = useState<"all" | Tier>("all");
  const [query, setQuery] = useState("");

  // 칩에 쓸 회사 목록 (등장 순서 유지)
  const companies = useMemo(() => {
    const seen = new Map<string, { name: string; color: string }>();
    jobs.forEach((j) => {
      if (!seen.has(j.company_key))
        seen.set(j.company_key, { name: j.company_name, color: j.brand_color });
    });
    return [...seen.entries()].map(([key, v]) => ({ key, ...v }));
  }, [jobs]);

  // 데이터에 실제로 등장하는 그룹만 칩으로 노출
  const groupsShown = useMemo(() => {
    const present = new Set(jobs.map((j) => j.company_key));
    return GROUPS.filter((g) => g.members.some((m) => present.has(m)));
  }, [jobs]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter((j) => {
      if (activeSel.startsWith("co:") && j.company_key !== activeSel.slice(3)) return false;
      if (activeSel.startsWith("grp:") && groupOf(j.company_key) !== activeSel.slice(4)) return false;
      // 근무지: global=글로벌, metro=서울·경기, domestic=국내(수도권 포함 전체)
      if (activeRegion === "global" && !j.is_global) return false;
      if (activeRegion === "metro" && regionOf(j) !== "metro") return false;
      if (activeRegion === "domestic" && j.is_global) return false;
      if (activeTier !== "all" && j.tier !== activeTier) return false;
      if (q) {
        const hay = `${j.title} ${j.company_name} ${j.company_key} ${j.location ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [jobs, activeSel, activeRegion, activeTier, query]);

  const reset = () => {
    setActiveSel("all");
    setActiveRegion("all");
    setActiveTier("all");
    setQuery("");
  };

  return (
    <>
      <div className={styles.filters}>
        <div className={styles.filtersIn}>
          <div className={styles.search}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9A9EA5" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="직무·회사 검색 (예: Product Manager, 토스, Claude)"
              aria-label="검색"
            />
          </div>

          <div className={styles.chiprow}>
            <span className={styles.chipLabel}>근무지</span>
            {REGIONS.map((r) => (
              <button
                key={r.id}
                type="button"
                className={styles.chip}
                aria-pressed={activeRegion === r.id}
                onClick={() => setActiveRegion(r.id)}
              >
                {r.label}
              </button>
            ))}
          </div>

          {groupsShown.length > 0 && (
            <div className={styles.chiprow}>
              <span className={styles.chipLabel}>그룹</span>
              {groupsShown.map((g) => {
                const token = `grp:${g.key}`;
                return (
                  <button
                    key={g.key}
                    type="button"
                    className={styles.chip}
                    aria-pressed={activeSel === token}
                    onClick={() => setActiveSel(activeSel === token ? "all" : token)}
                  >
                    {g.label}
                  </button>
                );
              })}
            </div>
          )}

          <div className={styles.chiprow}>
            <span className={styles.chipLabel}>회사</span>
            <button
              type="button"
              className={styles.chip}
              aria-pressed={activeSel === "all"}
              onClick={() => setActiveSel("all")}
            >
              전체
            </button>
            {companies.map((c) => (
              <button
                key={c.key}
                type="button"
                className={styles.chip}
                aria-pressed={activeSel === `co:${c.key}`}
                onClick={() => setActiveSel(`co:${c.key}`)}
              >
                <span className={styles.cdot} style={{ background: c.color }} />
                {c.name}
              </button>
            ))}
          </div>

          <div className={styles.chiprow}>
            <span className={styles.chipLabel}>경력</span>
            <button
              type="button"
              className={styles.chip}
              aria-pressed={activeTier === "all"}
              onClick={() => setActiveTier("all")}
            >
              전체
            </button>
            {TIERS.map((t) => (
              <button
                key={t.id}
                type="button"
                className={styles.chip}
                aria-pressed={activeTier === t.id}
                onClick={() => setActiveTier(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className={styles.meta}>
            <div className={styles.metaL}>
              <span className={styles.count}>
                <b>{shown.length}</b>개 공고
              </span>
              <span className={styles.src}>
                <span className={styles.d} />
                Supabase · LIVE
              </span>
            </div>
            <button type="button" className={styles.reset} onClick={reset}>
              필터 초기화
            </button>
          </div>
        </div>
      </div>

      <main className={styles.board}>
        {shown.length === 0 ? (
          <div className={styles.empty}>
            <h3>조건에 맞는 공고가 없어요</h3>
            <p>회사나 경력 필터를 바꾸거나 필터를 초기화해 보세요.</p>
          </div>
        ) : (
          TIERS.map((t) => {
            const items = shown.filter((j) => j.tier === t.id);
            if (!items.length) return null;
            return (
              <section key={t.id} className={styles.tier}>
                <div className={styles.tierHead}>
                  <span className={styles.bar} style={{ background: t.color }} />
                  <h2>{t.label}</h2>
                  <span className={styles.ct}>{items.length}</span>
                </div>
                {items.map((j) => (
                  <JobCard key={j.id} job={j} />
                ))}
              </section>
            );
          })
        )}
      </main>
    </>
  );
}

function JobCard({ job }: { job: Job }) {
  const dl = formatDeadline(job.deadline);
  return (
    <a
      className={styles.card}
      href={job.apply_url}
      target="_blank"
      rel="noopener noreferrer"
      style={{ "--accent": job.brand_color } as CSSProperties}
      aria-label={`${job.company_name} ${job.title}`}
    >
      {dl ? (
        <div className={cx(styles.deadline, styles.due)}>
          ~{dl}
          <small>마감</small>
        </div>
      ) : (
        <div className={styles.deadline}>
          상시<small>모집</small>
        </div>
      )}
      <div className={styles.cardBody}>
        <div className={styles.co}>
          <span className={styles.cdot} style={{ background: job.brand_color }} />
          <span className={styles.name}>{job.company_name}</span>
          {job.location && <span className={styles.loc}>{job.location}</span>}
          {job.is_global && <span className={styles.globalBadge}>NEW · GLOBAL</span>}
        </div>
        <div className={styles.title}>{job.title}</div>
      </div>
      <svg
        className={styles.go}
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </a>
  );
}
