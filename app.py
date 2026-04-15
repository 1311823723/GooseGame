import datetime
import os

import pandas as pd
import streamlit as st


# 获取当天的日期字符串 (例如: 2026-04-15)
today_str = datetime.datetime.now().strftime("%Y-%m-%d")

# 动态配置页面标题
st.set_page_config(page_title="鹅鸭杀组队", layout="wide")
st.title(f"🦆 鹅鸭杀时间统计助手 ({today_str} 专场)")

# 预设时间节点
TIME_NODES = [
    "20:00",
    "20:30",
    "21:00",
    "21:30",
    "22:00",
    "22:30",
    "23:00",
    "23:30",
    "24:00",
]

# 每天自动生成/读取当天的独立 CSV 文件
DB_FILE = f"attendance_{today_str}.csv"

if not os.path.exists(DB_FILE):
    df = pd.DataFrame(columns=["姓名", "加入时间", "离开时间"])
    df.to_csv(DB_FILE, index=False)

data = pd.read_csv(DB_FILE)

# --- 左侧：群友输入表单 ---
with st.sidebar:
    st.header("📝 我要上车")
    name = st.text_input("你的名字", placeholder="请输入群昵称")

    join_time = st.selectbox("几点加入？", TIME_NODES, index=0)
    leave_time = st.selectbox("几点离开？", TIME_NODES, index=len(TIME_NODES) - 1)

    if st.button("提交/更新"):
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
            st.success(f"同步成功，{name}！")
            st.rerun()

# --- 核心后端逻辑：计算时间切片 ---
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

# --- 右侧：数据可视化大屏 ---
st.header("📊 实时发车大盘")

if not data.empty:
    chart_df = pd.DataFrame({"时间段": list(slot_counts.keys()), "在线人数": list(slot_counts.values())})
    st.bar_chart(chart_df.set_index("时间段"))

    col1, col2 = st.columns(2)
    with col1:
        st.subheader("👥 上车记录")
        st.dataframe(data, use_container_width=True, hide_index=True)

    with col2:
        st.subheader("🔍 精确查岗")
        target_time = st.selectbox("选择具体时间看谁在线：", time_slots)
        players_here = slot_players[target_time]

        if players_here:
            st.success(f"**{target_time}** 共有 **{len(players_here)}** 人：")
            for p in players_here:
                st.write(f"🦆 {p}")
        else:
            st.warning(f"**{target_time}** 还没人，快去摇人！")
else:
    st.info("目前还没有人报名，快去侧边栏填写成为第一只鹅吧！")

if st.button("🔄 刷新数据"):
    st.rerun()

