"""
사업계획서용 다이어그램 3종 생성
1. 시스템 아키텍처 (Claude + RAG 이중 구조)
2. Phase별 간트 차트
3. 수익화 퍼널
"""
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
import matplotlib.patheffects as pe
import numpy as np
import os

OUT = r'd:\dev\underline\.tmp\diagrams'
os.makedirs(OUT, exist_ok=True)

# ─── 브랜드 컬러 ──────────────────────────────
FOREST      = '#1E3A2F'
FOREST_L    = '#2D5A3D'
FOREST_LL   = '#4A7A5A'
CREAM       = '#F7F3EE'
CREAM_D     = '#EDE8E1'
INK         = '#1C1917'
INK_MUTED   = '#6B6560'
HIGHLIGHT   = '#FFF3B0'
BORDER      = '#E4DDD6'
CLAUDE_BG   = '#E8F4FD'
CLAUDE_BD   = '#5BA4CF'
RAG_BG      = '#FFF3B0'
RAG_BD      = '#D4A017'
DB_BG       = '#E8F5E9'
DB_BD       = '#43A047'

plt.rcParams['font.family'] = ['Malgun Gothic', 'NanumGothic', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False

# ══════════════════════════════════════════════
# 1. 시스템 아키텍처 다이어그램
# ══════════════════════════════════════════════
fig, ax = plt.subplots(figsize=(14, 8))
ax.set_xlim(0, 14)
ax.set_ylim(0, 8)
ax.axis('off')
fig.patch.set_facecolor(CREAM)
ax.set_facecolor(CREAM)

def box(ax, x, y, w, h, label, sublabel='', bg='white', border='#999', fontsize=9, bold=False):
    rect = FancyBboxPatch((x, y), w, h,
                          boxstyle='round,pad=0.1',
                          facecolor=bg, edgecolor=border, linewidth=1.5)
    ax.add_patch(rect)
    fw = 'bold' if bold else 'normal'
    if sublabel:
        ax.text(x + w/2, y + h*0.62, label, ha='center', va='center',
                fontsize=fontsize, color=INK, fontweight=fw)
        ax.text(x + w/2, y + h*0.28, sublabel, ha='center', va='center',
                fontsize=fontsize - 1.5, color=INK_MUTED)
    else:
        ax.text(x + w/2, y + h/2, label, ha='center', va='center',
                fontsize=fontsize, color=INK, fontweight=fw)

def arrow(ax, x1, y1, x2, y2, label='', color='#888'):
    ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                arrowprops=dict(arrowstyle='->', color=color, lw=1.5))
    if label:
        mx, my = (x1+x2)/2, (y1+y2)/2
        ax.text(mx, my + 0.18, label, ha='center', va='bottom',
                fontsize=7.5, color=color)

# 타이틀
ax.text(7, 7.55, '밑줄 시스템 아키텍처 — Claude + 자체 RAG 이중 구조',
        ha='center', va='center', fontsize=12, fontweight='bold', color=FOREST)

# --- 레이어 라벨 ---
for y_pos, label, clr in [(6.3, '사용자', INK_MUTED),
                            (4.6, 'AI 분석 레이어 (현재: Claude 전담  →  Phase 2~: Claude + RAG 병행)', INK_MUTED),
                            (2.7, '데이터 레이어', INK_MUTED),
                            (1.1, '결과 출력', INK_MUTED)]:
    ax.text(0.25, y_pos, label, ha='left', va='center', fontsize=8,
            color=clr, style='italic')
    ax.axhline(y=y_pos - 0.25, xmin=0.02, xmax=0.98, color=BORDER, lw=0.8, ls='--')

# 사용자
box(ax, 5.5, 6.4, 3, 0.85, '[Mobile] 사용자', '책 페이지 사진 촬영', CREAM_D, FOREST, 9, True)

# 앱 서버
box(ax, 4.8, 4.9, 4.4, 0.95, '밑줄 앱 (Next.js / Vercel)', 'API Route Handler', CREAM_D, FOREST, 9, True)

