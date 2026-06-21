# 밑줄 에이전트 정책 문서

> 생성: 2026-06-22
> 목적: 각 에이전트의 심화 도메인 지식 및 교차 검증 결과물
> 갱신 기준: 서비스 방향 변경, 법규 개정, 주요 기술 변경 시

## 에이전트 도메인 정책

| 에이전트 | 문서 | 핵심 내용 요약 |
|---------|------|-------------|
| Planner | [planner-policy.md](./planner-policy.md) | 소셜 독서 앱 기획 원칙, 기능 우선순위 프레임워크 |
| Designer | [designer-policy.md](./designer-policy.md) | 타이포그래피 기준, 카드 설계 패턴, 접근성 |
| Developer | [developer-policy.md](./developer-policy.md) | Next.js 15 패턴, Supabase RLS, Vision API 통합 |
| Reviewer | [reviewer-policy.md](./reviewer-policy.md) | 보안 체크리스트, RLS 검증, 배포 전 체크 |
| Marketer | [marketer-policy.md](./marketer-policy.md) | 그로스 모델, 채널 전략, 시즌 캠페인 플레이북 |
| Legal | [legal-policy.md](./legal-policy.md) | 저작권 정책, PIPA 준수, API 이용약관 |
| PM | [pm-policy.md](./pm-policy.md) | 오케스트레이션 기준, 태스크 분해, DoD |

## 교차 검증 결과

| 주제 | 문서 | 참여 에이전트 |
|------|------|------------|
| 프라이버시 설계 구현 | [cross-legal-developer.md](./cross-legal-developer.md) | Legal × Developer |
| 기능별 법적 리스크 | [cross-legal-planner.md](./cross-legal-planner.md) | Legal × Planner |
| 그로스 기반 기능 우선순위 | [cross-marketer-planner.md](./cross-marketer-planner.md) | Marketer × Planner |
| 디자인-개발 인터페이스 계약 | [cross-designer-developer.md](./cross-designer-developer.md) | Designer × Developer |

## 문서 활용 방법

각 에이전트는 작업 시작 전:
1. 자신의 도메인 정책 문서를 읽는다
2. 관련 교차 검증 문서를 참조한다
3. 정책에 위배되는 요청이 들어오면 PM에게 에스컬레이션한다

## 다음 갱신 예정

- [ ] 팔로우 기능 구현 시: legal-policy, cross-legal-planner 업데이트
- [ ] 추천 엔진 기획 시: legal-policy, marketer-policy 업데이트
