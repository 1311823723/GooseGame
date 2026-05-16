import base64
import json
import os
from datetime import date
from uuid import uuid4

import pandas as pd
import streamlit as st
from PIL import Image

try:
    from openai import OpenAI
    openai_import_error = ""
except ImportError as exc:
    OpenAI = None
    openai_import_error = str(exc)

from db_utils import (
    delete_match_records, fetch_match_image, fetch_match_records,
    fix_existing_records, insert_match_images, insert_match_records,
    update_match_record,
)
from ui_utils import apply_base_styles, render_page_card, render_section_title, render_status_card

DASHSCOPE_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1"


vision_prompt = (
    "这是一张《鹅鸭杀》游戏结算截图。画面正中间下方是获胜玩家，上方一排是输掉的其他玩家。"
    "请结合鹅鸭杀游戏规则推断每个职业所属的阵营（鹅/鸭/中立），严格以 json 数组格式输出所有玩家信息。"
    "字段必须为：player_name(字符串), faction(字符串:鹅/鸭/中立), role(字符串:具体职业), is_win(布尔值:画面下方的获胜者为true，上方玩家为false)。"
    "所有的 json key 必须小写。只输出纯 json 数组，禁止输出 markdown 代码块或任何多余文字。"
    "\n职业名称必须从以下列表中选择，不允许使用其他名称："
    "\n鹅阵营：工程师, 侦探, 观鸟者, 锁匠, 保镖, 殡仪员, 通灵者, 冒险家, 加拿大鹅, 正义使者, 网红, 肉汁, 模仿鹅, 星界行者, 政治家, 复仇者, 警长, 说客, 跟踪者, 探测员, 验尸官, 清醒梦者, 科学家, 士兵, 生存主义者, 模仿者, 预言家, 恋人[鹅]"
    "\n鸭阵营：刺客, 专业杀手, 连环杀手, 雇佣杀手, 爆炸王, 身份窃贼, 告密者, 间谍, 派对鸭, 静语者, 丧葬者, 食鸟鸭, 变形者, 忍者, 隐形者, 寄生者, 走失小鸭, 巫医, 狙击手, 宿主, 恋人[鸭]"
    "\n中立阵营：渡鸦, 布谷鸟, 呆呆鸟, 决斗呆呆鸟, 秃鹫, 鸽子, 猎鹰, 鹈鹕"
)
required_keys = ["player_name", "faction", "role", "is_win"]
allowed_factions = ["鹅", "鸭", "中立"]


def get_api_key() -> str:
    return str(st.secrets.get("DASHSCOPE_API_KEY", os.getenv("DASHSCOPE_API_KEY", ""))).strip()


dashscope_api_key = get_api_key()
dashscope_client = None
if dashscope_api_key and OpenAI is not None:
    dashscope_client = OpenAI(api_key=dashscope_api_key, base_url=DASHSCOPE_BASE_URL)

st.set_page_config(page_title="战绩管理", layout="centered")
apply_base_styles()
render_page_card(
    pill_text="内部页面 · 战绩入库",
    title_text="战绩管理",
    subtitle_text="上传结算截图，由通义千问 VL 识别玩家阵营与职业，确认后存入数据库。",
)

# API status indicator
api_ok = bool(dashscope_api_key)
status_color = "#22C55E" if api_ok else "#F59E0B"
status_text = "已配置" if api_ok else "未配置"
render_status_card("DashScope API", status_text, "qwen3-vl-235b-a22b-thinking", status_color)

with st.expander("识别前准备", expanded=False):
    st.markdown("1. 安装依赖：`pip install -r requirements.txt`")
    st.markdown("2. 本地配置文件：`.streamlit/secrets.toml`")
    st.markdown("3. 写入 `DASHSCOPE_API_KEY = \"你的密钥\"`（[阿里云 DashScope](https://dashscope.console.aliyun.com/apiKey)）")
    st.markdown("4. 修改后刷新本页面再开始识别")

if OpenAI is None:
    st.warning(f"当前未安装 openai，截图识别暂时不可用：{openai_import_error}")

if "pending_match_records" not in st.session_state:
    st.session_state["pending_match_records"] = pd.DataFrame(
        columns=["match_id", "date", "player_name", "faction", "role", "is_win"]
    )
if "recognition_errors" not in st.session_state:
    st.session_state["recognition_errors"] = []
if "match_images" not in st.session_state:
    st.session_state["match_images"] = {}


def normalize_record(record: dict, match_id: str, match_date: str) -> dict:
    for key in required_keys:
        if key not in record:
            raise ValueError(f"缺少字段：{key}")

    player_name = str(record["player_name"]).strip()
    faction = str(record["faction"]).strip()
    role = str(record["role"]).strip()
    is_win = record["is_win"]

    if faction not in allowed_factions:
        raise ValueError(f"非法阵营：{faction}")
    if not isinstance(is_win, bool):
        raise ValueError("is_win 必须是布尔值")
    if not player_name or not role:
        raise ValueError("player_name 和 role 不能为空")

    return {
        "match_id": match_id,
        "date": match_date,
        "player_name": player_name,
        "faction": faction,
        "role": role,
        "is_win": is_win,
    }


