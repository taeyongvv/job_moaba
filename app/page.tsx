import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { getJobs } from "@/lib/jobradar";
import JobsBoard from "./JobsBoard";
import SubscribeForm from "./SubscribeForm";
import styles from "./jobs.module.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space-grotesk",
});
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "JOB RADAR · 주간 PM·서비스기획 채용",
  description:
    "국내 주요 테크 기업부터 글로벌 AI·엔터까지, PM·서비스기획 채용을 경력 단계별로 정리한 주간 채용 레이더.",
};

// GitHub Pages = 정적 export: 데이터는 빌드 시점에 고정됨.
// 갱신은 GitHub Actions 주간 재빌드(또는 수동 트리거)로 수행.
export const dynamic = "force-static";

export default async function JobsPage() {
  const jobs = await getJobs();
  const companyCount = new Set(jobs.map((j) => j.company_key)).size;
  const globalCount = jobs.filter((j) => j.is_global).length;

  return (
    <div className={`${styles.page} ${spaceGrotesk.variable} ${jetbrains.variable}`}>
      {/* Pretendard (한글) */}
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@1.3.9/dist/web/static/pretendard.min.css"
      />

      <div className={styles.topbar}>
        <div className={styles.topbarIn}>
          <div className={styles.brand}>
            <span className={styles.dot} />
            JOB&nbsp;RADAR
          </div>
          <div className={styles.sub}>PM · 서비스기획 · ✉️ #49</div>
        </div>
      </div>

      <header className={styles.hero}>
        <div className={styles.heroIn}>
          <div>
            <div className={styles.eyebrow}>LIVE · 2026 · 6월 2주차 주간 채용공고</div>
            <h1>
              이번 주 PM·기획 채용을
              <br />
              <span className={styles.accent}>레이더</span>로 잡아드려요
            </h1>
            <p className={styles.lede}>
              국내 주요 테크 기업부터 글로벌 AI·엔터까지, 흩어진 공고를 한 화면에서 경력 단계별로
              정리했습니다.
            </p>
            <div className={styles.stats}>
              <div className={styles.stat}>
                <div className={styles.n}>{jobs.length}</div>
                <div className={styles.l}>이번 주 공고</div>
              </div>
              <div className={styles.stat}>
                <div className={styles.n}>{companyCount}</div>
                <div className={styles.l}>채용 중 기업</div>
              </div>
              <div className={styles.stat}>
                <div className={`${styles.n} ${styles.hl}`}>+{globalCount}</div>
                <div className={styles.l}>글로벌 공고</div>
              </div>
            </div>
          </div>
          <div className={styles.radar} aria-hidden="true">
            <div className={styles.ring} />
            <div className={`${styles.ring} ${styles.r2}`} />
            <div className={`${styles.ring} ${styles.r3}`} />
            <div className={`${styles.ring} ${styles.r4}`} />
            <div className={styles.cross} />
            <div className={styles.cross2} />
            <div className={styles.sweep} />
            <span className={`${styles.blip} ${styles.b1}`} />
            <span className={`${styles.blip} ${styles.b2}`} />
            <span className={`${styles.blip} ${styles.b3}`} />
          </div>
        </div>
      </header>

      <div className={styles.notice}>
        <div className={styles.noticeCard}>
          <span className={styles.tag}>공지</span>
          <p>
            <b>글로벌 채용이 추가되었어요.</b> 이번 주부터 <b>Anthropic · OpenAI · Disney</b>의
            프로덕트/PM 공고를 함께 큐레이션합니다. 데이터는 Supabase에서 실시간으로 불러옵니다.
          </p>
        </div>
      </div>

      <JobsBoard jobs={jobs} />

      <div className={styles.sub}>
        <div className={styles.subCard}>
          <div className={styles.eyebrow}>무료 구독</div>
          <h3>매주 일요일, 새 공고를 메일로</h3>
          <p>네카라쿠배당토 + 글로벌 AI·엔터의 PM·서비스기획 공고를 선별해 보내드립니다.</p>
          <SubscribeForm />
        </div>
      </div>

      <footer className={styles.footer}>
        <div className={styles.fbrand}>JOB RADAR</div>
        <div>
          PM·서비스기획 직무를 준비하거나 이직을 준비하는 분들을 위해, 매주 최신 채용공고를
          제공합니다.
        </div>
        <div className={styles.dis}>
          * 일자는 접수 마감일 기준이며 &quot;상시&quot;는 상시 채용입니다. 데이터는
          Supabase(jobradar_v_jobs)에서 불러오며, 최종 내용은 각 사 채용 페이지에서 확인하세요.
        </div>
      </footer>
    </div>
  );
}
