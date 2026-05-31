---
name: pslab-ui-patterns
description: >-
  PS Lab 다크 모드·테마, 플로팅 프로필 드래그, 역할·권한 시스템의 코드 패턴과
  규칙. 다크 모드 클래스(dark:)를 추가하거나, 프로필 위치·드래그 그립을 다루거나,
  역할(writer·admin)·공지 권한을 건드릴 때 적용한다. theme, ThemeProvider,
  다크 모드, 프로필 플로팅, 드래그, 그립, GripVertical, 역할, 권한, writer,
  admin, role, getApiUser, requireRole, user_roles 관련 작업 시 사용한다.
---

# PS Lab UI 패턴 — 다크 모드 · 프로필 레이아웃 · 역할/권한

---

## 1. 다크 모드 / 테마

### 핵심 파일

| 파일 | 역할 |
|------|------|
| `src/lib/theme.ts` | `ThemeMode` 타입, localStorage 읽기/쓰기, `applyTheme()` |
| `src/components/ThemeProvider.tsx` | 마운트 시 `applyTheme`, `prefers-color-scheme` 변경 감지 |
| `src/app/layout.tsx` | `<ThemeProvider>` 래핑 |
| `src/app/globals.css` | `dark:` variant (배경·텍스트·그림자 등) |
| `src/app/dashboard/settings/appearance/AppearanceSettingsClient.tsx` | 라이트/다크/시스템 UI 토글 |

### 규칙

1. **`<html>`에 `class="dark"`** — Tailwind `darkMode: "class"` 사용. `applyTheme()`가 `documentElement.classList.toggle("dark", …)`를 한다.
2. **localStorage 키**: `pslab-theme` (`"light" | "dark" | "system"`).
3. 새 컴포넌트·페이지를 만들면 **`dark:` Tailwind 클래스**를 병기한다.
   - 배경: `bg-white dark:bg-zinc-900`
   - 텍스트: `text-gray-900 dark:text-zinc-100`, 서브 `text-gray-500 dark:text-zinc-400`
   - 테두리: `border-gray-200 dark:border-zinc-700`
   - 카드: `bg-white dark:bg-zinc-900 border border-gray-200/60 dark:border-zinc-700/80`
   - hover: `hover:bg-gray-50 dark:hover:bg-zinc-800`
4. 기존 컴포넌트를 건드릴 때 `dark:` 가 없으면 **같이 추가**한다.
5. `globals.css` 커스텀 유틸(`.sidebar-nav` 스크롤바 등)에도 `dark:` 대응이 있으니 참고.

### 금기

- `color-scheme` meta를 하드코딩하지 않는다 — `applyTheme()`가 런타임에 설정.
- `ThemeProvider` 밖에서 `document.documentElement.classList`를 직접 조작하지 않는다.

---

## 2. 플로팅 프로필 · 드래그 그립

### 핵심 파일

| 파일 | 역할 |
|------|------|
| `src/lib/profile-layout-prefs.ts` | `getPreferProfileFloating()` / `setPreferProfileFloating()`, localStorage `pslab-profile-prefer-floating` |
| `src/components/DashboardLayout.tsx` | 플로팅 `<div>` + 그립 `<button>`, `profileDrag` 상태, `profileTopBar` 자동 전환 |
| `src/components/ProfileDropdown.tsx` | 프로필 pill / 아바타 / 드롭다운 메뉴, "위치 초기화" 버튼 |
| `AppearanceSettingsClient.tsx` | 「우측 상단 고정」 토글 switch |

### 동작 구조

```
사용자 설정 (localStorage)
  ↓
preferProfileFloating (state)
  ↓
profileTopBar (ResizeObserver 히스테리시스)
  ├── true  → 데스크톱은 상단 바에 ProfileDropdown 표시, 플로팅 숨김
  └── false → 우상단 플로팅 + 드래그 그립
```

### 규칙

1. **설정 즉시 반영**: `setPreferProfileFloating()`는 `pslab-profile-pref-changed` 커스텀 이벤트를 발사하고, `DashboardLayout`이 수신해 `preferProfileFloating` state를 갱신한다. **새로고침 불필요**.
2. **그립 호버 패턴**:
   - 래퍼에 `group/profile-float` + 왼쪽 `pl-10`으로 호버 영역 확장.
   - 그립은 `absolute left-0` + `opacity-0 pointer-events-none` → `group-hover/profile-float:opacity-100 pointer-events-auto`.
   - 프로필에서 그립으로 마우스 이동 시 **데드존이 생기지 않도록** 패딩 안에 배치.