# Claude Vision
box(ax, 0.5, 3.0, 3.2, 1.1, 'Claude Vision API', 'OCR + 밑줄 감지 + 책 식별\n현재 6,227건 처리 완료', CLAUDE_BG, CLAUDE_BD, 8.5)

# 카카오
box(ax, 5.3, 3.0, 3.4, 1.1, '카카오 도서 API', '책 제목·저자·ISBN 매칭\n264권 자동 인식', '#E8F0FE', '#4285F4', 8.5)

# Supabase
box(ax, 10.2, 3.0, 3.3, 1.1, 'Supabase', 'PostgreSQL + pgvector\n밑줄·책·유저 데이터 저장', DB_BG, DB_BD, 8.5)

# RAG 엔진
box(ax, 8.5, 1.55, 3.5, 1.05, '자체 RAG 엔진 (Phase 2~)', 'pgvector 유사도 검색\n외부 API 없이 자체 처리', RAG_BG, RAG_BD, 8.5)

# 결과 출력 3종
for xi, label, sub in [(0.4, '장르·태그 분류\n+ 유저 성향 분석', 'Phase 1'),
                        (4.6, '취향 피드 개인화\n+ 책 요약표 생성', 'Phase 2'),
                        (9.0, 'AI 책 추천\n+ 인용문 추천', 'Phase 3')]:
    box(ax, xi, 0.2, 3.4, 0.85, label, sub, CREAM_D, FOREST_L, 8)

# 화살표
arrow(ax, 7.0, 6.4, 7.0, 5.85, '사진 업로드', FOREST)
arrow(ax, 5.0, 4.9, 2.1, 4.1, 'Vision 분석 요청', CLAUDE_BD)
arrow(ax, 7.0, 4.9, 7.0, 4.1, '도서 검색', '#4285F4')
arrow(ax, 9.0, 4.9, 11.6, 4.1, 'DB 저장·조회', DB_BD)
arrow(ax, 11.6, 3.0, 10.5, 2.6, 'pgvector\n벡터화', RAG_BD)
arrow(ax, 9.5, 3.0, 9.5, 2.6, '', RAG_BD)
# RAG → 결과들
arrow(ax, 8.5, 2.05, 2.1, 1.05, '', RAG_BD)
arrow(ax, 10.0, 1.55, 6.3, 1.05, '', RAG_BD)
arrow(ax, 10.5, 1.55, 10.7, 1.05, '', RAG_BD)

# 범례
legend_items = [
    mpatches.Patch(facecolor=CLAUDE_BG, edgecolor=CLAUDE_BD, label='Claude AI (현재)'),
    mpatches.Patch(facecolor=RAG_BG, edgecolor=RAG_BD, label='자체 RAG (Phase 2~)'),
    mpatches.Patch(facecolor=DB_BG, edgecolor=DB_BD, label='Supabase DB'),
]
ax.legend(handles=legend_items, loc='lower left', fontsize=8,
          facecolor=CREAM, edgecolor=BORDER, framealpha=0.9)

plt.tight_layout(pad=0.5)
plt.savefig(os.path.join(OUT, 'diagram_architecture.png'), dpi=180, bbox_inches='tight',
            facecolor=CREAM)
plt.close()
print('OK 1/3 architecture')

# ══════════════════════════════════════════════
# 2. Phase별 간트 차트
# ══════════════════════════════════════════════
fig, ax = plt.subplots(figsize=(14, 7))
fig.patch.set_facecolor(CREAM)
ax.set_facecolor(CREAM)

