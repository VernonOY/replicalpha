"""Unit tests for :mod:`replicalpha.core.storage`."""

from __future__ import annotations

from pathlib import Path

import pytest

from replicalpha.core.storage import DEFAULT_DB_PATH, Storage


@pytest.fixture
def storage(tmp_path: Path) -> Storage:
    s = Storage(tmp_path / "test.sqlite")
    s.init_schema()
    return s


# ---------------------------------------------------------------------------
# Lifecycle
# ---------------------------------------------------------------------------


def test_default_db_path_is_under_home() -> None:
    expected = Path.home() / ".replicalpha" / "db.sqlite"
    assert expected == DEFAULT_DB_PATH


def test_init_schema_is_idempotent(tmp_path: Path) -> None:
    s = Storage(tmp_path / "idem.sqlite")
    s.init_schema()
    s.init_schema()  # Must not raise.
    s.upsert_run("r1", "/p.pdf", "weak", 0.1, "f1")
    assert s.get_run("r1") is not None
    s.close()


def test_init_creates_parent_dir(tmp_path: Path) -> None:
    nested = tmp_path / "nested" / "deeper" / "db.sqlite"
    s = Storage(nested)
    assert nested.parent.exists()
    s.init_schema()
    s.close()


def test_close_is_idempotent(tmp_path: Path) -> None:
    s = Storage(tmp_path / "c.sqlite")
    s.init_schema()
    s.close()
    s.close()  # Must not raise.


# ---------------------------------------------------------------------------
# Runs
# ---------------------------------------------------------------------------


def test_upsert_and_get_run(storage: Storage) -> None:
    storage.upsert_run("r-1", "/papers/a.pdf", "strong", 0.85, "momentum")
    row = storage.get_run("r-1")
    assert row is not None
    assert row["run_id"] == "r-1"
    assert row["paper_path"] == "/papers/a.pdf"
    assert row["verdict"] == "strong"
    assert row["score"] == 0.85
    assert row["factor_name"] == "momentum"
    assert row["created_at"]


def test_get_run_returns_none_when_missing(storage: Storage) -> None:
    assert storage.get_run("does-not-exist") is None


def test_upsert_run_updates_existing(storage: Storage) -> None:
    storage.upsert_run("r-1", "/v1.pdf", "weak", 0.1, "f1")
    storage.upsert_run("r-1", "/v2.pdf", "strong", 0.9, "f2")
    row = storage.get_run("r-1")
    assert row is not None
    assert row["paper_path"] == "/v2.pdf"
    assert row["verdict"] == "strong"
    assert row["score"] == 0.9
    assert row["factor_name"] == "f2"


def test_list_runs_no_filter(storage: Storage) -> None:
    storage.upsert_run("r-a", "/a.pdf", "weak", 0.1, "fa")
    storage.upsert_run("r-b", "/b.pdf", "strong", 0.8, "fb")
    storage.upsert_run("r-c", "/c.pdf", "weak", 0.2, "fc")
    rows = storage.list_runs()
    assert len(rows) == 3
    assert {r["run_id"] for r in rows} == {"r-a", "r-b", "r-c"}


def test_list_runs_with_filter(storage: Storage) -> None:
    storage.upsert_run("r-a", "/a.pdf", "weak", 0.1, "fa")
    storage.upsert_run("r-b", "/b.pdf", "strong", 0.8, "fb")
    storage.upsert_run("r-c", "/c.pdf", "weak", 0.2, "fc")
    weak_rows = storage.list_runs(filter_={"verdict": "weak"})
    assert len(weak_rows) == 2
    assert {r["run_id"] for r in weak_rows} == {"r-a", "r-c"}

    strong_rows = storage.list_runs(filter_={"verdict": "strong"})
    assert len(strong_rows) == 1
    assert strong_rows[0]["run_id"] == "r-b"


def test_list_runs_rejects_unsupported_filter(storage: Storage) -> None:
    with pytest.raises(ValueError, match="unsupported filter field"):
        storage.list_runs(filter_={"bogus": "x"})


def test_list_runs_empty(storage: Storage) -> None:
    assert storage.list_runs() == []


# ---------------------------------------------------------------------------
# Analyses
# ---------------------------------------------------------------------------


def test_upsert_and_get_analysis(storage: Storage) -> None:
    payload = {"ic_mean": 0.05, "monotonic": True, "quintiles": [0.1, 0.2, 0.3]}
    storage.upsert_analysis("r-1", "factor_analysis", payload)
    got = storage.get_analysis("r-1", "factor_analysis")
    assert got is not None
    # Original keys preserved.
    assert got["ic_mean"] == 0.05
    assert got["monotonic"] is True
    assert got["quintiles"] == [0.1, 0.2, 0.3]
    # Computed_at metadata was injected.
    assert "__computed_at" in got


def test_get_analysis_returns_none(storage: Storage) -> None:
    assert storage.get_analysis("nope", "factor_analysis") is None


def test_upsert_analysis_overwrites(storage: Storage) -> None:
    storage.upsert_analysis("r-1", "robustness", {"v": 1})
    storage.upsert_analysis("r-1", "robustness", {"v": 2})
    got = storage.get_analysis("r-1", "robustness")
    assert got is not None
    assert got["v"] == 2


