"""Thin SQLite wrapper for replicalpha persistence (Phase 3, v0.4).

Stores three things that were previously either in-memory or filesystem-only:

- **runs** — index of run_id → paper_path / verdict / score / factor_name.
  The filesystem under ``runs_root`` remains the source of truth for
  artifacts; this table just makes listing/filtering O(rows) instead of
  O(scan all dirs + parse JSON).
- **analyses** — cached payloads for ``factor_analysis``, ``risk_attribution``,
  and ``robustness`` keyed by ``(run_id, kind)``.
- **agent_sessions** + **agent_messages** — replaces the in-memory session
  dict in :mod:`replicalpha.server.agent` so chat history survives restarts.
- **portfolios** — scaffold for v0.5 portfolio runtime.

All queries use ``?`` placeholders. The connection is opened with
``check_same_thread=False`` and serialised through a :class:`threading.Lock`
so FastAPI worker threads can share a single :class:`Storage` instance.
"""

from __future__ import annotations

import json
import sqlite3
import threading
from pathlib import Path
from typing import Any
from uuid import uuid4

DEFAULT_DB_PATH = Path.home() / ".replicalpha" / "db.sqlite"


_SCHEMA_STATEMENTS: tuple[str, ...] = (
    """
    CREATE TABLE IF NOT EXISTS runs (
      run_id TEXT PRIMARY KEY,
      paper_path TEXT,
      verdict TEXT,
      score REAL,
      factor_name TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS analyses (
      run_id TEXT,
      kind TEXT,
      payload_json TEXT,
      computed_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (run_id, kind),
      FOREIGN KEY (run_id) REFERENCES runs(run_id)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS agent_sessions (
      session_id TEXT PRIMARY KEY,
      run_id TEXT,
      model TEXT,
      cost_cap_usd REAL,
      cost_spent_usd REAL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS agent_messages (
      message_id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content_json TEXT NOT NULL,
      ts TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (session_id) REFERENCES agent_sessions(session_id)
    )
    """,
    "CREATE INDEX IF NOT EXISTS idx_messages_session ON agent_messages(session_id)",
    """
    CREATE TABLE IF NOT EXISTS portfolios (
      portfolio_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      factor_runs_json TEXT NOT NULL,
      weights_json TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
    """,
)

_VALID_RUN_FILTERS = frozenset({"run_id", "paper_path", "verdict", "score", "factor_name"})


