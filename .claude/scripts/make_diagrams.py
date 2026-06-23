"""
사업계획서용 다이어그램 3종 — 완전 리디자인
1. 시스템 아키텍처
2. Phase 로드맵 (간트)
3. 수익화 퍼널
"""
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
import matplotlib.patheffects as pe
from matplotlib.colors import LinearSegmentedColormap
import numpy as np
import os

OUT = r'd:\dev\underline\.tmp\diagrams'
os.makedirs(OUT, exist_ok=True)

# 브랜드 컬러
FOREST    = '#1E3A2F'
FOREST_L  = '#2D5A3D'
FOREST_LL = '#4A7A5A'
CREAM     = '#F7F3EE'
CREAM_D   = '#EDE8E1'
INK       = '#1C1917'
INK_M     = '#6B6560'
INK_F     = '#A8A29E'
HL        = '#FFF3B0'
BORDER    = '#E4DDD6'
BLUE      = '#4A90D9'
BLUE_L    = '#E8F4FD'
YELLOW    = '#D4A017'
YELLOW_L  = '#FFF8E1'
GREEN_L   = '#E8F5E9'

plt.rcParams['font.family'] = ['Malgun Gothic', 'NanumGothic', 'Arial Unicode MS', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False


def rounded_box(ax, x, y, w, h, label, sublabel='', bg='white', border='#ccc',
                fontsize=9, bold=False, text_color=INK, radius=0.15):
    rect = FancyBboxPatch((x, y), w, h,
                          boxstyle=f'round,pad=0',
                          facecolor=bg, edgecolor=border, linewidth=1.8,
                          zorder=3)
    ax.add_patch(rect)
    fw = 'bold' if bold else 'normal'
    if sublabel:
        ax.text(x + w/2, y + h*0.63, label, ha='center', va='center',
                fontsize=fontsize, color=text_color, fontweight=fw, zorder=4)
        ax.text(x + w/2, y + h*0.28, sublabel, ha='center', va='center',
                fontsize=fontsize - 1.5, color=INK_M, zorder=4)
    else:
        ax.text(x + w/2, y + h/2, label, ha='center', va='center',
                fontsize=fontsize, color=text_color, fontweight=fw, zorder=4)


def arrow_h(ax, x1, y, x2, label='', color='#888'):
    ax.annotate('', xy=(x2, y), xytext=(x1, y),
                arrowprops=dict(arrowstyle='->', color=color, lw=1.5,
                                connectionstyle='arc3,rad=0'),
                zorder=5)
    if label:
        ax.text((x1+x2)/2, y + 0.14, label, ha='center', va='bottom',
                fontsize=7, color=color, zorder=6)


def arrow_v(ax, x, y1, y2, label='', color='#888', side='right'):
    ax.annotate('', xy=(x, y2), xytext=(x, y1),
                arrowprops=dict(arrowstyle='->', color=color, lw=1.5),
                zorder=5)
    if label:
        offset = 0.15 if side == 'right' else -0.15
        ax.text(x + offset, (y1+y2)/2, label, ha='left' if side=='right' else 'right',
                va='center', fontsize=7, color=color, zorder=6)


# ══════════════════════════════════════════════════════════════════
# 1. 시스템 아키텍처
# ══════════════════════════════════════════════════════════════════
fig, ax = plt.subplots(figsize=(16, 10))
fig.patch.set_facecolor(CREAM)
ax.set_facecolor(CREAM)
ax.set_xlim(0, 16)
ax.set_ylim(0, 10)
ax.axis('off')

# --- 제목 ---
ax.text(8, 9.55, '밑줄 서비스 시스템 아키텍처',
        ha='center', va='center', fontsize=15, fontweight='bold', color=FOREST)
ax.text(8, 9.15, 'Claude Vision AI + 자체 pgvector RAG 이중 구조',
        ha='center', va='center', fontsize=10, color=INK_M)

# --- 레이어 배경 ---
layer_cfg = [
    (7.6, 8.5, 0.9,  '사용자 레이어',    CREAM_D, '#D0C8C0'),
    (5.5, 7.0, 1.9,  'AI 처리 레이어',   '#EBF5EB', '#B8D8B8'),
    (3.0, 4.9, 2.3,  '데이터 저장 레이어', '#EBF0FA', '#B8C8E8'),
    (0.8, 2.5, 2.0,  '출력 / 서비스 레이어', YELLOW_L, '#E0C860'),
]
for y_bot, y_top, _, lbl, bg, bd in layer_cfg:
    rect = FancyBboxPatch((0.3, y_bot), 15.4, y_top - y_bot,
                          boxstyle='round,pad=0.05',
                          facecolor=bg, edgecolor=bd, linewidth=1.0, alpha=0.7, zorder=1)
    ax.add_patch(rect)
    ax.text(0.65, (y_bot + y_top) / 2, lbl, ha='left', va='center',
            fontsize=8, color=INK_M, style='italic', rotation=90, zorder=2)

# --- 사용자 (레이어 1) ---
rounded_box(ax, 5.5, 7.8, 5.0, 0.65,
            '독자 (스마트폰)', '책 페이지 사진 촬영',
            CREAM_D, FOREST, 10, True, FOREST)

# --- 앱 서버 (레이어 2: AI 처리) ---
rounded_box(ax, 4.5, 6.2, 7.0, 0.7,
            '밑줄 앱 (Next.js 15 / Vercel)', 'API Route Handler — 모든 AI 키는 서버에서만 처리',
            '#F0F7F0', FOREST_L, 9.5, True, FOREST)

# Claude Vision
rounded_box(ax, 0.6, 5.0, 4.0, 1.05,
            'Claude Vision API', 'OCR + 밑줄 감지 + 책 식별\n현재 6,227건 처리 완료',
            BLUE_L, BLUE, 9, False, INK)

# 카카오 도서
rounded_box(ax, 5.9, 5.0, 4.2, 1.05,
            '카카오 도서 API', '책 제목 · 저자 · ISBN 자동 매칭\n264권 인식, 국내 최대 도서 DB',
            '#E8F0FE', '#4285F4', 9, False, INK)

# Supabase
rounded_box(ax, 11.2, 5.0, 4.1, 1.05,
            'Supabase', 'PostgreSQL + pgvector\n밑줄 · 책 · 유저 · 벡터 DB',
            GREEN_L, FOREST_LL, 9, False, INK)

# --- 데이터 저장 레이어 ---
rounded_box(ax, 1.5, 3.1, 3.8, 1.6,
            'Phase 1 완료\n(현재 운영 중)',
            'Claude 전담 처리\n장르·태그 자동 분류\n유저 성향 분석',
            BLUE_L, BLUE, 8.5, False, INK)

rounded_box(ax, 6.1, 3.1, 3.8, 1.6,
            'Phase 2 (3~4개월)',
            'pgvector RAG 구축\n취향 피드 개인화\n책별 밑줄 요약표 생성',
            YELLOW_L, YELLOW, 8.5, False, INK)

rounded_box(ax, 10.7, 3.1, 4.5, 1.6,
            'Phase 3 (5~6개월)',
            'AI 책 추천 엔진\n상황별 인용문 추천\nClaude+RAG 병행 최적화',
            '#F3E8FF', '#9C27B0', 8.5, False, INK)

# --- 출력 레이어 ---
outputs = [
    (0.6,  '공개 피드\n(밑줄 타임라인)'),
    (3.7,  '취향 기반\n개인화 피드'),
    (6.8,  '책 요약표\n+ 인용문 추천'),
    (9.9,  'B2B 리포트\n(출판사·저자)'),
    (13.0, '프리미엄 구독\n(월 4,900원)'),
]
for ox, olabel in outputs:
    rounded_box(ax, ox, 0.9, 2.5, 1.25,
                olabel, '', HL, YELLOW, 8.5, False, INK)

# --- 화살표 ---
# 사용자 → 앱
arrow_v(ax, 8.0, 7.8, 6.9, '사진 업로드', FOREST)

# 앱 → Claude
ax.annotate('', xy=(2.6, 6.05), xytext=(5.5, 6.55),
            arrowprops=dict(arrowstyle='->', color=BLUE, lw=1.5), zorder=5)
ax.text(3.8, 6.45, 'Vision 분석', ha='center', fontsize=7.5, color=BLUE)

# 앱 → 카카오
arrow_v(ax, 8.0, 6.2, 6.05, '책 검색', '#4285F4')

# 앱 → Supabase
ax.annotate('', xy=(13.25, 6.05), xytext=(11.0, 6.55),
            arrowprops=dict(arrowstyle='->', color=FOREST_LL, lw=1.5), zorder=5)
ax.text(12.5, 6.45, 'DB 저장', ha='center', fontsize=7.5, color=FOREST_LL)

# Claude → Phase 1
ax.annotate('', xy=(3.4, 4.7), xytext=(2.8, 5.0),
            arrowprops=dict(arrowstyle='->', color=BLUE, lw=1.3), zorder=5)

# Supabase → Phase 2
ax.annotate('', xy=(8.0, 4.7), xytext=(13.25, 5.0),
            arrowprops=dict(arrowstyle='->', color=YELLOW, lw=1.3), zorder=5)
ax.text(11.0, 4.9, 'pgvector', ha='center', fontsize=7, color=YELLOW)

# Supabase → Phase 3
arrow_v(ax, 12.95, 5.0, 4.7, '', '#9C27B0')

# Phase들 → 출력
for px, oy in [(3.4, 1.9), (8.0, 1.9), (12.95, 1.9)]:
    arrow_v(ax, px, 3.1, 2.15, '', YELLOW)

# --- 범례 ---
legend_items = [
    mpatches.Patch(facecolor=BLUE_L,   edgecolor=BLUE,      label='Claude Vision AI (현재)'),
    mpatches.Patch(facecolor=YELLOW_L, edgecolor=YELLOW,    label='자체 RAG / pgvector (Phase 2~)'),
    mpatches.Patch(facecolor=GREEN_L,  edgecolor=FOREST_LL, label='Supabase DB'),
    mpatches.Patch(facecolor=HL,       edgecolor=YELLOW,    label='서비스 출력'),
]
ax.legend(handles=legend_items, loc='lower right', fontsize=8.5,
          facecolor=CREAM, edgecolor=BORDER, framealpha=0.95,
          bbox_to_anchor=(0.99, 0.01))

plt.tight_layout(pad=0.5)
plt.savefig(os.path.join(OUT, 'diagram_architecture.png'), dpi=200,
            bbox_inches='tight', facecolor=CREAM)
plt.close()
print('OK 1/3 architecture')


# ══════════════════════════════════════════════════════════════════
# 2. Phase 개발 로드맵 (간트)
# ══════════════════════════════════════════════════════════════════
fig, ax = plt.subplots(figsize=(16, 9))
fig.patch.set_facecolor(CREAM)
ax.set_facecolor(CREAM)

PHASE_COLORS = {1: FOREST, 2: YELLOW, 3: BLUE}
PHASE_BG     = {1: '#E8F0EA', 2: '#FFF8E1', 3: '#E8F0FA'}

tasks = [
    # (phase, 태스크명, 시작월(float), 기간월(float))
    (1, 'Claude Vision 고도화 (OCR 정확도 향상)',    1.0, 1.5),
    (1, '장르 · 태그 자동 분류',                    1.0, 2.0),
    (1, '유저 성향 심층 분석 (직업 · 독서 패턴)',    1.5, 1.5),
    (1, '동일 밑줄 클러스터링',                     1.5, 1.5),
    (1, '책별 밑줄 요약표 생성',                    2.0, 1.0),
    (2, 'pgvector RAG 벡터 DB 구축',               3.0, 1.5),
    (2, '취향 기반 피드 개인화',                    3.0, 2.0),
    (2, '저자 · 출판사 대시보드',                   3.5, 1.5),
    (2, '프리미엄 구독 결제 연동',                  4.0, 1.0),
    (3, 'AI 책 추천 엔진',                         5.0, 2.0),
    (3, '상황별 인용문 추천 (RAG 활용)',             5.0, 2.0),
    (3, '어필리에이트 수익 연결',                   5.5, 1.5),
    (3, 'B2B 출판사 리포트 서비스',                 5.5, 1.5),
]

n = len(tasks)
Y_BASE = 0.5
Y_GAP  = 0.65

ax.set_xlim(0.3, 7.5)
ax.set_ylim(0, n * Y_GAP + 1.5)

# Phase 배경 영역
phase_ranges = {1: (1.0, 3.0), 2: (3.0, 5.0), 3: (5.0, 7.2)}
phase_labels = {1: 'Phase 1\nAI 자동 분석 엔진', 2: 'Phase 2\nRAG · 개인화', 3: 'Phase 3\n추천 · 수익화'}
for ph, (xs, xe) in phase_ranges.items():
    ax.axvspan(xs, xe, alpha=0.12, color=PHASE_COLORS[ph], zorder=0)
    ax.text((xs + xe) / 2, n * Y_GAP + 1.15, phase_labels[ph],
            ha='center', va='center', fontsize=10, fontweight='bold',
            color=PHASE_COLORS[ph])
    # Phase 구분선
    if ph < 3:
        ax.axvline(xe, color=PHASE_COLORS[ph], lw=1.2, ls='--', alpha=0.5, zorder=1)

# 바 그리기
for i, (ph, name, start, dur) in enumerate(tasks):
    y = Y_BASE + (n - 1 - i) * Y_GAP
    clr = PHASE_COLORS[ph]
    # 메인 바
    ax.barh(y, dur, left=start, height=0.42, color=clr, alpha=0.82,
            edgecolor='white', linewidth=0.8, zorder=3)
    # 왼쪽 태스크명
    ax.text(0.92, y, name, va='center', ha='right', fontsize=8.5,
            color=INK, zorder=4)
    # 완료 마커 (Phase 1은 완료 표시)
    if ph == 1:
        end_x = start + dur
        ax.plot(end_x, y, 's', color='white', markersize=7, zorder=5)
        ax.plot(end_x, y, 's', color=clr, markersize=5, zorder=6)

# 마일스톤 다이아몬드
milestones = [
    (3.0, n * Y_GAP + 0.05, 'STEP1\n완료 목표', FOREST),
    (5.0, n * Y_GAP + 0.05, 'STEP2\n선정 목표', YELLOW),
    (7.0, n * Y_GAP + 0.05, '수익화\n시작', BLUE),
]
for mx, my, ml, mc in milestones:
    ax.plot(mx, my - 0.3, 'D', color=mc, markersize=10, zorder=7)
    ax.text(mx, my + 0.15, ml, ha='center', va='center', fontsize=7.5,
            color=mc, fontweight='bold', zorder=8)

# X축
ax.set_xticks([1, 2, 3, 4, 5, 6, 7])
ax.set_xticklabels(['1개월', '2개월', '3개월', '4개월', '5개월', '6개월', '7개월'],
                   fontsize=9, color=INK_M)
ax.set_yticks([])
ax.tick_params(axis='x', colors=INK_M)

for spine in ['top', 'right', 'left']:
    ax.spines[spine].set_visible(False)
ax.spines['bottom'].set_color(BORDER)

# 월 구분선
for m in range(2, 8):
    ax.axvline(m, color=BORDER, lw=0.8, ls=':', zorder=0)

# 제목
ax.set_title('AI 활용 모델 구축 Phase별 로드맵 (6개월)',
             fontsize=14, fontweight='bold', color=FOREST, pad=40)

# 하단 주석
ax.text(0.5, -0.06, '* Phase 2 완료 시점: pgvector RAG 전환으로 Claude API 비용 약 30% 절감 기대',
        transform=ax.transAxes, ha='center', fontsize=8.5, color=INK_M, style='italic')

plt.tight_layout(pad=1.0)
plt.savefig(os.path.join(OUT, 'diagram_gantt.png'), dpi=200,
            bbox_inches='tight', facecolor=CREAM)
plt.close()
print('OK 2/3 gantt')


# ══════════════════════════════════════════════════════════════════
# 3. 수익화 퍼널 (완전 리디자인)
# ══════════════════════════════════════════════════════════════════
fig, ax = plt.subplots(figsize=(16, 10))
fig.patch.set_facecolor(CREAM)
ax.set_facecolor(CREAM)
ax.set_xlim(0, 16)
ax.set_ylim(0, 10)
ax.axis('off')

ax.text(8, 9.6, '수익화 퍼널 — 등록 개수 제한 기반 자연 유료 전환 구조',
        ha='center', fontsize=14, fontweight='bold', color=FOREST)
ax.text(8, 9.2, '"강제 결제"가 아닌 "더 쓰고 싶다"는 결핍에서 시작되는 전환',
        ha='center', fontsize=9.5, color=INK_M)

# 퍼널 단계 정의
# (top_half_w, bot_half_w, y_center, height, title, subtitle, left_label, right_label, bg, border)
stages = [
    (5.8, 5.2, 7.9, 1.05,
     '독서 커뮤니티 유입',
     'BookTok 2,000억 뷰 · #북스타그램 1.2억 건 · 저자/출판사 파트너십',
     'SNS 독서 문화\n(이미 존재하는 행동)',
     '',
     '#E6F4E6', FOREST_L),
    (5.2, 4.4, 6.65, 1.0,
     '무료 회원가입',
     '소셜 피드 · 좋아요 · 공유 카드 3종 무료 | 월 10개 제한 — 부담 없이 유입',
     '월 2~3권 독자\n= 무료로 충분',
     '',
     '#D5ECD5', FOREST_L),
    (4.4, 3.5, 5.45, 1.0,
     '활성 무료 유저',
     '밑줄 기록 · 피드 소비 · 공유 카드 활용 · 같은 문장에서 멈춘 독자 발견',
     'MAU 1,000명 목표\n(6개월)',
     'MAU 5,000명\n(12개월)',
     '#C2E0C2', FOREST_L),
    (3.5, 2.5, 4.25, 1.0,
     '월 10개 한도 도달',
     '월 4권+ 독자 · 크리에이터 · 방송작가 · 제안서 작성자 → "더 쓰고 싶다" 결핍 발생',
     '"이미 습관화됨"\n= 이탈 없는 전환',
     '전환율 5%→8%\n(6→12개월)',
     YELLOW_L, YELLOW),
    (2.5, 1.6, 3.1, 1.0,
     '프리미엄 전환  月 4,900원',
     '무제한 등록 + AI 자동 태그 + 취향 피드 + 책 요약표 + 인용문 추천',
     '50명 → 245,000원/월\n(6개월)',
     '400명 → 1,960,000원/월\n(12개월)',
     HL, YELLOW),
    (1.6, 0.8, 2.0, 0.85,
     'B2B 수익',
     '출판사 독자 반응 리포트 | 저자 대시보드 | 인용문 API 라이선스',
     '단가: 건별 협의',
     '18개월 목표',
     '#FFE0A0', '#C48A00'),
]

cx = 5.5
for top_hw, bot_hw, yc, h, title, sub, left_l, right_l, bg, bd in stages:
    top_x = cx - top_hw
    bot_x = cx - bot_hw
    xs = [top_x, top_x + 2*top_hw, bot_x + 2*bot_hw, bot_x]
    ys = [yc + h/2, yc + h/2, yc - h/2, yc - h/2]
    ax.fill(xs, ys, color=bg, alpha=0.92, zorder=2)
    ax.plot(xs + [xs[0]], ys + [ys[0]], color=bd, lw=1.5, zorder=3)
    ax.text(cx, yc + h*0.18, title, ha='center', va='center',
            fontsize=10, fontweight='bold', color=INK, zorder=4)
    ax.text(cx, yc - h*0.2, sub, ha='center', va='center',
            fontsize=7.8, color=INK_M, zorder=4)
    # 왼쪽 라벨
    if left_l:
        ax.text(0.25, yc, left_l, ha='left', va='center',
                fontsize=8, color=INK_M, zorder=4)
    # 오른쪽 라벨
    if right_l:
        ax.text(10.9, yc, right_l, ha='left', va='center',
                fontsize=8, color=INK_M, zorder=4)

# --- 오른쪽: 수익 타임라인 ---
ax.text(13.5, 8.8, '수익화 타임라인', ha='center', fontsize=11,
        fontweight='bold', color=FOREST)

timeline = [
    (8.0,  '즉시',   '도서 어필리에이트\n(쿠팡파트너스 · 알라딘)',     FOREST_LL),
    (6.55, '6개월',  '프리미엄 구독 시작\n월 4,900원 · 목표 50명',     YELLOW),
    (5.35, '12개월', 'B2B 출판사 리포트\n저자 대시보드 제공',           BLUE),
    (4.15, '18개월', 'AI 큐레이션 구독\n인용문 API 라이선스',           '#9C27B0'),
]

for ty, tmonth, tdesc, tclr in timeline:
    ax.plot(13.5, ty, 'o', color=tclr, markersize=12, zorder=5)
    ax.text(13.5, ty, tmonth, ha='center', va='center',
            fontsize=7, color='white', fontweight='bold', zorder=6)
    ax.text(14.1, ty, tdesc, ha='left', va='center',
            fontsize=8.5, color=INK, zorder=6)

# 타임라인 연결선
for i in range(len(timeline) - 1):
    y1 = timeline[i][0] - 0.35
    y2 = timeline[i+1][0] + 0.35
    ax.plot([13.5, 13.5], [y1, y2], color=BORDER, lw=1.5, zorder=4)

# --- KPI 박스 ---
kpi_box = FancyBboxPatch((11.0, 1.2), 4.7, 2.5,
                         boxstyle='round,pad=0.1',
                         facecolor='white', edgecolor=BORDER, linewidth=1.5, zorder=3)
ax.add_patch(kpi_box)
ax.text(13.35, 3.45, 'KPI 목표', ha='center', fontsize=9, fontweight='bold',
        color=FOREST, zorder=4)
kpis = [
    ('MAU',     '1,000명',  '5,000명'),
    ('밑줄 수', '30,000건', '150,000건'),
    ('유료 구독', '50명',   '400명'),
]
for ki, (label, v6, v12) in enumerate(kpis):
    ky = 3.05 - ki * 0.55
    ax.text(11.3, ky, label, va='center', fontsize=8.5, color=INK_M, zorder=4)
    ax.text(13.0, ky, v6,  va='center', ha='center', fontsize=8.5,
            color=FOREST, fontweight='bold', zorder=4)
    ax.text(14.7, ky, v12, va='center', ha='center', fontsize=8.5,
            color=BLUE, fontweight='bold', zorder=4)
ax.text(13.0, 1.55, '6개월', ha='center', fontsize=7.5, color=INK_M, zorder=4)
ax.text(14.7, 1.55, '12개월', ha='center', fontsize=7.5, color=INK_M, zorder=4)

plt.tight_layout(pad=0.5)
plt.savefig(os.path.join(OUT, 'diagram_funnel.png'), dpi=200,
            bbox_inches='tight', facecolor=CREAM)
plt.close()
print('OK 3/3 funnel')
print('Saved to:', OUT)
