# JOB RADAR — 주간 PM·서비스기획 채용 레이더

**라이브: https://taeyongvv.github.io/job_moaba/**

주요 테크 기업 + 글로벌 AI·엔터의 PM·서비스기획 공고를 경력 단계별로 정리한 주간 채용 보드입니다.
백엔드는 Supabase 프로젝트(`ricecookey-contests`)의 `jobradar_*` 테이블을 읽습니다.

## 배포 (GitHub Pages)

GitHub Actions가 Next.js를 **정적 export**(`output: "export"`, `basePath: "/job_moaba"`)로 빌드해
GitHub Pages에 배포합니다. 트리거: `main` 푸시 / 매주 토 23:30 UTC(주간 수집 직후) / 수동 실행.

- 데이터는 **빌드 시점에 고정**됩니다. 새 공고를 반영하려면 재빌드(주간 자동 또는 Actions 수동 실행).
- 빌드에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`가 필요 — repo Actions secrets에 등록됨.

## 프로젝트 구조

```
app/
  layout.tsx          # 루트 레이아웃
  page.tsx            # 보드 (Server Component, 빌드 시 getJobs())
  JobsBoard.tsx       # 검색·필터·카드 목록 (Client Component)
  SubscribeForm.tsx   # 구독 폼 (Client → Supabase anon 키로 직접 insert)
  jobs.module.css     # 페이지 전용 스타일 (스코프됨)
lib/
  jobradar.ts         # 타입 + getJobs() 데이터 액세스
  supabaseClient.ts   # 브라우저용 Supabase 클라이언트 (구독 insert)
automation/           # 주간 수집 루틴 명세 (아래 참고)
.github/workflows/deploy.yml
```

### 로컬 개발

```bash
npm install
# .env.local 에 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 설정
npm run dev    # http://localhost:3000  (basePath 때문에 /job_moaba 경로로 접속)
npm run build  # 정적 export → out/
```

## 동작 방식

- `app/page.tsx`는 Server Component지만 정적 export라 **빌드 시점**에 `getJobs()`가 `jobradar_v_jobs`
  뷰에서 `status='open'` 공고를 읽어 HTML에 구워 넣습니다 (`export const dynamic = "force-static"`).
- 검색·회사·경력 필터는 **클라이언트에서** 처리(`JobsBoard.tsx`)하므로 추가 네트워크 호출이 없습니다.
- 구독은 정적 호스팅이라 Server Action 대신 **클라이언트에서 Supabase anon 키로 직접 insert**합니다
  (`SubscribeForm.tsx` → `lib/supabaseClient.ts`). 이메일 형식은 클라이언트·DB(RLS WITH CHECK)에서 검증됩니다.
- 폰트: `Space_Grotesk`, `JetBrains_Mono`는 빌드 시 셀프호스팅, 한글 Pretendard는 CDN `<link>`.

## 데이터 갱신 (주차 운영)

새 공고는 `jobradar_jobs`에 `(company_key, title)` 기준으로 upsert하면, **다음 빌드** 때 페이지에 반영됩니다.
즉시 반영하려면 GitHub Actions의 `Deploy to GitHub Pages` 워크플로를 수동 실행(`workflow_dispatch`)하세요.
정기 갱신은 아래 자동 수집 루틴 + 주간 재빌드(토 23:30 UTC)로 완전 자동화됩니다.

## 자동 수집 (주간 루틴)

`automation/` 에 클라우드 에이전트가 따르는 작업 명세가 있습니다.

```
automation/
  companies.json        # 추적 회사 14곳 (key, careers_url, is_global)
  research-routine.md    # 주차 계산 → 리서치·검증 → jobradar_jobs upsert → 만료 롤오버
```

매주 일요일 08:00 KST에 실행되어 추적 회사들의 PM·서비스기획 공고를 검색·검증하고
`jobradar_jobs`에 `(company_key, title)` 기준으로 upsert합니다. **검증된 실제 공고만** `open`으로
노출하며, 명세를 수정(회사 추가·매핑 규칙 변경)하면 다음 실행부터 반영됩니다.
루틴 관리: https://claude.ai/code/routines

## RLS 요약 (이미 적용됨)

- `jobradar_jobs` / `jobradar_companies` → 누구나 읽기, 단 공고는 `status='open'`만 노출
- `jobradar_subscribers` → insert만 허용(이메일 형식 검증), 조회 불가 → 이메일 목록 비공개
- 프론트엔드에는 RLS로 보호되는 publishable(anon) 키만 사용. service_role 키는 절대 클라이언트에 두지 마세요.
