import base64
import json
import os
import sqlite3
import urllib.request
from pathlib import Path

import pandas as pd


db_path = Path(__file__).resolve().parent / "match_records.sqlite3"
_mapping_path = Path(__file__).resolve().parent / "role_faction_map.json"

_turso_url = os.environ.get("TURSO_DATABASE_URL", "")
_turso_token = os.environ.get("TURSO_AUTH_TOKEN", "")
_secrets_loaded = False


def _ensure_streamlit_secrets():
    global _secrets_loaded, _turso_url, _turso_token
    if _secrets_loaded:
        return
    _secrets_loaded = True
    try:
        import streamlit as st
        url = str(st.secrets.get("TURSO_DATABASE_URL", "")).strip()
        token = str(st.secrets.get("TURSO_AUTH_TOKEN", "")).strip()
        if url:
            os.environ["TURSO_DATABASE_URL"] = url
            _turso_url = url
        if token:
            os.environ["TURSO_AUTH_TOKEN"] = token
            _turso_token = token
    except Exception:
        pass


class TursoCursor:
    def __init__(self, cols, rows, affected_row_count):
        self.description = [(c["name"],) for c in cols] if cols else []
        self._rows = []
        for row in rows or []:
            self._rows.append(tuple(
                int(v["value"]) if v.get("type") == "integer" else
                float(v["value"]) if v.get("type") == "float" else
                str(v.get("value", "")) if v.get("value") is not None else None
                for v in row
            ))
        self.rowcount = affected_row_count

    def fetchone(self):
        return self._rows[0] if self._rows else None

    def fetchall(self):
        return self._rows


def _turso_arg(value):
    if value is None:
        return {"type": "null"}
    if isinstance(value, bool):
        return {"type": "integer", "value": "1" if value else "0"}
    if isinstance(value, int):
        return {"type": "integer", "value": str(value)}
    if isinstance(value, float):
        return {"type": "float", "value": value}
    if isinstance(value, bytes):
        return {"type": "blob", "value": base64.b64encode(value).decode()}
    return {"type": "text", "value": str(value)}


class TursoConnection:
    def __init__(self, url, token):
        self._hostname = url.replace("libsql://", "")
        self._endpoint = f"https://{self._hostname}"
        self._token = token
        self._requests = []

    def _send(self, requests):
        body = json.dumps({"requests": requests + [{"type": "close"}]}).encode()
        req = urllib.request.Request(self._endpoint + "/v2/pipeline", data=body)
        req.add_header("Authorization", f"Bearer {self._token}")
        req.add_header("Content-Type", "application/json")
        try:
            with urllib.request.urlopen(req) as resp:
                return json.loads(resp.read())
        except urllib.error.HTTPError as e:
            raise RuntimeError(f"Turso API error: {e.code} {e.read().decode()}")

    def _parse_result(self, result_entry):
        response = result_entry.get("response", {})
        r = response.get("result", {})
        return TursoCursor(
            r.get("cols", []),
            r.get("rows", []),
            r.get("affected_row_count", 0),
        )

    def execute(self, sql, params=None):
        stmt = {"sql": sql}
        if params:
            stmt["args"] = [_turso_arg(p) for p in params]
        resp = self._send([{"type": "execute", "stmt": stmt}])
        results = resp.get("results", [])
        if results and results[0].get("type") == "ok":
            return self._parse_result(results[0])
        return TursoCursor([], [], 0)

    def executemany(self, sql, records):
        pipeline = []
        for record in records:
            pipeline.append({
                "type": "execute",
                "stmt": {"sql": sql, "args": [_turso_arg(v) for v in record]},
            })
        resp = self._send(pipeline)
        results = resp.get("results", [])
        return self._parse_result(results[0]) if results else TursoCursor([], [], 0)

    def commit(self):
        pass

    def close(self):
        pass

    def __enter__(self):
        return self

    def __exit__(self, *args):
        pass


def get_conn():
    _ensure_streamlit_secrets()
    url = os.environ.get("TURSO_DATABASE_URL", "")
    token = os.environ.get("TURSO_AUTH_TOKEN", "")
    if url and token:
        return TursoConnection(url, token)
    return sqlite3.connect(db_path)


def load_role_mapping() -> dict:
    if _mapping_path.exists():
        with open(_mapping_path, "r", encoding="utf-8") as fh:
            return json.load(fh)
    return {}


def apply_role_mapping(records: list[dict]) -> list[dict]:
    mapping = load_role_mapping()
    faction_map = mapping.get("faction_map", {})
    role_alias = mapping.get("role_alias", {})
    name_rules = mapping.get("name_rules", {})
    name_contains = name_rules.get("contains", {})
    for record in records:
        role = str(record.get("role", "")).strip()
        canonical = role_alias.get(role, role)
        record["role"] = canonical
        correct_faction = faction_map.get(canonical)
        if correct_faction:
            record["faction"] = correct_faction
        player_name = str(record.get("player_name", "")).strip()
        for fragment, canonical_name in name_contains.items():
            if fragment in player_name:
                record["player_name"] = canonical_name
                break
    return records


