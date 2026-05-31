---
name: pslab-git-and-dependencies
description: >-
  Git 그래프가 예전처럼 보이거나 브랜치·Dependabot PR 의미를 설명해야 할 때,
  npm·의존성 버전 올리기의 회귀 위험을 짧게 판단해야 할 때, PR을 올릴 때
  main을 upstream으로 두지 않는 독립 작업 브랜치 패턴을 안내해야 할 때 적용한다.
  커밋·PR 제목은 feat: 제목·fix: 제목 형식(Conventional Commits)을 따른다.
  로컬 main과 origin/main 불일치, fetch/pull, GitLens 그래프, PR base/compare,
  메이저·프레임워크 업데이트 시 CI·단계적 머지 권장을 안내한다. PS Lab, Dependabot,
  Git 그래프, Next.js·Supabase 업그레이드, feat 브랜치·PR 관련 질문 시 사용한다.
---

# PS Lab: Git 그래프·의존성·PR

## 커밋 메시지 (필수 형식)

- **Conventional Commits** 스타일로 **영문 type + 콜론 + 한 칸 + 제목**을 쓴다.
- 형식: **`feat: 제목`**, **`fix: 제목`**, **`chore: 제목`**, **`docs: 제목`** 등.
  - 예: `feat: 사이드바 슬라이드 복원`, `fix: 개인 캘린더 조회 권한 분리`
- `feat`는 기능 추가, `fix`는 버그·회귀 수정, `chore`는 잡무·리팩터·설정, `docs`는 문서만 변경 등으로 구분한다.
- **한 PR/한 작업 단위**에 맞게 커밋을 나누고, 위 형식을 **모든 커밋**에 적용한다 (임의의 한 줄 메시지·제목 없음 지양).

## PR 제목·브랜치 (필수 형식)

- **브랜치:** 아래 **「PR 올릴 때」**의 **독립 작업 브랜치** 규칙을 따른다 (`feat/짧은-요약` 등, `main`을 upstream으로 두지 않음).
- **PR 제목:** 커밋과 동일한 톤으로 **`feat: 제목`** 또는 **`fix: 제목`** 형식을 쓴다 (저장소 기본 브랜치로 머지 요청의 한 줄 요약).
  - 예: `feat: 캘린더 로컬 날짜 및 레이아웃 슬라이드 복원`
- 본문에는 변경 요약·관련 이슈·검증 여부를 **완전한 문장**으로 적는다 (플레이북·ERROR-VERIFICATION 참고).

## PR 올릴 때 (중요)

- **의도:** GitHub에서 PR은 **base = `main`**(또는 팀 기본 브랜치), **compare = 전용 작업 브랜치**로 연다. 로컬에서는 그 작업 브랜치가 **`main`을 upstream(트래킹)하지 않는 독립 브랜치**로 두는 것이 안전하다.
- **왜:** 작업 브랜치가 `origin/main`을 트래킹하면 `git pull`/`git status` 해석이 꼬이고, 실수로 **로컬 `main`과 동기화하는 동작**과 섞이기 쉽다. 작업 브랜치는 **`origin/같은-브랜치-이름`** 만 트래킹하게 두면, 푸시·동기화가 “이 PR 브랜치”에만 대응한다.
- **권장 절차 (요약):**
  1. `git fetch origin`
  2. 최신 기준 분기: `git checkout main` → `git pull origin main` (또는 팀이 쓰는 기본 브랜치에서 분기)
  3. `git checkout -b feat/짧은-요약` 또는 `feature/...` — **`main`에서 직접 커밋하지 않음**
  4. 작업 후 최초 푸시: `git push -u origin HEAD` 또는 `git push -u origin feat/짧은-요약` → upstream은 **`origin/feat/...`** 가 되어야 함
  5. GitHub에서 **compare: 해당 브랜치 → base: `main`** 으로 PR 생성
- **확인:** `git branch -vv` — 작업 브랜치에 `[origin/main]` 이 보이면 잘못된 트래킹일 수 있다. `[origin/feat/...]` 처럼 **동일 이름 원격**이 보이는 것이 일반적이다.
- **팀이 `dev`만 거쳐 `main`으로 가는 경우:** compare는 여전히 **전용 브랜치**, base는 **`dev`** 로 두고, 같은 원칙으로 작업 브랜치는 `origin/동일-브랜치`만 트래킹한다 (`main`을 upstream으로 붙이지 않음).

## Git 그래프가 “옛날 것”처럼 보일 때

- **흔한 원인:** 로컬 `main`을 오래 `pull`하지 않음. `dev`는 `origin/dev`와 맞는데, 뷰가 **로컬 `main`** 기준이면 예전 머지 시점까지만 보인다.
- **확인:** `git fetch --all --prune` 후 `git rev-parse main`과 `git rev-parse origin/main` (또는 `git log -1 --oneline main` / `origin/main`) 비교.
- **로컬 `main`을 원격과 맞출 때:** `git checkout main` → `git pull origin main` (또는 `git merge origin/main`). 일상 작업 브랜치로 돌아갈 때는 `git checkout dev` 등 사용자 브랜치로 복귀.
- **뷰 설정:** GitLens/소스 컨트롤 그래프에서 **`origin/main`** 또는 **현재 작업 브랜치**(`dev` 등)를 기준으로 보면 원격과 맞는 히스토리를 보기 쉽다.

## 그래프 색·라벨이 의미하는 것

- **선 색:** 브랜치마다 도구가 다른 색을 쓸 뿐, 색 자체가 우선순위를 뜻하지는 않는다.
- **`origin/main` 최상단 머지 커밋:** GitHub에서 `main`으로 합쳐진 PR(예: `dev` → `main` 머지). 배포·기본 브랜치의 “원격 최신”이다.
- **`dev`:** 개발 브랜치 끝의 기능 커밋들. 제품 기능 변경의 기준선으로 보면 된다.
- **`origin/dependabot/...`:** Dependabot이 연 **의존성 버전만 올리는 브랜치**. 기능 PR과 별개이며, 각각이 아직 `main`/`dev`에 안 합쳐진 **자동 PR**이면 그래프에서 갈라져 여러 줄로 보인다. 메시지는 보통 `chore(deps)` / `chore(deps-dev)` 형태.

## 의존성 버전을 올릴 때 회귀 가능성

- **가능성 0은 아님:** 어떤 올리기도 빌드·타입·런타임 다른 코드에 영향을 줄 수 있다.
- **상대적으로 위험 큼:** **메이저** 버전, Next·React·번들러 등 **프레임워크/빌드 축**, 앱 전역을 쓰는 클라이언트(Supabase JS 등). peer dependency 불일치로 설치 단계에서 막히기도 한다.
- **상대적으로 덜한 경우가 많음:** 패치·소규모 마이너, **순수 `@types/*`**(타입 체크에서만 새 오류가 드러날 수 있음), dev 전용 PostCSS·Tailwind 등(빌드/스타일 파이프라인 위주).
- **실무:** Dependabot PR은 보통 **CI**가 돌아가 깨짐을 잡는다. **여러 Dependabot PR을 한꺼번에 섞어 머지하지 말고**, 하나씩 머지한 뒤 빌드·테스트로 확인하는 편이 원인 추적에 유리하다.

## 이 저장소와 연계

- 수정 후 검증 절차는 **`docs/agent/ERROR-VERIFICATION.md`** (`tsc`, `lint`, `build` 등).
- 보안·감사 스크립트는 플레이북 **`pslab-agent-playbook`** 과 `SECURITY`·`security:audit` 안내를 따른다.
