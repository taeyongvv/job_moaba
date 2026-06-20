# JOB RADAR — 주간 채용공고 수집 루틴 (Cloud Agent Spec)

이 문서는 **매주 자동 실행되는 클라우드 에이전트**가 그대로 따라야 하는 작업 명세입니다.
목표: 추적 중인 회사들의 **PM·서비스기획** 공고를 리서치·검증하고 Supabase `jobradar_jobs`에
upsert하여 `/jobs` 페이지를 최신 상태로 유지한다.

> 연결: Supabase MCP (project `ricecookey-contests`, id `gxcihojkwhpxfdvpgtal`) + WebSearch.
> 데이터 정확성이 최우선이다. **확인되지 않은 공고는 절대 넣지 않는다(날조 금지).**

---

## 0) 절대 규칙 (먼저 읽을 것)

1. **날조 금지.** 웹 검색으로 **실제 공고 URL(apply_url)** 을 확인하지 못하면 그 공고는 넣지 않는다.
   apply_url은 반드시 해당 회사의 채용 도메인(`companies.json`의 careers_url 호스트) 또는
   알려진 ATS(greenhouse.io, lever.co, greetinghr.com, ashbyhq.com 등)로 실제 연결되어야 한다.
2. **마감일을 지어내지 않는다.** 명시된 마감일을 확인 못 하면 `deadline = null`(상시)로 둔다.
3. 범위는 **PM / 서비스기획 / Product Manager / Product Owner / 프로덕트 기획** 직무로 한정.
   엔지니어링·디자인·마케팅 단독 공고는 제외.
4. 회사 범위는 `automation/companies.json`의 14개사로 한정한다. (FK 제약: `company_key`는
   `jobradar_companies.key`에 존재해야 함.) 새 회사를 추가하려면 먼저 `jobradar_companies`에 INSERT.
5. 쓰기 전 항상 현재 스키마/데이터를 한 번 조회해 가정을 확인한다.

---

## 1) 주차 계산

- 오늘(UTC) 기준 ISO 주차를 `week_label`로 쓴다. 형식 `YYYY-Www` (예: `2026-W26`).
- 셸로 확인: `date -u +%G-W%V`. 이 값을 이하 `<WEEK>`로 표기. 오늘 날짜는 `<TODAY>` (`date -u +%F`).

## 2) 현황 파악 (Supabase MCP `execute_sql`, 읽기)

```sql
select key, name_ko, is_global, careers_url from jobradar_companies order by is_global, key;
select company_key, title, tier, deadline, status, week_label
from jobradar_jobs where status = 'open' order by company_key, tier;
```
- 이미 open인 공고 목록을 확보해 중복/갱신 대상을 파악한다.

## 3) 회사별 리서치 (WebSearch)

`companies.json`의 각 회사에 대해:
- `"<회사명> Product Manager 채용"`, `"<회사명> 서비스기획 채용"`, `site:<careers host> product manager`
  등으로 검색해 **현재 열려 있는** PM·기획 공고를 찾는다.
- 각 후보 공고마다 **실제 공고 페이지 URL**을 확보하고, 그 URL이 0)의 도메인 규칙을 만족하는지 확인한다.
- 만족하지 못하면 버린다. (개수를 못 채워도 됨 — 정확도가 개수보다 중요하다.)

각 검증된 공고를 다음 필드로 매핑한다:

| 필드 | 규칙 |
|------|------|
| `company_key` | `companies.json`의 key |
| `title` | 공고 실제 제목(간결화 가능, 단 동일 공고는 매주 같은 문자열로 — upsert 키이므로 안정적이어야 함) |
| `tier` | 경력 요건 매핑: **1**=인턴/신입/경력 1년+, **2**=경력 3년+, **3**=경력 5년+, **4**=경력 7년+. 불명확하면 본문의 최소 경력으로 판단, 그래도 모르면 2 |
| `deadline` | 마감일 확인 시 `YYYY-MM-DD`, 상시/미확인은 `null` |
| `apply_url` | **검증된 실제 공고 URL** |
| `location` | 명시된 근무지(예: `서울`, `San Francisco`), 없으면 `null` |
| `is_global` | 글로벌 3사(anthropic/openai/disney)는 `true`, 국내사는 `false` |
| `source` | 항상 `'auto'` |
| `fit_score` | PM·기획 적합도 0~100. 핵심 PM/PO=80~95, 운영기획/주니어=60~79, 인접직무=40~59 |
| `status` | 검증된 공고는 `'open'`. (검증 실패 건은 아예 넣지 않음) |
| `week_label` | `<WEEK>` |

## 4) Upsert (Supabase MCP `execute_sql`, 쓰기)

검증된 공고마다 `(company_key, title)` 충돌 시 갱신:

```sql
insert into jobradar_jobs
  (company_key, tier, title, deadline, apply_url, location, is_global, source, fit_score, status, week_label, posted_at)
values
  ('<company_key>', <tier>, '<title>', <deadline|null>, '<apply_url>', <location|null>, <is_global>, 'auto', <fit_score>, 'open', '<WEEK>', now())
on conflict (company_key, title) do update set
  tier = excluded.tier,
  deadline = excluded.deadline,
  apply_url = excluded.apply_url,
  location = excluded.location,
  is_global = excluded.is_global,
  fit_score = excluded.fit_score,
  status = 'open',
  week_label = excluded.week_label,   -- 재확인된 공고는 이번 주차로 갱신되어 '최신'으로 유지됨
  updated_at = now();
```
- 작은따옴표는 이스케이프(`''`)하고, 여러 건은 `values (...), (...)`로 묶어도 됨.

## 5) 만료/롤오버 처리 (쓰기)

이번 주 재확인되지 않은(=`week_label`이 아직 이전 주차인) open 공고 중,
마감이 지났거나 상시인 것을 closed 처리한다 (마감일이 미래인 공고는 유지):

```sql
update jobradar_jobs
set status = 'closed', updated_at = now()
where status = 'open'
  and week_label is distinct from '<WEEK>'
  and (deadline is null or deadline < '<TODAY>');
```

## 6) 검증 & 보고

```sql
select week_label, status, count(*) from jobradar_jobs group by 1,2 order by 1,2;
select company_key, tier, title, deadline, fit_score
from jobradar_jobs where week_label = '<WEEK>' and status='open'
order by is_global, tier, company_key;
```

마지막에 다음을 요약 출력한다:
- 이번 주 추가/갱신된 공고 수, 회사 수, 글로벌 공고 수
- closed로 전환된 공고 수
- 검색했으나 **검증 실패로 제외한** 회사/사유 (다음 개선용)

페이지는 `revalidate = 300`(5분 ISR)이라 DB 반영 후 5분 내 자동 노출된다.

---

## 운영 메모

- 이 명세를 고치면(회사 추가, 매핑 규칙 변경 등) 커밋만 하면 다음 실행부터 반영됨 — 루틴 프롬프트는
  "이 파일을 읽고 따르라"만 지시하므로 레시피는 항상 Git이 진실의 원천.
- 루틴 설정/스케줄 변경: https://claude.ai/code/routines