3. **드래그**: `pointerdown` → `setPointerCapture` → `pointermove`에서 `setProfileDrag` → `pointerup`에서 `clampProfileDrag()` + localStorage 저장.
4. **초기화**: `pslab-profile-drag-reset` 이벤트 → `setProfileDrag({ x: 0, y: 0 })`.
5. **히스테리시스 해제**: `profilePreferWasOffRef` — 설정을 껐다 켤 때 `profileTopBar`가 이전 "상단 바" 상태에서 빠져나오도록 한 번 초기화.
6. 그립 버튼은 **배경·테두리 없이** `text-gray-400/90` + hover 시 `hover:bg-black/[0.06]`만 — 버튼 느낌 최소화.

### 금기

- 그립에 `margin`으로 간격을 두지 않는다 → margin 영역은 호버가 안 닿아 그립이 꺼진다. **패딩 + absolute 배치**를 쓴다.
- `profileTopBar` 값을 직접 세팅하지 않는다 — `evaluate()` 안의 `ResizeObserver` + 히스테리시스가 관리한다.
- `GripVertical` 아이콘은 `lucide-react`에서 import.

---

## 3. 역할 · 권한 시스템

### DB 구조

| 테이블 | 설명 |
|--------|------|
| `role_definitions` | `key` (PK, 예: `writer`, `admin`), `name`, `description`, `color` |
| `user_roles` | `user_id` ↔ `role_id` (FK → `role_definitions.id`) |
| `page_role_rules` | `page_path` × `required_role_key` × `access_level` (`view`/`edit`) |

### 서버 유틸

| 함수 (파일) | 용도 |
|-------------|------|
| `getApiUser()` (`src/lib/auth.ts`) | 쿠키에서 Supabase 세션 → `AppUser { id, email, role }` 반환 |
| `requireAdminResponse()` (`src/lib/admin-guard.ts`) | `role !== "admin"` 이면 403 `NextResponse` 반환 |
| `getUserRoles()` (`src/lib/role-guard.ts`) | `user_roles` + `role_definitions` JOIN → `string[]` |
| `requireRole()` (`src/lib/role-guard.ts`) | admin이면 무조건 통과, 아니면 `getUserRoles` 후 포함 여부 |
| `hasRole()` / `hasAnyRole()` | 이미 가져온 역할 배열에서 검사 |

### 클라이언트 역할 조회

```tsx
// DashboardLayout.tsx — 사이드바 메뉴 필터링
const [userRoleKeys, setUserRoleKeys] = useState<string[]>([]);
useEffect(() => {
  fetch("/api/user/roles")
    .then(r => r.ok ? r.json() : [])
    .then(roles => setUserRoleKeys(roles));
}, []);
```

`navigation` 배열에서 `requiredRoles?: string[]`가 있으면 `userRoleKeys`에 포함된 경우만 노출.

### 현재 역할 키

| 키 | 용도 |
|----|------|
| `admin` | 관리자 — `profiles.role = 'admin'`, 모든 관리 API 접근 |
| `writer` | 게시판 공지 카테고리 작성 권한 (일반 멤버에게 부여 가능) |

### 규칙

1. **새 역할 추가 시**: `sql/migrations/` 에 `INSERT INTO role_definitions … ON CONFLICT DO NOTHING` SQL 파일 생성, docs/agent/DB-ESCALATION.md 안내.
2. **API 보호**: 관리자 전용이면 `requireAdminResponse(user)`, 역할 기반이면 `requireRole(user.id, user.role, "키")`.
3. **공지 카테고리 예시** (게시판):
   - API (`/api/posts` POST/PUT): 카테고리가 `notice`이면 `requireRole(user.id, user.role, "writer")`.
   - Client (`PostsClient`): `userRoleKeys.includes("writer")` 이면 공지 버튼 노출.
4. **admin은 모든 역할을 우회** — `requireRole` 내부에서 `if (userRole === "admin") return true`.
5. **메뉴 숨김**: `navigation` 항목에 `requiredRoles: ["키"]` → `filteredNavigation`에서 해당 역할이 없으면 필터.

### 금기

- 클라이언트에서 역할을 판단해 API를 **호출하지 않는** 방식으로만 보호하지 않는다 — **반드시 서버 API 쪽에서도 검증**.
- `profiles.role`(admin/member)과 `user_roles`(세분화된 역할 키)를 혼동하지 않는다.
- 운영 DB에 직접 `INSERT` / `GRANT` 하지 않는다 → `docs/agent/DB-ESCALATION.md` 참고.
