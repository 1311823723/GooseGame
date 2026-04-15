# GooseGame - 鹅鸭杀组队时间统计助手

一个简单的 Streamlit 小工具：群友填写加入/离开时间后，右侧实时展示各时间段在线人数，并支持按具体时间段查看在线名单。数据会按“当天日期”写入独立的 CSV 文件（例如 `attendance_2026-04-15.csv`）。

## 运行

建议使用虚拟环境。

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
streamlit run app.py
```

## 说明

- `app.py`: 主程序
- `attendance_YYYY-MM-DD.csv`: 当天报名数据（已在 `.gitignore` 中忽略）