def test_analysis_kinds_are_independent(storage: Storage) -> None:
    storage.upsert_analysis("r-1", "factor_analysis", {"k": "fa"})
    storage.upsert_analysis("r-1", "robustness", {"k": "ro"})
    fa = storage.get_analysis("r-1", "factor_analysis")
    ro = storage.get_analysis("r-1", "robustness")
    assert fa is not None and fa["k"] == "fa"
    assert ro is not None and ro["k"] == "ro"


# ---------------------------------------------------------------------------
# Sessions / messages
# ---------------------------------------------------------------------------


def test_upsert_and_get_session(storage: Storage) -> None:
    storage.upsert_session("s1", "r-1", "claude-haiku-4-5-20251001", 0.50, 0.01)
    row = storage.get_session("s1")
    assert row is not None
    assert row["session_id"] == "s1"
    assert row["run_id"] == "r-1"
    assert row["model"] == "claude-haiku-4-5-20251001"
    assert row["cost_cap_usd"] == 0.50
    assert row["cost_spent_usd"] == 0.01


def test_get_session_missing(storage: Storage) -> None:
    assert storage.get_session("nope") is None


def test_upsert_session_overwrites(storage: Storage) -> None:
    storage.upsert_session("s1", None, "m", 0.5, 0.0)
    storage.upsert_session("s1", "r-2", "m2", 1.0, 0.42)
    row = storage.get_session("s1")
    assert row is not None
    assert row["run_id"] == "r-2"
    assert row["model"] == "m2"
    assert row["cost_cap_usd"] == 1.0
    assert row["cost_spent_usd"] == 0.42


def test_append_messages_preserves_order(storage: Storage) -> None:
    storage.upsert_session("s1", None, "m", 0.5, 0.0)
    id1 = storage.append_message("s1", "user", "first")
    id2 = storage.append_message("s1", "assistant", "second")
    id3 = storage.append_message(
        "s1",
        "user",
        [{"type": "tool_result", "tool_use_id": "t1", "content": "ok"}],
    )
    assert id1 < id2 < id3
    msgs = storage.get_messages("s1")
    assert [m["message_id"] for m in msgs] == [id1, id2, id3]
    assert msgs[0]["role"] == "user"
    assert msgs[0]["content"] == "first"
    assert msgs[2]["content"] == [{"type": "tool_result", "tool_use_id": "t1", "content": "ok"}]


def test_append_message_with_explicit_ts(storage: Storage) -> None:
    storage.upsert_session("s1", None, "m", 0.5, 0.0)
    storage.append_message("s1", "user", "hi", ts="2026-01-01 00:00:00")
    msgs = storage.get_messages("s1")
    assert msgs[0]["ts"] == "2026-01-01 00:00:00"


def test_get_messages_respects_limit(storage: Storage) -> None:
    storage.upsert_session("s1", None, "m", 0.5, 0.0)
    for i in range(5):
        storage.append_message("s1", "user", f"m{i}")
    msgs = storage.get_messages("s1", limit=2)
    assert len(msgs) == 2
    assert msgs[0]["content"] == "m0"
    assert msgs[1]["content"] == "m1"


def test_get_messages_isolated_per_session(storage: Storage) -> None:
    storage.upsert_session("a", None, "m", 0.5, 0.0)
    storage.upsert_session("b", None, "m", 0.5, 0.0)
    storage.append_message("a", "user", "from-a")
    storage.append_message("b", "user", "from-b")
    a_msgs = storage.get_messages("a")
    b_msgs = storage.get_messages("b")
    assert len(a_msgs) == 1 and a_msgs[0]["content"] == "from-a"
    assert len(b_msgs) == 1 and b_msgs[0]["content"] == "from-b"


# ---------------------------------------------------------------------------
# Portfolios
# ---------------------------------------------------------------------------


def test_create_and_get_portfolio(storage: Storage) -> None:
    pid = storage.create_portfolio("equal-blend", ["r-1", "r-2"], [0.5, 0.5])
    assert pid.startswith("pf-")
    pf = storage.get_portfolio(pid)
    assert pf is not None
    assert pf["name"] == "equal-blend"
    assert pf["factor_runs"] == ["r-1", "r-2"]
    assert pf["weights"] == [0.5, 0.5]


def test_create_portfolio_validates_lengths(storage: Storage) -> None:
    with pytest.raises(ValueError):
        storage.create_portfolio("bad", ["r-1", "r-2"], [1.0])


def test_get_portfolio_missing(storage: Storage) -> None:
    assert storage.get_portfolio("pf-nope") is None


def test_list_portfolios(storage: Storage) -> None:
    storage.create_portfolio("a", ["r-1"], [1.0])
    storage.create_portfolio("b", ["r-2", "r-3"], [0.4, 0.6])
    rows = storage.list_portfolios()
    assert len(rows) == 2
    names = {r["name"] for r in rows}
    assert names == {"a", "b"}
    for r in rows:
        assert isinstance(r["factor_runs"], list)
        assert isinstance(r["weights"], list)


def test_list_portfolios_empty(storage: Storage) -> None:
    assert storage.list_portfolios() == []