class Storage:
    """Thread-safe SQLite wrapper for replicalpha persistence."""

    def __init__(self, db_path: Path = DEFAULT_DB_PATH) -> None:
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(str(self.db_path), check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._lock = threading.Lock()
        self._closed = False

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    def init_schema(self) -> None:
        """Create all tables/indexes if they do not yet exist (idempotent)."""
        with self._lock:
            cur = self._conn.cursor()
            for stmt in _SCHEMA_STATEMENTS:
                cur.execute(stmt)
            self._conn.commit()

    def close(self) -> None:
        if self._closed:
            return
        with self._lock:
            self._conn.close()
            self._closed = True

    # ------------------------------------------------------------------
    # Runs
    # ------------------------------------------------------------------

    def upsert_run(
        self,
        run_id: str,
        paper_path: str,
        verdict: str | None,
        score: float | None,
        factor_name: str | None,
    ) -> None:
        with self._lock:
            self._conn.execute(
                """
                INSERT INTO runs (run_id, paper_path, verdict, score, factor_name)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(run_id) DO UPDATE SET
                    paper_path=excluded.paper_path,
                    verdict=excluded.verdict,
                    score=excluded.score,
                    factor_name=excluded.factor_name
                """,
                (run_id, paper_path, verdict, score, factor_name),
            )
            self._conn.commit()

    def get_run(self, run_id: str) -> dict[str, Any] | None:
        with self._lock:
            row = self._conn.execute("SELECT * FROM runs WHERE run_id = ?", (run_id,)).fetchone()
        return dict(row) if row else None

    def list_runs(self, filter_: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        sql = "SELECT * FROM runs"
        params: list[Any] = []
        if filter_:
            clauses: list[str] = []
            for k, v in filter_.items():
                if k not in _VALID_RUN_FILTERS:
                    raise ValueError(f"unsupported filter field: {k}")
                clauses.append(f"{k} = ?")
                params.append(v)
            if clauses:
                sql += " WHERE " + " AND ".join(clauses)
        sql += " ORDER BY created_at DESC, run_id ASC"
        with self._lock:
            rows = self._conn.execute(sql, params).fetchall()
        return [dict(r) for r in rows]

    # ------------------------------------------------------------------
    # Analyses
    # ------------------------------------------------------------------

    def upsert_analysis(self, run_id: str, kind: str, payload: dict[str, Any]) -> None:
        payload_json = json.dumps(payload, default=str)
        with self._lock:
            self._conn.execute(
                """
                INSERT INTO analyses (run_id, kind, payload_json, computed_at)
                VALUES (?, ?, ?, datetime('now'))
                ON CONFLICT(run_id, kind) DO UPDATE SET
                    payload_json=excluded.payload_json,
                    computed_at=datetime('now')
                """,
                (run_id, kind, payload_json),
            )
            self._conn.commit()

    def get_analysis(self, run_id: str, kind: str) -> dict[str, Any] | None:
        with self._lock:
            row = self._conn.execute(
                "SELECT payload_json, computed_at FROM analyses WHERE run_id = ? AND kind = ?",
                (run_id, kind),
            ).fetchone()
        if row is None:
            return None
        payload = json.loads(row["payload_json"])
        if not isinstance(payload, dict):
            return {"value": payload, "computed_at": row["computed_at"]}
        payload_dict: dict[str, Any] = payload
        payload_dict["__computed_at"] = row["computed_at"]
        return payload_dict

    # ------------------------------------------------------------------
    # Agent sessions & messages
    # ------------------------------------------------------------------

    def upsert_session(
        self,
        session_id: str,
        run_id: str | None,
        model: str,
        cost_cap_usd: float,
        cost_spent_usd: float,
    ) -> None:
        with self._lock:
            self._conn.execute(
                """
                INSERT INTO agent_sessions
                    (session_id, run_id, model, cost_cap_usd, cost_spent_usd)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(session_id) DO UPDATE SET
                    run_id=excluded.run_id,
                    model=excluded.model,
                    cost_cap_usd=excluded.cost_cap_usd,
                    cost_spent_usd=excluded.cost_spent_usd,
                    updated_at=datetime('now')
                """,
                (session_id, run_id, model, cost_cap_usd, cost_spent_usd),
            )
            self._conn.commit()

    def get_session(self, session_id: str) -> dict[str, Any] | None:
        with self._lock:
            row = self._conn.execute(
                "SELECT * FROM agent_sessions WHERE session_id = ?", (session_id,)
            ).fetchone()
        return dict(row) if row else None

    def append_message(
        self,
        session_id: str,
        role: str,
        content: str | list[dict[str, Any]],
        ts: str | None = None,
    ) -> int:
        content_json = json.dumps(content, default=str)
        with self._lock:
            if ts is None:
                cur = self._conn.execute(
                    """
                    INSERT INTO agent_messages (session_id, role, content_json)
                    VALUES (?, ?, ?)
                    """,
                    (session_id, role, content_json),
                )
            else:
                cur = self._conn.execute(
                    """
                    INSERT INTO agent_messages (session_id, role, content_json, ts)
                    VALUES (?, ?, ?, ?)
                    """,
                    (session_id, role, content_json, ts),
                )
            self._conn.commit()
            message_id = cur.lastrowid
            assert message_id is not None
            return int(message_id)

    def get_messages(self, session_id: str, limit: int = 200) -> list[dict[str, Any]]:
        with self._lock:
            rows = self._conn.execute(
                """
                SELECT message_id, session_id, role, content_json, ts
                FROM agent_messages
                WHERE session_id = ?
                ORDER BY message_id ASC
                LIMIT ?
                """,
                (session_id, int(limit)),
            ).fetchall()
        out: list[dict[str, Any]] = []
        for r in rows:
            out.append(
                {
                    "message_id": r["message_id"],
                    "session_id": r["session_id"],
                    "role": r["role"],
                    "content": json.loads(r["content_json"]),
                    "ts": r["ts"],
                }
            )
        return out

    # ------------------------------------------------------------------
    # Portfolios
    # ------------------------------------------------------------------

    def create_portfolio(
        self,
        name: str,
        factor_runs: list[str],
        weights: list[float],
    ) -> str:
        if len(factor_runs) != len(weights):
            raise ValueError("factor_runs and weights must have the same length")
        portfolio_id = f"pf-{uuid4().hex[:8]}"
        with self._lock:
            self._conn.execute(
                """
                INSERT INTO portfolios (portfolio_id, name, factor_runs_json, weights_json)
                VALUES (?, ?, ?, ?)
                """,
                (
                    portfolio_id,
                    name,
                    json.dumps(list(factor_runs)),
                    json.dumps([float(w) for w in weights]),
                ),
            )
            self._conn.commit()
        return portfolio_id

    def get_portfolio(self, portfolio_id: str) -> dict[str, Any] | None:
        with self._lock:
            row = self._conn.execute(
                "SELECT * FROM portfolios WHERE portfolio_id = ?", (portfolio_id,)
            ).fetchone()
        if row is None:
            return None
        d = dict(row)
        d["factor_runs"] = json.loads(d.pop("factor_runs_json"))
        d["weights"] = json.loads(d.pop("weights_json"))
        return d

    def list_portfolios(self) -> list[dict[str, Any]]:
        with self._lock:
            rows = self._conn.execute(
                "SELECT * FROM portfolios ORDER BY created_at DESC, portfolio_id ASC"
            ).fetchall()
        out: list[dict[str, Any]] = []
        for r in rows:
            d = dict(r)
            d["factor_runs"] = json.loads(d.pop("factor_runs_json"))
            d["weights"] = json.loads(d.pop("weights_json"))
            out.append(d)
        return out
