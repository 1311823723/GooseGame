import pandas as pd
import streamlit as st

from db_utils import fetch_match_image, fetch_match_records
from ui_utils import (
    BRAND_COLORS, FACTION_COLORS,
    apply_base_styles, render_empty_state, render_page_card, render_record_row, render_section_divider,
    render_section_title, render_stat_card,
)


st.set_page_config(page_title="对局明细", layout="centered")
apply_base_styles()
render_page_card(
    pill_text="每局回顾",
    title_text="对局明细",
    subtitle_text="按局查看每场对局的人员、身份与胜负。",
)

stored_records, load_error = fetch_match_records()
if load_error:
    st.error(f"读取数据库失败：{load_error}")
    st.stop()

if stored_records.empty:
    render_empty_state("还没有战绩数据", "导入结算截图后，就可以按对局复盘身份和胜负。", "🪿")
    st.stop()

stored_records["is_win"] = stored_records["is_win"].astype(bool)

match_ids = sorted(stored_records["match_id"].unique(), reverse=True)

# Build match info for display labels
match_info = {}
for mid in match_ids:
    m = stored_records[stored_records["match_id"] == mid]
    winners = m[m["is_win"] == True]
    match_info[mid] = {
        "date": m["date"].iloc[0],
        "winners": "、".join(winners["player_name"].tolist()),
        "factions": "、".join(sorted(winners["faction"].unique())),
    }

dates = sorted(set(info["date"] for info in match_info.values()), reverse=True)

st.markdown(
    f'<p style="opacity:0.6;font-size:0.85rem;margin-bottom:0.25rem;">共 <strong>{len(match_ids)}</strong> 场对局</p>',
    unsafe_allow_html=True,
)
selected_date = st.selectbox("选择日期", dates, label_visibility="collapsed")

date_match_ids = [mid for mid in match_ids if match_info[mid]["date"] == selected_date]
selected_match = st.selectbox(
    "选择对局",
    date_match_ids,
    format_func=lambda mid: f"{match_info[mid]['factions']} 胜 · {match_info[mid]['winners']}",
    label_visibility="collapsed",
)

match_data = stored_records[stored_records["match_id"] == selected_match].copy()

# Match screenshot
with st.spinner("加载截图…"):
    match_image = fetch_match_image(selected_match)
if match_image:
    st.image(match_image, caption="对局结算截图", use_container_width=True)
else:
    st.caption("本局暂无结算截图（只对新导入的对局有效）")

# ==========================================
# Winners
# ==========================================
render_section_title("获胜者")

winners = match_data[match_data["is_win"] == True]
if not winners.empty:
    for _, row in winners.iterrows():
        faction = row["faction"]
        fc = FACTION_COLORS.get(faction, FACTION_COLORS["中立"])
        render_record_row(
            row["player_name"],
            f'{faction} · {row["role"]}',
            "WIN",
            fc["hex"],
            fc["emoji"],
        )
else:
    st.caption("无获胜者数据")

# ==========================================
# Losers
# ==========================================
render_section_title("其他玩家")

losers = match_data[match_data["is_win"] == False]
if not losers.empty:
    for _, row in losers.iterrows():
        faction = row["faction"]
        fc = FACTION_COLORS.get(faction, FACTION_COLORS["中立"])
        render_record_row(
            row["player_name"],
            f'{faction} · {row["role"]}',
            "LOSE",
            fc["hex"],
            fc["emoji"],
        )
else:
    st.caption("无其他玩家数据")

# ==========================================
# Match overview stats
# ==========================================
render_section_divider()
render_section_title("本局总览")

total = len(match_data)
geese = int((match_data["faction"] == "鹅").sum())
ducks = int((match_data["faction"] == "鸭").sum())
neutrals = int((match_data["faction"] == "中立").sum())

cols = st.columns(4)
with cols[0]:
    render_stat_card("总人数", total, "#94A3B8", "")
with cols[1]:
    render_stat_card("鹅阵营", geese, FACTION_COLORS["鹅"]["hex"], "")
with cols[2]:
    render_stat_card("鸭阵营", ducks, FACTION_COLORS["鸭"]["hex"], "")
with cols[3]:
    render_stat_card("中立阵营", neutrals, FACTION_COLORS["中立"]["hex"], "")

with st.expander("完整数据", expanded=False):
    st.dataframe(
        match_data[["player_name", "faction", "role", "is_win"]],
        use_container_width=True,
        hide_index=True,
    )

# ==========================================
# All matches overview
# ==========================================
render_section_divider()
render_section_title("全部对局总览")

match_overview_rows = []
for mid in match_ids:
    m = stored_records[stored_records["match_id"] == mid]
    match_date = m["date"].iloc[0]
    total_players = len(m)
    winners = m[m["is_win"] == True]
    winner_names = ", ".join(winners["player_name"].tolist())
    winner_factions = ", ".join(sorted(winners["faction"].unique()))
    match_overview_rows.append({
        "日期": match_date,
        "人数": total_players,
        "胜者": winner_names,
        "胜方阵营": winner_factions,
    })

# Recent 10 as cards
recent = match_overview_rows[:10]
for match in recent:
    render_record_row(
        match["日期"],
        f'{match["人数"]} 人',
        match["胜方阵营"],
        BRAND_COLORS["accent"],
        "",
        match["胜者"],
    )

if len(match_overview_rows) > 10:
    with st.expander(f"查看全部 {len(match_overview_rows)} 场对局", expanded=False):
        st.dataframe(pd.DataFrame(match_overview_rows), use_container_width=True, hide_index=True)
