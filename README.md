# JOB RADAR — Contest Radar `/jobs` 하위 라우트

Contest Radar(Next.js App Router) 프로젝트에 그대로 떨어뜨리면 `/jobs` 경로가 생기는 파일 세트입니다.
백엔드는 이미 적용된 같은 Supabase 프로젝트(`ricecookey-contests`)의 `jobradar_*` 테이블을 읽습니다.

## 파일 배치

프로젝트 루트 기준으로 아래 위치에 복사하세요.

```
app/
  jobs/
    page.tsx          # 라우트 진입점 (Server Component, 데이터 fetch + 레이아웃)
    JobsBoard.tsx     # 검색·필터·카드 목록 (Client Component)
    SubscribeForm.tsx # 구독 폼 (Client Component → Server Action 호출)
    actions.ts        # subscribe Server Action
    jobs.module.css   # 페이지 전용 스타일 (스코프됨, Tailwind 설정 무관)
lib/
  jobradar.ts         # 타입 + getJobs() 데이터 액세스
```

## 전제 조건 (Contest Radar에 이미 있을 것)

- **의존성**: `@supabase/supabase-js` (Contest Radar에서 이미 사용 중). 없다면 `npm i @supabase/supabase-js`
- **환경변수**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  → 동일한 Supabase 프로젝트라 기존 `.env.local` / Vercel 환경변수를 그대로 씁니다. 추가 설정 불필요.
- **경로 별칭**: `@/*` (Next.js 기본 `tsconfig.json` 설정). `@/lib/jobradar` import가 이걸 씁니다.
- **next/font**: `Space_Grotesk`, `JetBrains_Mono`를 Google Fonts로 불러옵니다(빌드 시 자동 셀프호스팅). 한글은 Pretendard를 page에서 `<link>`로 로드합니다.

## 확인

```bash
npm run dev
# http://localhost:3000/jobs
```

상단 필터바에 `Supabase · LIVE` 배지가 보이면 DB에서 실시간으로 읽고 있는 것입니다.

## 내비게이션 링크 추가 (선택)

기존 헤더/네비 컴포넌트에 한 줄 추가하면 됩니다.

```tsx
import Link from "next/link";
// ...
<Link href="/jobs">채용</Link>
```

## 동작 방식

- `app/jobs/page.tsx`는 **Server Component**로, 요청 시 `getJobs()`가 `jobradar_v_jobs` 뷰에서
  `status='open'` 공고를 가져옵니다. `export const revalidate = 300`으로 5분마다 재생성(ISR)됩니다.
- 검색·회사·경력 필터는 **클라이언트에서** 처리(`JobsBoard.tsx`)하므로 추가 네트워크 호출이 없습니다.
- 구독은 **Server Action**(`actions.ts`)이 `jobradar_subscribers`에 insert합니다.
  이메일 형식은 클라이언트·서버·DB(RLS WITH CHECK) 3중으로 검증됩니다.

## 데이터 갱신 (주차 운영)

새 공고는 `jobradar_jobs`에 `(company_key, title)` 기준 upsert하면 페이지가 5분 내 자동 반영됩니다.
즉시 반영이 필요하면 페이지에서 `revalidatePath("/jobs")`를 호출하거나 Vercel 재배포하세요.
Contest Radar의 Cowork 수집 작업에 `source='cowork'`로 upsert하는 스텝을 붙이면 완전 자동화됩니다.

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
