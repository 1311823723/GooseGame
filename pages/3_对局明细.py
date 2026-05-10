import pandas as pd
import streamlit as st

from db_utils import fetch_match_image, fetch_match_records
from ui_utils import (
    BRAND_COLORS, FACTION_COLORS,
    apply_base_styles, render_page_card, render_section_divider,
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
    st.markdown(
        '<div style="text-align:center;padding:3rem 1rem;">'
        '<div style="font-size:4rem;">🪿</div>'
        '<p style="color:#94A3B8;margin-top:1rem;">还没有战绩数据。</p>'
        '</div>',
        unsafe_allow_html=True,
    )
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
match_image = fetch_match_image(selected_match)
if match_image:
    st.image(match_image, caption="对局结算截图", use_container_width=True)

# ==========================================
# Winners
# ==========================================
render_section_title("获胜者")

winners = match_data[match_data["is_win"] == True]
if not winners.empty:
    for _, row in winners.iterrows():
        faction = row["faction"]
        fc = FACTION_COLORS.get(faction, FACTION_COLORS["中立"])
        st.markdown(
            f'<div class="gg-card gg-card-goose" style="padding:10px 18px;margin:0.3rem 0;display:flex;align-items:center;gap:0.75rem;">'
            f'<span style="font-size:1.5rem;">{fc["emoji"]}</span>'
            f'<span style="font-weight:700;font-size:1.05rem;">{row["player_name"]}</span>'
            f'<span class="gg-pill-win">WIN</span>'
            f'<span style="margin-left:auto;opacity:0.65;font-size:0.85rem;">{faction} · {row["role"]}</span>'
            f'</div>',
            unsafe_allow_html=True,
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
        st.markdown(
            f'<div class="gg-card" style="padding:10px 18px;margin:0.3rem 0;display:flex;align-items:center;gap:0.75rem;opacity:0.88;">'
            f'<span style="font-size:1.5rem;">{fc["emoji"]}</span>'
            f'<span style="font-weight:700;font-size:1.05rem;">{row["player_name"]}</span>'
            f'<span class="gg-pill-lose">LOSE</span>'
            f'<span style="margin-left:auto;opacity:0.65;font-size:0.85rem;">{faction} · {row["role"]}</span>'
            f'</div>',
            unsafe_allow_html=True,
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
    st.markdown(
        f'<div class="gg-card" style="padding:10px 18px;margin:0.3rem 0;display:flex;align-items:center;gap:0.75rem;">'
        f'<span style="font-weight:600;color:#06B6D4;min-width:6.5rem;">{match["日期"]}</span>'
        f'<span style="opacity:0.55;font-size:0.85rem;">{match["人数"]}人</span>'
        f'<span class="gg-pill-goose" style="font-size:0.75rem;">{match["胜方阵营"]}</span>'
        f'<span style="flex:1;text-align:right;font-size:0.85rem;opacity:0.85;">{match["胜者"]}</span>'
        f'</div>',
        unsafe_allow_html=True,
    )

if len(match_overview_rows) > 10:
    with st.expander(f"查看全部 {len(match_overview_rows)} 场对局", expanded=False):
        st.dataframe(pd.DataFrame(match_overview_rows), use_container_width=True, hide_index=True)
