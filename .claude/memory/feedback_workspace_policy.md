---
name: feedback-workspace-policy
description: 밑줄 프로젝트 워크스페이스 파일/worktree 경로 정책
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 8147e441-9dd4-4459-a190-9cf3441aa370
---

모든 파일은 `d:/dev/underline/` 안에서만 생성한다. 외부 경로(d:/tmp 등) 사용 금지.

**Why:** GitHub으로 프로젝트를 관리하므로 모든 파일이 워크스페이스 안에 있어야 버전 관리가 된다.

**How to apply:**
- 임시 파일 → `d:/dev/underline/.tmp/`
- Git worktree → `d:/dev/underline/.worktrees/feature-xxx`
- Confluence JSON 페이로드 등도 `.tmp/` 안에 저장
- `.tmp/`와 `.worktrees/`는 `.gitignore`에 등록되어 있음
