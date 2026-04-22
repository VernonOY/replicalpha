# Vendored from https://github.com/VernonOY/context-distiller @ commit fdbd6cc1d65cc746bc499da99bf178d0e3ed937b
# Original license: MIT (see ../../../../LICENSE-VENDORED.md)
# DO NOT edit here — update upstream and re-sync.
"""context-distiller — smart quantitative domain knowledge manager for LLM context injection."""

from .core.distiller import Distiller

__version__ = "0.1.0"
__all__ = ["Distiller", "__version__"]
