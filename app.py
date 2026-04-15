import datetime
import os

import pandas as pd
import streamlit as st

# 获取当天的日期字符串
today_str = datetime.datetime.now().strftime("%Y-%m-%d")

st.set_page_config(page_title="鹅鸭杀发车助手", layout="centered")

st.markdown(
    """
<style>
/* --- Mobile-first spacing --- */
.block-container{padding-top:1.25rem;padding-bottom:1.5rem;max-width:980px;}
@media (max-width: 700px){
  .block-container{padding-left:1rem;padding-right:1rem;}
}

/* --- Hide Streamlit chrome --- */
#MainMenu {visibility: hidden;}
footer {visibility: hidden;}
header {visibility: hidden;}

/* --- Typography --- */
html, body, [class*="css"]  {font-size: 16px;}

/* --- Card look --- */
.gg-card{
  border: 1px solid rgba(255,255,255,0.10);
  border-radius: 16px;
  padding: 14px 16px;
  background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02));
  box-shadow: 0 10px 30px rgba(0,0,0,0.15);
}
.gg-title{
  font-size: 1.35rem;
  font-weight: 750;
  line-height: 1.25;
  margin: 0;
}
.gg-sub{
  margin: 0.35rem 0 0 0;
  opacity: 0.85;
  font-size: 0.95rem;
}
.gg-pill{
  display:inline-block;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 0.85rem;
  background: rgba(99, 102, 241, 0.18);
  border: 1px solid rgba(99, 102, 241, 0.35);
}

/* --- Buttons --- */
div.stButton > button{
  border-radius: 12px !important;
  padding: 0.6rem 0.9rem !important;
}

/* --- DataFrame tweak --- */
[data-testid="stDataFrame"]{
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.10);
}
</style>
""",
    unsafe_allow_html=True,
)

st.markdown(
    f"""
<div class="gg-card">
  <div class="gg-pill">今日专场 · {today_str}</div>
  <p class="gg-title">🦆 鹅鸭杀发车助手</p>
  <p class="gg-sub">填上你的上线区间，右侧实时统计每半小时在线人数；“查岗”可以精确看到某一时段谁在。</p>
</div>
""",
    unsafe_allow_html=True,
)

# 预设时间节点
TIME_NODES = ["20:00", "20:30", "21:00", "21:30", "22:00", "22:30", "23:00", "23:30", "24:00"]
DB_FILE = f"attendance_{today_str}.csv"

if not os.path.exists(DB_FILE):
    df = pd.DataFrame(columns=["姓名", "加入时间", "离开时间"])
    df.to_csv(DB_FILE, index=False)

data = pd.read_csv(DB_FILE)

# ==========================================
# 🚀 核心 UI 重构：使用 Tabs 将填写和查看分离，首屏直击核心动作
# ==========================================
tab1, tab2 = st.tabs(["📝 登记上车", "📊 实时大盘"])

# --- Tab 1: 默认首屏，用于填写 ---
with tab1:
    st.subheader("今晚几点战？")

    name = st.text_input("你的名字", placeholder="请输入群昵称", help="建议用群昵称，方便大家查岗。")
    
    # 手机端排版优化：PC上同行显示，手机上会自动优雅地折叠成上下两排
    col1, col2 = st.columns(2)
    with col1:
        join_time = st.selectbox("几点加入？", TIME_NODES, index=0, help="以半小时为单位。")
    with col2:
        leave_time = st.selectbox("几点离开？", TIME_NODES, index=len(TIME_NODES) - 1, help="离开必须晚于加入。")
    
    # 优化按钮：加入 type="primary" 变醒目，铺满全宽更适合大拇指点击
    if st.button(" 确认发车 / 更新时间", use_container_width=True, type="primary"):
        if not name:
            st.error("请输入名字！")
        elif TIME_NODES.index(join_time) >= TIME_NODES.index(leave_time):
            st.error("兄弟，离开时间必须晚于加入时间哦！")
        else:
            new_row = pd.DataFrame([{"姓名": name, "加入时间": join_time, "离开时间": leave_time}])
            
            if name in data["姓名"].values:
                data = data[data["姓名"] != name]
            
            data = pd.concat([data, new_row], ignore_index=True)
            data.to_csv(DB_FILE, index=False)
            st.success(f"同步成功，{name}！去【📊 实时大盘】看看哪个时段最缺人。")
            st.rerun()

    with st.expander("小提示", expanded=False):
        st.markdown(
            "- **想改时间**：用同一个名字再次提交会自动覆盖。\n"
            "- **想快速查人**：去【📊 实时大盘】→【🔍 查岗】选时间段。"
        )

# --- Tab 2: 数据展示面板 ---
with tab2:
    time_slots = TIME_NODES[:-1] 
    slot_counts = {slot: 0 for slot in time_slots}
    slot_players = {slot: [] for slot in time_slots}

    if not data.empty:
        for _, row in data.iterrows():
            p_name = row["姓名"]
            p_join = row["加入时间"]
            p_leave = row["离开时间"]
            
            join_idx = TIME_NODES.index(p_join)
            leave_idx = TIME_NODES.index(p_leave)
            
            for i in range(join_idx, leave_idx):
                current_slot = TIME_NODES[i]
                slot_counts[current_slot] += 1
                slot_players[current_slot].append(p_name)

    dash_overview, dash_rollcall, dash_records = st.tabs(["📈 概览", "🔍 查岗", "👥 记录"])

    if not data.empty:
        peak = max(slot_counts.values()) if slot_counts else 0
        hottest_slots = [t for t, c in slot_counts.items() if c == peak and peak > 0]
        hottest_text = "、".join(hottest_slots) if hottest_slots else "暂无"

        with dash_overview:
            c1, c2, c3 = st.columns(3)
            c1.metric("已登记人数", int(data["姓名"].nunique()))
            c2.metric("峰值在线人数", int(peak))
            c3.metric("最热时段", hottest_text)

            chart_df = pd.DataFrame({"时间段": list(slot_counts.keys()), "在线人数": list(slot_counts.values())})
            st.bar_chart(chart_df.set_index("时间段"))

        with dash_rollcall:
            st.subheader("精确查岗")
            target_time = st.selectbox("选择具体时间看谁在线：", time_slots)
            players_here = slot_players[target_time]

            if players_here:
                st.success(f"**{target_time}** 共有 **{len(players_here)}** 人：")
                for p in players_here:
                    st.write(f"🦆 {p}")
            else:
                st.warning(f"**{target_time}** 还没人，快去摇人！")

        with dash_records:
            st.subheader("上车记录")
            st.dataframe(data, use_container_width=True, hide_index=True)

    else:
        st.info("目前还没有人报名，快去【📝 登记上车】成为第一只鹅吧！")

    if st.button("🔄 刷新大盘数据", use_container_width=True):
        st.rerun()