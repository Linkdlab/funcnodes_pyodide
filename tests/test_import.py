import pytest
from pytest_funcnodes import funcnodes_test


@pytest.mark.imports
def test_import():
    from funcnodes_pyodide import PyodideWorker

    PyodideWorker()


@pytest.mark.imports
@funcnodes_test(disable_file_handler=False)
def test_non_patch_logging():
    from funcnodes_core import FUNCNODES_LOGGER

    assert len(FUNCNODES_LOGGER.handlers) == 2


@pytest.mark.imports
@funcnodes_test(disable_file_handler=False)
def test_patch():
    from funcnodes_pyodide.patch import patch

    patch()

    from funcnodes_core import FUNCNODES_LOGGER

    assert len(FUNCNODES_LOGGER.handlers) == 1
