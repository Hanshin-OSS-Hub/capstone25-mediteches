---
name: pslab-agent-playbook
description: >-
  PS Lab 저장소에서 작업을 시작하거나 오류를 디버깅할 때 적용한다. 에이전트는
  본격적인 코드 변경 전에 먼저 본 SKILL.md 본문(관례·Git)을 읽고, 이어서
  docs/agent/PREWORK.md를 읽는다. 빌드·런타임·DB·하이드레이션
  문제가 나면 docs/agent/TROUBLESHOOTING.md를 먼저 따른다. 401·403·500·로그인 혼동 시
  docs/agent/HTTP-AUTH-ERRORS.md를 본다. 보안 관련 코드(API·URL fetch·인증·시크릿)를
  건드리면 docs/agent/SECURITY.md를 읽는다. 수정 후 검증 절차는 docs/agent/ERROR-VERIFICATION.md를
  따른다.   운영 DB·권한·콘솔 적용은 docs/agent/DB-ESCALATION.md에 따라 사용자에게 팀장 문의를
  안내한다. Postgres permission denied·RLS·테이블 GRANT 이슈는 docs/agent/DB-PERMISSIONS.md
  및 스킬 pslab-db-permissions를 본다. 확인·경고·삭제 질문 등 모든 팝업은 브라우저 confirm/alert/prompt 대신 앱 내
  모달(예: ConfirmModal)을 사용한다. 신규·미완성 기능은 사이드바 「개발중」 아래에서
  개발하고, 완료 후에만 정식 메뉴 위치로 옮긴다. PS Lab, pslab, 게시판, 대시보드, Supabase,
  Next.js 하이드레이션, 출석, 상점 관련 작업 시 사용한다. Git 그래프가 낡아 보이거나
  Dependabot·의존성 업그레이드 위험도, PR·커밋 메시지 규칙(feat: 제목 등)·독립 브랜치·upstream 설정을
  다룰 때는 스킬 pslab-git-and-dependencies를 본다.
---

# PS Lab Agent 플레이북

## UI: 팝업은 모달로

- **`window.confirm` / `alert` / `prompt` 를 새로 넣지 않는다.** 기존 코드를 건드릴 때도 가능하면 프로젝트 모달로 바꾼다.
- 확인이 필요하면 **`src/components/ConfirmModal.tsx`** 또는 동일한 톤의 `fixed inset-0` 카드 모달 패턴을 쓴다.

## UI: 프로필 미리보기·오버랩 아바타 (상점 등)

- 헤더 배너 + **음수 마진(`-mt-*`)으로 위로 겹치는 원형 아바타** 패턴을 쓸 때, **카드 루트에 `overflow-hidden`을 두지 않는다.** 전체에 두면 아바타 상단이 잘린다.
- **배너(상단 색 블록)에만** `overflow-hidden` + `rounded-t-*` 를 주고, 하단 정보 영역은 `overflow-visible`(기본)로 둔다. 참고: **`src/components/ShopTab.tsx`** `ItemPreviewModal` 의 「프로필에 적용 시」 블록.
- 배너에 `relative`(+`overflow-hidden`)가 있으면 **쌓임 맥락**이 생겨, 아래 형제가 투명한 구간에서는 배경이 “앞에 나온 것처럼” 보일 수 있다. **배너는 `z-0`, 겹치는 행·아바타는 `relative z-10`** 으로 명시한다.
- 배너 위에 보여야 하는 **「샘플」 등 라벨**은 `z-0` 배너 *내부*에만 두면 형제 `z-10` 겹침 블록에 가려진다. **프로필 카드 루트(`relative`)에 `absolute z-20`** 으로 두고 `top`/`left`로 배너 영역에 맞춘다.
- 미리보기 모달이 길어지면 하단이 잘릴 수 있으니, 모달 본문은 `max-h-[min(90vh,…)] overflow-y-auto` 등으로 두고 `overflow-hidden`만 고집하지 않는다.

## 작업 시작 시 (필수에 가깝게)

사용자 요청이 **설정 변경 한 줄** 수준이 아니라면, 코드를 읽거나 수정하기 **직전**에 다음 순서를 따른다.

