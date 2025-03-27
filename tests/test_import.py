import pytest


@pytest.mark.imports
def test_import():
    from funcnodes_pyodide import PyodideWorker, new_worker
    PyodideWorker()


@pytest.mark.imports
def test_patch():
    from funcnodes_pyodide.patch import patch

    patch()

    from funcnodes_core import FUNCNODES_LOGGER

    assert len(FUNCNODES_LOGGER.handlers) == 1
