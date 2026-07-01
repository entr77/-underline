"""
사업계획서용 다이어그램 4 — 성과 목표 KPI 성장 그래프
현재 → 6개월 → 12개월 소형 멀티플 바 차트 4종
"""
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch
import os

OUT = r'd:\dev\underline\.tmp\diagrams'
os.makedirs(OUT, exist_ok=True)

FOREST   = '#1E3A2F'
FOREST_L = '#2D5A3D'
CREAM    = '#F7F3EE'
INK      = '#1C1917'
INK_M    = '#6B6560'
YELLOW   = '#D4A017'
BLUE     = '#4A90D9'
BORDER   = '#E4DDD6'

plt.rcParams['font.family'] = ['Malgun Gothic', 'NanumGothic', 'Arial Unicode MS', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False

panels = [
    ('MAU', ['현재', '6개월', '12개월'], [50, 1000, 5000], '명', FOREST_L),
    ('누적 밑줄 수', ['현재', '6개월', '12개월'], [6227, 30000, 150000], '건', BLUE),
    ('유료 구독자', ['현재', '6개월', '12개월'], [0, 50, 400], '명', YELLOW),
    ('월 수익', ['현재', '6개월', '12개월'], [0, 245000, 1960000], '원', '#9C27B0'),
]

fig, axes = plt.subplots(1, 4, figsize=(16, 4.6))
fig.patch.set_facecolor(CREAM)
fig.suptitle('성과 목표 — 현재 대비 6개월 · 12개월 성장 목표', fontsize=14, fontweight='bold', color=FOREST, y=1.04)

for ax, (title, labels, values, unit, color) in zip(axes, panels):
    ax.set_facecolor(CREAM)
    bars = ax.bar(labels, values, color=[BORDER if v == values[0] else color for v in values],
                   edgecolor=color, linewidth=1.3, width=0.6, zorder=3)
    # 현재 막대는 옅은 색, 목표 막대는 브랜드색으로 강조
    bars[0].set_edgecolor(INK_M)
    bars[0].set_facecolor('#E4DDD6')

    for rect, v in zip(bars, values):
        if unit == '원' and v >= 10000:
            man = v / 10000
            label = f'{man:.0f}만원' if man == int(man) else f'{man:.1f}만원'
        else:
            label = f'{v:,}{unit}'
        ax.text(rect.get_x() + rect.get_width()/2, rect.get_height(),
                label, ha='center', va='bottom', fontsize=8.5, fontweight='bold', color=INK, zorder=4)

    growth = f'×{round(values[-1]/values[0])}' if values[0] else '신규'
    ax.text(0.5, 0.92, f'12개월 {growth}', transform=ax.transAxes, ha='center',
            fontsize=8.5, color=color, fontweight='bold')

    ax.set_title(title, fontsize=11, fontweight='bold', color=INK, pad=18)
    ax.set_ylim(0, max(values) * 1.28)
    ax.set_yticks([])
    for spine in ['top', 'right', 'left']:
        ax.spines[spine].set_visible(False)
    ax.spines['bottom'].set_color(BORDER)
    ax.tick_params(axis='x', colors=INK_M, labelsize=9)

plt.tight_layout(rect=[0, 0, 1, 0.94])
plt.savefig(os.path.join(OUT, 'diagram_kpi.png'), dpi=200, bbox_inches='tight', facecolor=CREAM)
plt.close()
print('OK 4/4 kpi growth chart')