1. **본 파일(`SKILL.md`) 전체** — UI 관례(모달·상점 미리보기)·**Git 절**(아래「그래프 최신화」포함)
2. **`docs/agent/PREWORK.md`** — 맥락·레이아웃·DB·API 진입점 (`Read` 도구로 연다)
3. **프론트엔드(UI/UX) 작업 시** — **`.cursor/skills/pslab-hci-ux/SKILL.md`** 를 `Read`로 열어 HCI 체크리스트를 확인한다
4. 요청이 특정 기능에만 국한되면 PREWORK의 해당 절만 읽어도 됨

### 용어: 「그래프 최신화」

팀/사용자가 **README 폴더 트리**가 아니라 **Git 브랜치 그래프**(커밋 히스토리·분기 시각)를 말할 때 쓰는 표현이다. 보통 **로컬 `dev`에 최신 `origin/main`을 합쳐** 브랜치 그래프를 정리하는 작업을 뜻한다. 절차는 아래 **「Git: 로컬 dev를 최신 main에 맞추기」** 와 같다.

## 기능·네비: 개발중 → 완료 후 정식 배치

- **새 페이지·실험 중인 기능**은 **`src/components/DashboardLayout.tsx`의 `navigation`** 에서 **「개발중」 그룹(하위 메뉴)** 안에만 두고 라우트·UI를 연결해 개발한다. 그룹이 없으면 **`FlaskConical` 등으로 「개발중」 그룹을 추가**하고 그 아래에 항목을 넣는다.
- **동작·검증(`ERROR-VERIFICATION`·필요 시 보안)까지 끝나고** 사용자에게 배포해도 된다고 판단될 때만, 해당 항목을 **개발중에서 빼서** 정식 위치(예: 도메인에 맞는 단일 메뉴·다른 그룹)로 **옮긴다**. 중간에 정식 메뉴에 바로 넣지 않는다.
- **이미 정식 배치된 기능**을 대규모로 고칠 때도, 요청에 따라 임시로 개발중 아래에 미러 링크를 두는 등 **사용자와 합의된 방식**을 따른다.

## 보안 (코드·API·배포를 건드릴 때)

다음 중 하나라도 해당하면 **`docs/agent/SECURITY.md`를 `Read`로 연다** (새 API, 관리자 기능, 사용자 입력 URL·파일, 세션/쿠키, 환경 변수, 외부 fetch, OpenAI·유료 API).

- 요약: `getApiUser`·관리자 분기, 시크릿/로그 노출 금지, SSRF 가드, 비용 API 레이트 리밋, `ConfirmModal`, 미들웨어 Origin·CSP·`/api/debug` 운영 정책.

## 에러 검증 (수정 후·PR 전)

기능을 바꾼 뒤에는 **`docs/agent/ERROR-VERIFICATION.md`를 따른다.**

- 요약: `npx tsc --noEmit`, `npm run lint`, 필요 시 `npm run build`; HTTP 코드·429 재시도; 하이드레이션·DB는 TROUBLESHOOTING·ESCALATION과 연계; `npm run security:audit`는 릴리스 전 권장.

## 오류·이상 동작 시

1. **`docs/agent/TROUBLESHOOTING.md`** 에서 증상에 맞는 절을 연다
2. HTTP 상태·인증·권한 구분이 필요하면 **`docs/agent/HTTP-AUTH-ERRORS.md`**
3. Postgres **`permission denied` / RLS / 테이블 GRANT** 이면 **`docs/agent/DB-PERMISSIONS.md`** (스킬 **`pslab-db-permissions`**)
4. 거기서 가리키는 파일을 실제로 연다 (`Read` 도구)
5. 필요하면 `README.md`, `sql/migrations/` 를 이어서 본다

## 다크 모드·프로필 레이아웃·역할/권한

- 다크 모드 `dark:` 클래스를 추가하거나, 플로팅 프로필·드래그 그립을 다루거나, 역할(`writer`, `admin`)·공지 권한을 건드릴 때 **`pslab-ui-patterns`** 스킬(`Read`)을 연다.
- 요약: Tailwind `dark:` 컨벤션, `ThemeProvider`·`theme.ts`, 프로필 `group/profile-float` 호버 패딩 패턴, `role-guard.ts`·`admin-guard.ts` API 보호, `sql/migrations` 역할 추가.

