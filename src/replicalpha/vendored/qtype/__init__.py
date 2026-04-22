# Vendored from https://github.com/VernonOY/qtype @ commit 5277e433a524742c80889af8982377f2bbf8d8f3
# Original license: MIT (see ../../../LICENSE-VENDORED.md)
# DO NOT edit here — update upstream and re-sync.
"""qtype — static analyzer for quantitative trading code."""

from .core.analyzer import QtypeAnalyzer
from .core.violation import Violation

__version__ = "0.1.2"
__all__ = ["QtypeAnalyzer", "Violation", "__version__"]
