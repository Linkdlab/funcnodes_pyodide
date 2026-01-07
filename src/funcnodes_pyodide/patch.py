def patch() -> None:
    from funcnodes_core.config import update_config

    update_config({"logging": {"handler": {"file": False}}})
    # import here to avoid circular import
    from funcnodes_core._logging import (
        FUNCNODES_LOGGER,
        _update_logger_handlers,
    )  # noqa C0415 # pylint: disable=import-outside-toplevel

    _update_logger_handlers(FUNCNODES_LOGGER)