tasks = [
    # (Phase, 태스크명, 시작월, 기간월, 색상)
    (1, 'AI 자동 분석 엔진 개발',          1, 2, FOREST),
    (1, '장르·태그 자동 분류 (Claude)',     1, 1.5, FOREST_L),
    (1, '유저 성향 심층 분석',              1, 2, FOREST_L),
    (1, '동일 밑줄 클러스터링 (pgvector)', 1.5, 1.5, FOREST_LL),
    (2, 'pgvector RAG 벡터 DB 구축',       3, 1.5, '#D4A017'),
    (2, '취향 기반 피드 개인화',            3, 2, '#C49A16'),
    (2, '책별 밑줄 요약표 자동 생성',       3.5, 1.5, '#B08A10'),
    (2, '저자/출판사 대시보드',             4, 1, '#9A7A0E'),
    (3, 'AI 책 추천 엔진',                 5, 2, CLAUDE_BD),
    (3, '상황별 인용문 추천 (RAG)',         5, 2, '#4A94BF'),
    (3, '프리미엄 구독 결제 연동',          5.5, 1.5, '#3A84AF'),
    (3, '어필리에이트 수익 연결',           5.5, 1.5, '#2A749F'),
]

y_positions = list(range(len(tasks), 0, -1))
ax.set_xlim(0.5, 7.5)
ax.set_ylim(0, len(tasks) + 1.5)

# Phase 배경
for phase_num, x_start, x_end, label in [
    (1, 0.8, 2.8, 'Phase 1\nAI 자동 분석'),
    (2, 2.8, 4.8, 'Phase 2\nRAG 구축'),
    (3, 4.8, 7.2, 'Phase 3\n추천+수익화'),
]:
    ax.axvspan(x_start, x_end, alpha=0.07,
               color=[FOREST, '#D4A017', CLAUDE_BD][phase_num - 1])
    ax.text((x_start + x_end) / 2, len(tasks) + 1.0, label,
            ha='center', va='center', fontsize=9, fontweight='bold',
            color=[FOREST, '#8B6914', CLAUDE_BD][phase_num - 1])

# 바
for i, (phase, name, start, dur, clr) in enumerate(tasks):
    y = y_positions[i]
    bar = ax.barh(y, dur, left=start, height=0.55, color=clr, alpha=0.85,
                  edgecolor='white', linewidth=0.5)
    ax.text(start + dur + 0.08, y, name, va='center', fontsize=8.5, color=INK)

# X축
ax.set_xticks(range(1, 8))
ax.set_xticklabels([f'{m}개월' for m in range(1, 8)], fontsize=9)
ax.set_yticks(y_positions)
ax.set_yticklabels([f'P{t[0]}' for t in tasks], fontsize=8, color=INK_MUTED)
ax.tick_params(axis='x', colors=INK_MUTED)
ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)
ax.spines['left'].set_visible(False)
ax.spines['bottom'].set_color(BORDER)

# 월 구분선
for m in range(2, 8):
    ax.axvline(m, color=BORDER, lw=0.8, ls='--', zorder=0)

ax.set_title('Phase별 개발 로드맵 (6개월)', fontsize=13, fontweight='bold',
             color=FOREST, pad=12)
ax.text(0.99, -0.04, '※ Phase 2 완료 시점에 Claude API 비용 30% 절감 (RAG 전환 효과)',
        transform=ax.transAxes, ha='right', fontsize=8, color=INK_MUTED, style='italic')

plt.tight_layout(pad=0.8)
plt.savefig(os.path.join(OUT, 'diagram_gantt.png'), dpi=180, bbox_inches='tight',
            facecolor=CREAM)
plt.close()
print('OK 2/3 gantt')

# ══════════════════════════════════════════════
# 3. 수익화 퍼널 다이어그램
# ══════════════════════════════════════════════
fig, ax = plt.subplots(figsize=(14, 8))
fig.patch.set_facecolor(CREAM)
ax.set_facecolor(CREAM)
ax.axis('off')

