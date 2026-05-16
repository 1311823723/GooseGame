import altair as alt
import pandas as pd
import streamlit as st

from db_utils import fetch_match_records
from ui_utils import (
    BRAND_COLORS, FACTION_COLORS,
    apply_base_styles, render_bar_row, render_empty_state, render_page_card, render_record_row, render_section_divider,
    render_section_title, render_stat_card,
)


st.set_page_config(page_title="数据大厅", layout="centered")
apply_base_styles()
render_page_card(
    pill_text="战绩统计",
    title_text="数据大厅",
    subtitle_text="查看阵营胜率、职业胜率榜，以及个人战绩明细。",
)

stored_records, load_error = fetch_match_records()
if load_error:
    st.error(f"读取数据库失败：{load_error}")
    st.stop()

if stored_records.empty:
    render_empty_state("还没有战绩数据", "请先去战绩管理页面导入结算截图。", "📊")
    st.stop()

stored_records["is_win"] = stored_records["is_win"].astype(bool)

# Date filter
dates = sorted(stored_records["date"].unique(), reverse=True)
date_options = ["全部"] + dates
selected_date = st.selectbox("筛选日期", date_options, label_visibility="collapsed")
active_records = stored_records if selected_date == "全部" else stored_records[stored_records["date"] == selected_date].copy()

if active_records.empty:
    st.info(f"{selected_date} 没有战绩数据。")
    st.stop()

# ==========================================
# 阵营胜率
# ==========================================
render_section_title("阵营胜率")

match_faction = (
    active_records.groupby(["match_id", "faction"], as_index=False)
    .agg(本局获胜=("is_win", "max"))
)
faction_summary = (
    match_faction.groupby("faction", as_index=False)
    .agg(
        对局数=("match_id", "nunique"),
        胜局数=("本局获胜", "sum"),
    )
)
faction_summary["胜率"] = (faction_summary["胜局数"] / faction_summary["对局数"]).round(4)

# Faction cards
for _, row in faction_summary.iterrows():
    faction = row["faction"]
    fc = FACTION_COLORS.get(faction, FACTION_COLORS["中立"])
    win_pct = f"{row['胜率']:.1%}"
    render_record_row(
        faction,
        f'{int(row["对局数"])} 局 · {int(row["胜局数"])} 胜',
        win_pct,
        fc["hex"],
        fc["emoji"],
    )

# Altair faction bar chart
chart = (
    alt.Chart(faction_summary)
    .mark_bar(cornerRadius=6)
    .encode(
        x=alt.X("faction:N", title=None, sort=None, axis=alt.Axis(labelAngle=0)),
        y=alt.Y("胜率:Q", title="胜率", axis=alt.Axis(format="%")),
        color=alt.Color(
            "faction:N",
            scale=alt.Scale(domain=["鹅", "鸭", "中立"], range=["#10B981", "#F43F5E", "#A78BFA"]),
            legend=None,
        ),
        tooltip=["faction", "胜率"],
    )
    .properties(height=220)
)
st.altair_chart(chart, use_container_width=True)

render_section_divider()

# ==========================================
# 职业胜率榜
# ==========================================
render_section_title("职业胜率榜")

role_summary = (
    active_records.groupby("role", as_index=False)
    .agg(
        出场总次数=("role", "size"),
        胜场数=("is_win", "sum"),
    )
)
role_summary["胜率"] = (role_summary["胜场数"] / role_summary["出场总次数"]).round(4)
role_summary = role_summary.sort_values(by=["胜率", "出场总次数"], ascending=[False, False]).reset_index(drop=True)

# Top 10 with horizontal bars
top_roles = role_summary.head(10)
for _, row in top_roles.iterrows():
    rate = row["胜率"]
    render_bar_row(
        str(row["role"]),
        float(rate),
        f'({int(row["胜场数"])}/{int(row["出场总次数"])})',
        BRAND_COLORS["primary"],
    )

with st.expander("查看完整榜单", expanded=False):
    st.dataframe(role_summary, use_container_width=True, hide_index=True)

render_section_divider()

# ==========================================
# 个人战绩查询
# ==========================================
render_section_title("个人战绩查询")

player_names = sorted(active_records["player_name"].dropna().astype(str).unique().tolist())
selected_player = st.selectbox("选择玩家", player_names, label_visibility="collapsed")

player_records = active_records[active_records["player_name"] == selected_player].copy()
total_matches = int(len(player_records))
win_rate = round(float(player_records["is_win"].mean()), 4) if not player_records.empty else 0.0

mc1, mc2, mc3 = st.columns(3)
with mc1:
    render_stat_card("总参与局数", total_matches, BRAND_COLORS["accent"], "")
with mc2:
    rate_color = BRAND_COLORS["success"] if win_rate >= 0.5 else BRAND_COLORS["warning"]
    render_stat_card("总胜率", f"{win_rate:.1%}", rate_color, "")
with mc3:
    render_stat_card("使用职业", int(player_records["role"].nunique()), BRAND_COLORS["primary"], "")

player_role_summary = (
    player_records.groupby("role", as_index=False)
    .agg(
        出场=("role", "size"),
        胜场=("is_win", "sum"),
    )
)
if not player_role_summary.empty:
    player_role_summary["胜率"] = (
        player_role_summary["胜场"] / player_role_summary["出场"] * 100
    ).round(1)
    player_role_summary = player_role_summary.sort_values(
        by=["胜率", "出场"], ascending=[False, False]
    )

st.dataframe(
    player_role_summary,
    use_container_width=True,
    hide_index=True,
    column_config={
        "role": "职业",
        "出场": "出场",
        "胜场": "胜场",
        "胜率": st.column_config.NumberColumn("胜率", format="%.1f%%"),
    },
)

# Faction-level stats
player_faction = (
    player_records.groupby("faction", as_index=False)
    .agg(
        出场=("faction", "size"),
        胜场=("is_win", "sum"),
    )
)
if not player_faction.empty:
    player_faction["胜率"] = (player_faction["胜场"] / player_faction["出场"] * 100).round(1)
    cols = st.columns(len(player_faction))
    for i, (_, row) in enumerate(player_faction.iterrows()):
        fc = FACTION_COLORS.get(row["faction"], FACTION_COLORS["中立"])
        with cols[i]:
            render_stat_card(
                f"{row['faction']} — {int(row['出场'])}场{int(row['胜场'])}胜",
                f"{row['胜率']:.1f}%",
                fc["hex"],
                fc["emoji"],
            )

render_section_divider()

# ==========================================
# 原始战绩
# ==========================================
render_section_title("原始战绩")
st.dataframe(
    active_records[["date", "match_id", "player_name", "faction", "role", "is_win"]],
    use_container_width=True,
    hide_index=True,
)