def get_media_type(file_name: str) -> str:
    lower_name = file_name.lower()
    if lower_name.endswith(".png"):
        return "image/png"
    return "image/jpeg"


def _extract_json(text: str) -> str:
    """Strip markdown fences and surrounding noise from model output."""
    text = text.strip()
    # Remove leading ```json or ``` fences
    while text.startswith("```"):
        newline_idx = text.find("\n")
        text = text[newline_idx + 1:] if newline_idx != -1 else text[3:]
    # Remove trailing ``` fences
    if text.endswith("```"):
        text = text[:-3]
    return text.strip()


def recognize_match_image(uploaded_file, match_date: str) -> tuple[list[dict], str]:
    try:
        image_bytes = uploaded_file.getvalue()
        image_base64 = base64.b64encode(image_bytes).decode("utf-8")
        media_type = get_media_type(uploaded_file.name)
        match_id = f"{match_date}-{uuid4().hex[:12]}"

        response = dashscope_client.chat.completions.create(
            model="qwen3-vl-235b-a22b-thinking",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:{media_type};base64,{image_base64}"},
                        },
                        {"type": "text", "text": vision_prompt},
                    ],
                }
            ],
        )
        response_text = response.choices[0].message.content.strip()
    except Exception as exc:
        raise RuntimeError(f"识别失败：{uploaded_file.name} - {exc}") from exc

    try:
        parsed_result = json.loads(_extract_json(response_text))
    except json.JSONDecodeError as exc:
        raise ValueError(f"json 解析失败：{uploaded_file.name} - {exc}\n原始输出：{response_text}") from exc

    if not isinstance(parsed_result, list):
        raise ValueError(f"识别结果不是 json 数组：{uploaded_file.name}")

    normalized_records = []
    for record in parsed_result:
        if not isinstance(record, dict):
            raise ValueError(f"识别结果包含非对象项：{uploaded_file.name}")
        normalized_records.append(normalize_record(record, match_id, match_date))

    return normalized_records, response_text


# ==========================================
# Upload section
# ==========================================
render_section_title("上传对战截图")

with st.container(border=True):
    uploaded_files = st.file_uploader(
        "上传结算截图",
        type=["jpg", "jpeg", "png"],
        accept_multiple_files=True,
        label_visibility="collapsed",
    )
    match_date = st.date_input("选择对局日期", value=date.today()).strftime("%Y-%m-%d")

if st.button("开始识别", type="primary", use_container_width=True):
    if not uploaded_files:
        st.error("请先上传至少一张截图。")
    elif OpenAI is None:
        st.error("未安装 openai，请先执行 pip install -r requirements.txt。")
    elif not dashscope_client:
        st.error("未检测到 DASHSCOPE_API_KEY，请在 .streamlit/secrets.toml 中配置。")
    else:
        recognized_rows = []
        recognition_errors = []
        progress_bar = st.progress(0)

        for index, uploaded_file in enumerate(uploaded_files, start=1):
            try:
                Image.open(uploaded_file).verify()
                uploaded_file.seek(0)
                image_bytes = uploaded_file.getvalue()
                current_rows, _ = recognize_match_image(uploaded_file, match_date)
                recognized_rows.extend(current_rows)
                if current_rows:
                    mid = current_rows[0]["match_id"]
                    st.session_state["match_images"][mid] = image_bytes
            except Exception as exc:
                recognition_errors.append(str(exc))
            progress_bar.progress(index / len(uploaded_files))

        st.session_state["recognition_errors"] = recognition_errors
        if recognized_rows:
            st.session_state["pending_match_records"] = pd.DataFrame(recognized_rows)
            st.success(f"识别完成，共得到 {len(recognized_rows)} 条玩家记录。")
        else:
            st.session_state["pending_match_records"] = pd.DataFrame(
                columns=["match_id", "date", "player_name", "faction", "role", "is_win"]
            )
            st.warning("没有成功识别出可入库的数据。")

pending_match_records = st.session_state["pending_match_records"]
recognition_errors = st.session_state["recognition_errors"]

if recognition_errors:
    with st.expander("识别错误", expanded=False):
        for error_message in recognition_errors:
            st.error(error_message)

# ==========================================
# Edit & Save
# ==========================================
render_section_title("编辑识别结果")
st.caption("检查并修正 AI 识别的结果，确认无误后存入数据库。")

edited_match_records = st.data_editor(
    pending_match_records,
    use_container_width=True,
    num_rows="dynamic",
    column_config={
        "match_id": st.column_config.TextColumn("对局ID"),
        "date": st.column_config.TextColumn("日期"),
        "player_name": st.column_config.TextColumn("玩家"),
        "faction": st.column_config.SelectboxColumn("阵营", options=allowed_factions),
        "role": st.column_config.TextColumn("职业"),
        "is_win": st.column_config.CheckboxColumn("获胜"),
    },
    hide_index=True,
)

