import streamlit as st
import pandas as pd
import os
import datetime

# 获取当天的日期字符串
today_str = datetime.datetime.now().strftime("%Y-%m-%d")

# ⚠️ 核心 UI 优化：把 layout 改为 centered，在手机上居中显示效果更好
st.set_page_config(page_title="鹅鸭杀发车助手", layout="centered")
st.title(f"🦆 鹅鸭杀发车助手 ({today_str})")

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
    
    name = st.text_input("你的名字", placeholder="请输入群昵称")
    
    # 手机端排版优化：PC上同行显示，手机上会自动优雅地折叠成上下两排
    col1, col2 = st.columns(2)
    with col1:
        join_time = st.selectbox("几点加入？", TIME_NODES, index=0)
    with col2:
        leave_time = st.selectbox("几点离开？", TIME_NODES, index=len(TIME_NODES)-1)
    
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
            st.success(f"同步成功，{name}！请点击上方【📊 实时大盘】查看摇人情况。")
            st.rerun()

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

    if not data.empty:
        # 1. 柱状图
        chart_df = pd.DataFrame({
            "时间段": list(slot_counts.keys()),
            "在线人数": list(slot_counts.values())
        })
        st.bar_chart(chart_df.set_index("时间段"))

        # 2. 查岗模块
        st.markdown("###  精确查岗")
        target_time = st.selectbox("选择具体时间看谁在线：", time_slots)
        players_here = slot_players[target_time]
        
        if players_here:
            st.success(f"**{target_time}** 共有 **{len(players_here)}** 人：")
            for p in players_here:
                st.write(f"🦆 {p}")
        else:
            st.warning(f"**{target_time}** 还没人，快去摇人！")
            
        # 3. 原始记录
        st.markdown("###  上车记录")
        st.dataframe(data, use_container_width=True, hide_index=True)
        
    else:
        st.info("目前还没有人报名，快去隔壁填表成为第一只鹅吧！")

    if st.button("🔄 刷新大盘数据", use_container_width=True):
        st.rerun()