import datetime
from pathlib import Path

import pandas as pd


time_nodes = ["20:00", "20:30", "21:00", "21:30", "22:00", "22:30", "23:00", "23:30", "24:00"]
attendance_columns = ["姓名", "加入时间", "离开时间"]
base_dir = Path(__file__).resolve().parent


def get_today_str() -> str:
    return datetime.datetime.now().strftime("%Y-%m-%d")


def get_attendance_file(date_str: str | None = None) -> Path:
    current_date = date_str or get_today_str()
    return base_dir / f"attendance_{current_date}.csv"


def ensure_attendance_file(date_str: str | None = None) -> Path:
    attendance_file = get_attendance_file(date_str)
    if not attendance_file.exists():
        pd.DataFrame(columns=attendance_columns).to_csv(attendance_file, index=False)
    return attendance_file


def load_attendance(date_str: str | None = None) -> pd.DataFrame:
    attendance_file = ensure_attendance_file(date_str)
    return pd.read_csv(attendance_file)


def save_attendance_record(name: str, join_time: str, leave_time: str, date_str: str | None = None) -> None:
    attendance_file = ensure_attendance_file(date_str)
    data = pd.read_csv(attendance_file)
    new_row = pd.DataFrame([
        {"姓名": name, "加入时间": join_time, "离开时间": leave_time}
    ])
    if name in data["姓名"].values:
        data = data[data["姓名"] != name]
    data = pd.concat([data, new_row], ignore_index=True)
    data.to_csv(attendance_file, index=False)


def build_attendance_summary(data: pd.DataFrame) -> tuple[dict, dict, list[str]]:
    time_slots = time_nodes[:-1]
    slot_counts = {slot: 0 for slot in time_slots}
    slot_players = {slot: [] for slot in time_slots}

    if not data.empty:
        for _, row in data.iterrows():
            player_name = row["姓名"]
            join_time = row["加入时间"]
            leave_time = row["离开时间"]
            join_index = time_nodes.index(join_time)
            leave_index = time_nodes.index(leave_time)
            for index in range(join_index, leave_index):
                current_slot = time_nodes[index]
                slot_counts[current_slot] += 1
                slot_players[current_slot].append(player_name)

    return slot_counts, slot_players, time_slots