# 퍼널 데이터 (왼쪽 너비, 오른쪽 너비, y위치, 레이블, 서브, 색)
stages = [
    # (top_w, bot_w, y_center, title, sub, color, text_color)
    (12.0, 10.5, 6.8, '전체 독서 커뮤니티 방문',
     'BookTok 2,000억 뷰 | #북스타그램 1.2억 건\n마케팅·바이럴 유입',
     '#E8F4E8', FOREST),
    (10.5, 8.5,  5.4, '무료 회원가입',
     '소셜 피드·좋아요·공유 카드 기본 기능 무료 제공\n월 10개 제한으로 부담 없이 유입',
     '#D5ECD5', FOREST_L),
    (8.5,  6.5,  4.0, '활성 무료 유저 (月 10개 한도 내)',
     '월 2~3권 독자 → 무료로 충분\n콘텐츠 소비·좋아요·공유 카드 활용',
     '#C2E0C2', FOREST_L),
    (6.5,  4.5,  2.7, '한도 도달 유저 (月 4권+ · 크리에이터 · 작가)',
     '자연스럽게 10개 한도 도달\n"더 쓰고 싶다" 결핍 발생',
     RAG_BG, '#8B6914'),
    (4.5,  2.8,  1.5, '프리미엄 전환 (月 4,900원)',
     '무제한 등록 + AI 책 요약표 + 인용문 추천\n+ AI 취향 피드 + 인용 서비스',
     HIGHLIGHT, '#8B6914'),
    (2.8,  1.5,  0.35,'B2B 수익 (출판사·크리에이터 API)',
     '출판사 AI 리포트 | 인용문 API\n저자 대시보드',
     '#FFE0A0', '#7A5A00'),
]

cx = 7.0  # 중심 x
for top_w, bot_w, yc, title, sub, bg, fg in stages:
    h = 0.9
    top_x = cx - top_w / 2
    bot_x = cx - bot_w / 2
    xs = [top_x, top_x + top_w, bot_x + bot_w, bot_x, top_x]
    ys = [yc + h/2, yc + h/2, yc - h/2, yc - h/2, yc + h/2]
    ax.fill(xs, ys, color=bg, alpha=0.9, zorder=2)
    ax.plot(xs, ys, color=fg, lw=1.2, zorder=3)
    # 타이틀
    ax.text(cx, yc + 0.15, title, ha='center', va='center',
            fontsize=9.5, fontweight='bold', color=fg, zorder=4)
    ax.text(cx, yc - 0.22, sub, ha='center', va='center',
            fontsize=7.5, color=INK_MUTED, zorder=4)

# 전환율 & 수익 라벨 (오른쪽)
labels_r = [
    (7.2, 6.4, ''),
    (7.2, 5.0, '전체 방문자의 일부'),
    (7.2, 3.6, ''),
    (7.2, 2.3, '전환율 5% (6개월)\n→ 8% (12개월)'),
    (7.2, 1.1, '月 4,900원\n→ 月 245,000원 (50명 기준)'),
    (7.2, 0.0, 'B2B 리포트 단가\n협의'),
]
for rx, ry, rl in labels_r:
    if rl:
        ax.text(12.7, ry, rl, ha='right', va='center',
                fontsize=7.5, color=INK_MUTED, style='italic')

# 오른쪽 수익 타임라인
timeline = [
    (7.7, 5.4, '즉시: 어필리에이트'),
    (7.7, 4.0, '6개월: 프리미엄 구독'),
    (7.7, 2.7, '12개월: B2B 리포트'),
    (7.7, 1.5, '18개월: API 라이선스'),
]
ax.text(10.0, 7.5, '수익화 타임라인', ha='center', fontsize=9,
        fontweight='bold', color=FOREST)
for tx, ty, tl in timeline:
    ax.plot(tx, ty, 'o', color=FOREST, markersize=5, zorder=5)
    ax.text(tx + 0.2, ty, tl, va='center', fontsize=8, color=FOREST)

ax.set_xlim(1, 13.5)
ax.set_ylim(-0.4, 8.0)
ax.set_title('수익화 퍼널 — 등록 개수 제한 기반 프리미엄 전환 구조',
             fontsize=13, fontweight='bold', color=FOREST, pad=12)

plt.tight_layout(pad=0.5)
plt.savefig(os.path.join(OUT, 'diagram_funnel.png'), dpi=180, bbox_inches='tight',
            facecolor=CREAM)
plt.close()
print('OK 3/3 funnel')
print('Done:', OUT)