## 커밋·PR 규칙 (요약)

- **커밋 메시지:** **`feat: 제목`**, **`fix: 제목`** 등 Conventional Commits 형식(영문 type, 콜론 뒤 한 칸, 한글 제목 가능). 기능별로 커밋을 나눈다.
- **PR:** **독립 작업 브랜치**(`feat/…` 등)에서만 올리고, **`main`을 로컬 작업 브랜치의 upstream으로 두지 않는다.** PR 제목도 **`feat: 제목`** / **`fix: 제목`** 과 같은 형식을 쓴다.
- 상세·절차는 **`pslab-git-and-dependencies`** 스킬(`Read`) 본문의 「커밋 메시지」「PR 제목·브랜치」「PR 올릴 때」를 따른다.

## Git 그래프·Dependabot·의존성·PR

- 그래프가 예전처럼 보이거나 `main` vs `dev` vs `origin/dependabot` 의미·위험도, **PR·커밋 규칙**, **PR을 `main`(또는 `dev`)에 올릴 때 작업 브랜치가 `main`을 트래킹하지 않게 두는 방법**을 물을 때 **`pslab-git-and-dependencies`** 스킬(`Read`)을 연다.
- 요약: `git fetch` 후 로컬/원격 `main` 정합성, Dependabot은 패키지 버전 전용 브랜치, 메이저·프레임워크 업데이트는 회귀 가능성·CI·단계적 머지, PR은 전용 브랜치를 `origin/동일-이름`에만 연결해 푸시.

## 이 스킬을 적용하지 않아도 될 때

- 오타·주석 한 줄
- 사용자가 명시한 단일 파일·단일 라인만 수정하라고 한 경우

## Git: 로컬 `dev`를 최신 `main`에 맞추기 (= 그래프 최신화)

**내 컴퓨터의 `dev` 브랜치**에 **원격 저장소의 최신 `main`**(`origin/main`) 내용을 반영할 때 아래를 쓴다. (원격 `dev`를 억지로 맞추는 절차가 아님.)

1. `git fetch origin` — `origin/main` 등 최신 참조 가져오기
2. `git checkout dev`
3. `git merge origin/main` — 로컬 `dev` 위에 최신 `main`을 합침 (충돌 나면 해결 후 커밋)

로컬에만 있는 작업을 **선형으로 올리고 싶으면** 3번 대신 `git rebase origin/main` (팀 규칙과 맞는지 확인).

**로컬 `dev`를 `main`과 완전히 같은 커밋으로 덮어쓰기**(dev 전용 커밋을 버림)는 `git reset --hard origin/main` — 이후 원격 `dev`까지 같이 맞출지는 팀 정책이며, 필요할 때만 `git push origin dev --force-with-lease` 한다.

## 디렉터리 (저장소 루트 기준)

- `docs/agent/README.md` — 디렉터리 안내
- `docs/agent/PREWORK.md` — 작업 전 확인
- `docs/agent/TROUBLESHOOTING.md` — 증상별 체크리스트
- `docs/agent/HTTP-AUTH-ERRORS.md` — 401/403/500·로그인·API 호출 최소화
- `docs/agent/SECURITY.md` — 인증·SSRF·시크릿·미들웨어·운영 디버그
- `docs/agent/ERROR-VERIFICATION.md` — 수정 후 타입·린트·빌드·HTTP·DB 검증
- `docs/agent/DB-ESCALATION.md` — DB·권한은 팀장 에스컬레이션
- `docs/agent/DB-PERMISSIONS.md` — RLS·GRANT·permission denied 대응
- `.cursor/skills/pslab-db-permissions/SKILL.md` — 권한 전용 스킬
- `.cursor/skills/pslab-git-and-dependencies/SKILL.md` — Git 그래프·Dependabot·의존성 위험도
- `.cursor/skills/pslab-ui-patterns/SKILL.md` — 다크 모드·프로필 레이아웃·역할/권한
- `.cursor/skills/pslab-hci-ux/SKILL.md` — HCI/UX 가이드라인 (프론트엔드 작성·수정 시 체크리스트)
- `.cursor/skills/pslab-agent-playbook/SKILL.md` — 본 스킬

스킬 본문은 짧게 유지하고, 상세 목록은 위 마크다운 파일에만 둔다.