if st.button("存入数据库", use_container_width=True):
    if edited_match_records.empty:
        st.error("当前没有可存储的数据。")
    else:
        try:
            cleaned_records = []
            for record in edited_match_records.to_dict(orient="records"):
                cleaned_records.append(
                    normalize_record(
                        {
                            "player_name": record.get("player_name", ""),
                            "faction": record.get("faction", ""),
                            "role": record.get("role", ""),
                            "is_win": bool(record.get("is_win", False)),
                        },
                        str(record.get("match_id", "")).strip(),
                        str(record.get("date", "")).strip(),
                    )
                )

            if any(not record["match_id"] or not record["date"] for record in cleaned_records):
                raise ValueError("match_id 和 date 不能为空")

            ok, error_message = insert_match_records(cleaned_records)
            if not ok:
                st.error(f"存入数据库失败：{error_message}")
            else:
                # Save match screenshots
                images_to_save = st.session_state.get("match_images", {})
                img_saved = 0
                if images_to_save:
                    img_ok, img_err = insert_match_images(images_to_save)
                    if img_ok:
                        img_saved = len(images_to_save)
                    else:
                        st.warning(f"截图保存失败：{img_err}")
                msg = f"已成功写入 {len(cleaned_records)} 条记录"
                if img_saved:
                    msg += f"，保存 {img_saved} 张截图"
                st.success(msg + "。")
                st.session_state["pending_match_records"] = pd.DataFrame(
                    columns=["match_id", "date", "player_name", "faction", "role", "is_win"]
                )
                st.session_state["recognition_errors"] = []
                st.session_state["match_images"] = {}
                st.rerun()
        except Exception as exc:
            st.error(f"数据校验失败：{exc}")

# ==========================================
# Stored records
# ==========================================
stored_records, load_error = fetch_match_records()
if load_error:
    st.error(f"读取数据库失败：{load_error}")
elif stored_records.empty:
    st.info("数据库里还没有战绩记录。")
else:
    st.markdown(
        f'<p class="gg-section-title">已存战绩 <span class="gg-pill">{len(stored_records)} 条</span></p>',
        unsafe_allow_html=True,
    )

    # Screenshot preview
    match_ids_for_images = sorted(stored_records["match_id"].unique())
    preview_id = st.selectbox(
        "选择对局查看原图",
        ["—"] + match_ids_for_images,
        label_visibility="collapsed",
    )
    if preview_id != "—":
        img = fetch_match_image(preview_id)
        if img:
            st.image(img, caption=f"{preview_id}", use_container_width=True)
        else:
            st.caption("该对局暂无截图")

    edited_df = st.data_editor(
        stored_records,
        use_container_width=True,
        num_rows="dynamic",
        column_config={
            "id": st.column_config.NumberColumn("ID", disabled=True),
            "match_id": st.column_config.TextColumn("对局ID"),
            "date": st.column_config.TextColumn("日期"),
            "player_name": st.column_config.TextColumn("玩家"),
            "faction": st.column_config.SelectboxColumn("阵营", options=allowed_factions),
            "role": st.column_config.TextColumn("职业"),
            "is_win": st.column_config.CheckboxColumn("获胜"),
        },
        hide_index=True,
    )

    col_save, col_del, col_fix = st.columns(3)
    with col_save:
        if st.button("保存修改", use_container_width=True, type="primary"):
            errors = []
            for _, row in edited_df.iterrows():
                try:
                    rid = int(row["id"]) if pd.notna(row.get("id")) else None
                    mid = str(row.get("match_id", "")).strip()
                    dt = str(row.get("date", "")).strip()
                    name = str(row.get("player_name", "")).strip()
                    faction = str(row.get("faction", "")).strip()
                    role = str(row.get("role", "")).strip()
                    is_win = bool(row.get("is_win", False))
                    if not name or not mid or not dt:
                        continue
                    if rid and rid > 0:
                        ok, err = update_match_record(rid, mid, dt, name, faction, role, is_win)
                    else:
                        ok, err = insert_match_records([{
                            "match_id": mid, "date": dt, "player_name": name,
                            "faction": faction, "role": role, "is_win": is_win,
                        }])
                    if not ok:
                        errors.append(err)
                except Exception as exc:
                    errors.append(str(exc))
            if errors:
                st.error(f"保存出错：{'; '.join(errors)}")
            else:
                st.success(f"已保存 {len(edited_df)} 条记录。")
                st.rerun()
    with col_del:
        selected_ids = st.multiselect("选择要删除的 id", edited_df["id"].dropna().astype(int).tolist(), label_visibility="collapsed")
    with col_fix:
        if st.button("删除选中", use_container_width=True):
            if selected_ids:
                ok, error_message = delete_match_records(selected_ids)
                if not ok:
                    st.error(f"删除失败：{error_message}")
                else:
                    st.success(f"已删除 {len(selected_ids)} 条记录。")
                    st.rerun()

    if st.button("根据映射表修正", use_container_width=True, help="根据 role_faction_map.json 批量修正已有记录的阵营和职业名"):
        changes = fix_existing_records()
        if changes:
            for msg in changes:
                st.success(msg)
            st.rerun()
        else:
            st.info("所有记录已符合映射表，无需修正。")
