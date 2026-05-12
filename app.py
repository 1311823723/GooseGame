import pandas as pd
import streamlit as st

from attendance_utils import build_attendance_summary, get_today_str, load_attendance, save_attendance_record, time_nodes
from ui_utils import (
    apply_base_styles,
    render_empty_state,
    render_live_indicator,
    render_page_card,
    render_player_tag,
    render_section_divider,
    render_section_title,
    render_stat_card,
)


today_str = get_today_str()

st.set_page_config(page_title="鹅鸭杀发车助手", layout="centered")
apply_base_styles()
render_page_card(
    pill_text=f"今日专场 · {today_str}",
    title_text="鹅鸭杀发车助手",
    subtitle_text="填上你的上线区间，实时统计每半小时在线人数；查岗可以精确看到某一时段谁在。",
)

data = load_attendance()

tab1, tab2 = st.tabs(["📝 登记上车", "📊 实时大盘"])

# ==========================================
# Tab 1: 登记上车
# ==========================================
with tab1:
    render_section_title("今晚几点战？")

    with st.container(border=True):
        st.caption("登记你的可用时间，系统会自动覆盖同名旧记录。")
        name = st.text_input("你的名字", placeholder="请输入群昵称", label_visibility="collapsed")
        col1, col2 = st.columns(2)
        with col1:
            join_time = st.selectbox("几点加入？", time_nodes, index=0)
        with col2:
            leave_time = st.selectbox("几点离开？", time_nodes, index=len(time_nodes) - 1)

        if st.button("确认发车 / 更新时间", use_container_width=True, type="primary"):
            if not name:
                st.error("请输入名字！")
            elif time_nodes.index(join_time) >= time_nodes.index(leave_time):
                st.error("离开时间必须晚于加入时间！")
            else:
                save_attendance_record(name, join_time, leave_time)
                st.success(f"同步成功，{name}！去实时大盘看看哪个时段最缺人。")
                st.rerun()

    st.markdown(
        '<p style="font-size:0.8rem;opacity:0.55;margin-top:0.5rem;text-align:center;">'
        '想改时间？用同一个名字再次提交会自动覆盖</p>',
        unsafe_allow_html=True,
    )

# ==========================================
# Tab 2: 实时大盘
# ==========================================
with tab2:
    slot_counts, slot_players, time_slots = build_attendance_summary(data)

    dash_overview, dash_rollcall, dash_records = st.tabs(["📈 概览", "🔍 查岗", "👥 记录"])

    if not data.empty:
        peak = max(slot_counts.values()) if slot_counts else 0
        hottest_slots = [t for t, c in slot_counts.items() if c == peak and peak > 0]
        hottest_text = "、".join(hottest_slots) if hottest_slots else "暂无"

        with dash_overview:
            render_live_indicator("实时更新中")

            c1, c2, c3 = st.columns(3)
            with c1:
                render_stat_card("已登记人数", int(data["姓名"].nunique()), "#10B981", "")
            with c2:
                render_stat_card("峰值在线", int(peak), "#06B6D4", "")
            with c3:
                render_stat_card("最热时段", hottest_text, "#F59E0B", "")

            st.markdown("")
            chart_df = pd.DataFrame({"时间段": list(slot_counts.keys()), "在线人数": list(slot_counts.values())})
            st.bar_chart(chart_df.set_index("时间段"), color="#059669", height=280)

        with dash_rollcall:
            render_section_title("精确查岗")
            target_time = st.selectbox("选择具体时间看谁在线：", time_slots)
            players_here = slot_players[target_time]

            if players_here:
                st.success(f"{target_time} 共有 {len(players_here)} 人在线")
                cols = st.columns(min(len(players_here), 4))
                for i, p in enumerate(players_here):
                    with cols[i % 4]:
                        render_player_tag(p)
            else:
                st.warning(f"{target_time} 还没人，快去摇人！")

        with dash_records:
            render_section_title("上车记录")
            st.dataframe(data, use_container_width=True, hide_index=True)

    else:
        render_empty_state("目前还没有人报名", "去登记上车，成为今晚第一条在线记录。", "🪿")

    render_section_divider()
    if st.button("🔄 刷新大盘数据", use_container_width=True):
        st.rerun()
