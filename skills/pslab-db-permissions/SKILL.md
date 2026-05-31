---
name: pslab-db-permissions
description: >-
  PS Lab에서 Supabase/Postgres 권한 오류(permission denied for table, RLS 위반,
  관리 API 500 등)를 다룰 때 적용한다. docs/agent/DB-PERMISSIONS.md를 Read로 연 뒤
  sql/migrations 패턴을 맞추고, 운영 적용·콘솔은 docs/agent/DB-ESCALATION.md에 따라
  사용자에게 팀장 문의를 안내한다. PS Lab, pslab, 졸업 요건, economy_settings,
  RLS, GRANT 관련 작업 시 사용한다.
---

# PS Lab DB 권한·RLS 대응 스킬

## 언제 쓰는지

- 로그·응답에 **`permission denied for table`**, **`violates row-level security`**, PostgREST **PGRST** 관련 권한 메시지
- 특정 **테이블**만 조회/저장 시 **500** (다른 API는 정상)
- 새 마이그레이션으로 만든 테이블인데 **GRANT**가 빠진 의심

## 에이전트 절차

1. **`docs/agent/DB-PERMISSIONS.md`** 를 `Read`로 연다.
2. `grep` 또는 검색으로 **`sql/migrations/`** 에서 해당 테이블명을 찾아 RLS·정책·`GRANT` 여부를 확인한다.
3. 레포 수정이 필요하면 **`economy_settings.sql`** 과 동일한 수준으로 **`GRANT ALL` + RLS `FOR ALL USING (true)`**(또는 역할에 맞는 정책) 패턴을 맞춘다.
4. 운영 DB에 SQL을 직접 적용할 권한이 없거나 정책 결정이 필요하면 **`docs/agent/DB-ESCALATION.md`** 에 따라 사용자에게 팀장(또는 DB 책임자) 처리를 안내한다.
5. 추측으로 Supabase 대시보드에서 **삭제·역할 변경**을 하지 않는다.

## 플레이북과의 관계

- 일반 작업 순서·에스컬레이션 원칙은 **`pslab-agent-playbook`** 과 동일하다.
- 본 스킬은 **권한·RLS 전용**으로 `DB-PERMISSIONS.md` 를 단일 진입점으로 둔다.