def fix_existing_records() -> list[str]:
    mapping = load_role_mapping()
    faction_map = mapping.get("faction_map", {})
    role_alias = mapping.get("role_alias", {})
    name_rules = mapping.get("name_rules", {})
    name_contains = name_rules.get("contains", {})

    changes = []
    with get_conn() as conn:
        for alias, canonical in role_alias.items():
            cur = conn.execute(
                "UPDATE match_records SET role = ? WHERE role = ? AND role != ?",
                (canonical, alias, canonical),
            )
            if cur.rowcount:
                changes.append(f"role unified: {alias} -> {canonical} ({cur.rowcount} rows)")

        for role, faction in faction_map.items():
            cur = conn.execute(
                "UPDATE match_records SET faction = ? WHERE role = ? AND faction != ?",
                (faction, role, faction),
            )
            if cur.rowcount:
                changes.append(f"faction fixed: {role} -> {faction} ({cur.rowcount} rows)")

        for fragment, canonical_name in name_contains.items():
            cur = conn.execute(
                "UPDATE match_records SET player_name = ? WHERE player_name LIKE ? AND player_name != ?",
                (canonical_name, f"%{fragment}%", canonical_name),
            )
            if cur.rowcount:
                changes.append(f"name unified: contains '{fragment}' -> {canonical_name} ({cur.rowcount} rows)")

        conn.commit()
    return changes


def init_db() -> tuple[bool, str]:
    try:
        with get_conn() as conn:
            conn.execute(
                """
                create table if not exists match_records (
                    id integer primary key autoincrement,
                    match_id text not null,
                    date text not null,
                    player_name text not null,
                    faction text not null,
                    role text not null,
                    is_win integer not null
                )
                """
            )
            conn.execute(
                """
                create table if not exists match_images (
                    match_id text primary key,
                    image blob not null
                )
                """
            )
            conn.commit()
        return True, ""
    except Exception as exc:
        return False, str(exc)


def insert_match_records(records: list[dict]) -> tuple[bool, str]:
    ok, error_message = init_db()
    if not ok:
        return False, error_message

    records = apply_role_mapping(records)

    try:
        with get_conn() as conn:
            conn.executemany(
                """
                insert into match_records (
                    match_id,
                    date,
                    player_name,
                    faction,
                    role,
                    is_win
                ) values (?, ?, ?, ?, ?, ?)
                """,
                [
                    (
                        record["match_id"],
                        record["date"],
                        record["player_name"],
                        record["faction"],
                        record["role"],
                        int(bool(record["is_win"])),
                    )
                    for record in records
                ],
            )
            conn.commit()
        return True, ""
    except Exception as exc:
        return False, str(exc)


def fetch_match_records() -> tuple[pd.DataFrame, str]:
    ok, error_message = init_db()
    if not ok:
        return pd.DataFrame(), error_message

    try:
        with get_conn() as conn:
            url = os.environ.get("TURSO_DATABASE_URL", "")
            if url:
                cur = conn.execute(
                    "select id, match_id, date, player_name, faction, role, is_win from match_records order by id desc"
                )
                rows = cur.fetchall()
                cols = [d[0] for d in cur.description] if cur.description else [
                    "id", "match_id", "date", "player_name", "faction", "role", "is_win"
                ]
                data = pd.DataFrame(rows, columns=cols)
            else:
                data = pd.read_sql_query(
                    "select id, match_id, date, player_name, faction, role, is_win from match_records order by id desc",
                    conn,
                )
        if not data.empty:
            data["is_win"] = data["is_win"].astype(bool)
        return data, ""
    except Exception as exc:
        return pd.DataFrame(), str(exc)


def insert_match_images(images: dict[str, bytes]) -> tuple[bool, str]:
    """Insert or replace match screenshots. Key: match_id, Value: image bytes."""
    if not images:
        return True, ""
    ok, error_message = init_db()
    if not ok:
        return False, error_message
    try:
        with get_conn() as conn:
            for match_id, image_bytes in images.items():
                conn.execute(
                    "insert or replace into match_images (match_id, image) values (?, ?)",
                    (match_id, image_bytes),
                )
            conn.commit()
        return True, ""
    except Exception as exc:
        return False, str(exc)


def fetch_match_image(match_id: str) -> bytes | None:
    ok, _ = init_db()
    if not ok:
        return None
    try:
        with get_conn() as conn:
            url = os.environ.get("TURSO_DATABASE_URL", "")
            if url:
                cur = conn.execute(
                    "select image from match_images where match_id = ?", (match_id,)
                )
                row = cur.fetchone()
                if row and row[0]:
                    return base64.b64decode(row[0])
                return None
            else:
                cur = conn.execute(
                    "select image from match_images where match_id = ?", (match_id,)
                )
                row = cur.fetchone()
                return row[0] if row else None
    except Exception:
        return None


def delete_match_records(record_ids: list[int]) -> tuple[bool, str]:
    ok, error_message = init_db()
    if not ok:
        return False, error_message

    if not record_ids:
        return True, ""

    try:
        placeholders = ",".join(["?"] * len(record_ids))
        with get_conn() as conn:
            conn.execute(f"delete from match_records where id in ({placeholders})", record_ids)
            conn.commit()
        return True, ""
    except Exception as exc:
        return False, str(exc)
