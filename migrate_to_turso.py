import json
import os
import sqlite3
import sys
import urllib.request
import urllib.error

LOCAL_DB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "match_records.sqlite3")
API_BASE = "https://api.turso.tech"


def api_request(path, token, method="GET", body=None):
    url = f"{API_BASE}{path}"
    req = urllib.request.Request(url, method=method)
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Content-Type", "application/json")
    data = json.dumps(body).encode() if body else None
    try:
        with urllib.request.urlopen(req, data=data) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"  API error {e.code}: {body}")
        return None


def turso_arg(value):
    if value is None:
        return {"type": "null"}
    if isinstance(value, bool):
        return {"type": "integer", "value": "1" if value else "0"}
    if isinstance(value, int):
        return {"type": "integer", "value": str(value)}
    if isinstance(value, float):
        return {"type": "float", "value": value}
    return {"type": "text", "value": str(value)}


def turso_execute(hostname, token, sql, params=None):
    endpoint = f"https://{hostname}/v2/pipeline"
    stmt = {"sql": sql}
    if params:
        stmt["args"] = [turso_arg(p) for p in params]
    body = json.dumps({"requests": [{"type": "execute", "stmt": stmt}, {"type": "close"}]}).encode()
    req = urllib.request.Request(endpoint, data=body)
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())


def main():
    token = os.environ.get("TURSO_API_TOKEN", "").strip()
    if not token:
        token = input("Turso API Token (create at https://turso.tech/app/settings/tokens): ").strip()
    if not token:
        print("No token provided.")
        sys.exit(1)

    # Get organization
    orgs = api_request("/v1/organizations", token)
    if not orgs or not isinstance(orgs, list) or len(orgs) == 0:
        print("No organization found. Sign up at https://turso.tech first.")
        sys.exit(1)
    org_slug = orgs[0]["slug"]
    print(f"Organization: {org_slug}")

    # Create database
    db_name = "goosegame"
    result = api_request(
        f"/v1/organizations/{org_slug}/databases",
        token,
        method="POST",
        body={"name": db_name, "group": "default"},
    )
    if result:
        print(f"Created database: {db_name}")
    else:
        print(f"Using existing database: {db_name}")

    # Get database info
    db_info = api_request(f"/v1/organizations/{org_slug}/databases/{db_name}", token)
    if not db_info:
        print("Failed to get database info.")
        sys.exit(1)
    hostname = db_info.get("hostname", "")
    if not hostname:
        print("No hostname found in database info.")
        sys.exit(1)
    print(f"Hostname: {hostname}")

    # Create auth token
    token_result = api_request(
        f"/v1/organizations/{org_slug}/databases/{db_name}/auth/tokens",
        token,
        method="POST",
        body={"authorization": "full-access"},
    )
    if not token_result:
        print("Failed to create auth token.")
        sys.exit(1)

    db_token = token_result.get("jwt", "")
    db_url = f"libsql://{hostname}"

    # Migrate data
    print("\nMigrating local data to Turso...")
    local_conn = sqlite3.connect(LOCAL_DB)
    local_conn.row_factory = sqlite3.Row
    rows = local_conn.execute("SELECT * FROM match_records ORDER BY id").fetchall()
    local_conn.close()
    print(f"  Local rows: {len(rows)}")

    # Create table
    turso_execute(hostname, db_token, """
        CREATE TABLE IF NOT EXISTS match_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            match_id TEXT NOT NULL,
            date TEXT NOT NULL,
            player_name TEXT NOT NULL,
            faction TEXT NOT NULL,
            role TEXT NOT NULL,
            is_win INTEGER NOT NULL
        )
    """)
    print("  Table created/verified")

    # Clear and insert
    turso_execute(hostname, db_token, "DELETE FROM match_records")
    for i, row in enumerate(rows):
        turso_execute(hostname, db_token, """
            INSERT INTO match_records (id, match_id, date, player_name, faction, role, is_win)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, [row["id"], row["match_id"], row["date"], row["player_name"],
              row["faction"], row["role"], int(row["is_win"])])
        if (i + 1) % 50 == 0:
            print(f"  Migrated {i + 1}/{len(rows)} rows")
    print(f"  Done: {len(rows)} rows migrated")

    # Write secrets
    secrets_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".streamlit")
    os.makedirs(secrets_dir, exist_ok=True)
    secrets_path = os.path.join(secrets_dir, "secrets.toml")
    with open(secrets_path, "w", encoding="utf-8") as f:
        f.write(f'[default]\nTURSO_DATABASE_URL = "{db_url}"\nTURSO_AUTH_TOKEN = "{db_token}"\n')

    print(f"""
{'='*50}
Migration complete!

Secrets written to: {secrets_path}

For Streamlit Cloud deployment, add these to your app's Secrets:
  TURSO_DATABASE_URL = "{db_url}"
  TURSO_AUTH_TOKEN = "{db_token}"
{'='*50}
""")


if __name__ == "__main__":
    main()
