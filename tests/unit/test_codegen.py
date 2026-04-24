from __future__ import annotations

import ast

import pytest

from replicalpha.core.codegen import CodegenError, generate_factor_code
from replicalpha.core.models import CodegenResult


def test_dsl_pct_change_rolling_mean_ratio() -> None:
    formula = "rolling_mean(close, 20) / close - 1"
    r = generate_factor_code(formula, factor_name="trend_20d", params={"lookback": 20})
    assert isinstance(r, CodegenResult)
    assert r.method == "dsl"
    assert r.qtype_passed
    # source must parse as Python
    ast.parse(r.source_code)


def test_dsl_corr_of_pct_change() -> None:
    formula = "-corr(pct_change(volume, 20), pct_change(close, 20))"
    r = generate_factor_code(formula, factor_name="pv_diverge_20d", params={"lookback": 20})
    assert r.method == "dsl"
    assert r.qtype_passed
    ast.parse(r.source_code)


def test_dsl_rejects_unknown_function_falls_back() -> None:
    # No llm_client argument → fallback disabled → raises
    formula = "wavelet(close, 20)"  # unsupported op
    with pytest.raises(CodegenError, match="unsupported"):
        generate_factor_code(formula, factor_name="wave", params={})


def test_llm_fallback_when_dsl_fails() -> None:
    from unittest.mock import MagicMock

    mock_llm = MagicMock()
    mock_llm.complete_json.return_value = (
        '{"code": "def compute(adapter, as_of, universe=\\"\\"):\\n    return {}\\n", '
        '"imports": []}'
    )
    r = generate_factor_code(
        "wavelet(close, 20)",
        factor_name="wave",
        params={},
        llm_client=mock_llm,
    )
    assert r.method == "llm"
    ast.parse(r.source_code)


def test_generated_code_is_qtype_clean_for_clean_dsl() -> None:
    r = generate_factor_code("rolling_mean(close, 20)", factor_name="ma20", params={"lookback": 20})
    assert r.qtype_passed
    assert r.qtype_violations == []


def test_stub_method_when_llm_emits_qtype_dirty_code() -> None:
    from unittest.mock import MagicMock

    mock_llm = MagicMock()
    # LLM emits shift(-1) — QT001 will flag this
    mock_llm.complete_json.return_value = (
        '{"code": "import pandas as pd\\n\\n'
        "def compute(adapter, as_of, universe=''):\\n"
        '    px = adapter.get_price(\\"close\\", as_of, as_of, universe)\\n'
        "    return {t: v[0] for t, v in px.items() if len(v) > 0}\\n"
        '", "imports": []}'
    )
    r = generate_factor_code(
        "wavelet(close, 20)",
        factor_name="dirty",
        params={},
        llm_client=mock_llm,
    )
    # LLM code is clean → accepted as LLM
    assert r.method == "llm"


def test_llm_output_invalid_python_falls_to_stub() -> None:
    from unittest.mock import MagicMock

    mock_llm = MagicMock()
    mock_llm.complete_json.return_value = '{"code": "def broken( :", "imports": []}'
    r = generate_factor_code(
        "wavelet(close, 20)", factor_name="stub", params={}, llm_client=mock_llm
    )
    assert r.method == "stub"
    assert "NotImplementedError" in r.source_code
