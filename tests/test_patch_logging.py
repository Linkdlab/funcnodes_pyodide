import pytest
from pytest_funcnodes import funcnodes_test


@pytest.mark.imports
@funcnodes_test(disable_file_handler=False)
def test_patch_is_idempotent():
    from funcnodes_pyodide.patch import patch
    from funcnodes_core import FUNCNODES_LOGGER

    patch()
    patch()

    assert len(FUNCNODES_LOGGER.handlers) == 1
    assert [h.name for h in FUNCNODES_LOGGER.handlers] == ["console"]
