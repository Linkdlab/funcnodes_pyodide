def test_find_free_port_returns_bindable_port():
    from funcnodes_pyodide.__main__ import find_free_port

    # Socket operations may be restricted in some environments; validate behavior
    # by simulating the socket API.
    from unittest.mock import MagicMock, patch

    fake_socket = MagicMock()
    fake_socket.getsockname.return_value = ("127.0.0.1", 12345)

    with patch("socket.socket", return_value=fake_socket) as socket_ctor:
        port = find_free_port()

    socket_ctor.assert_called_once()
    fake_socket.bind.assert_called_once_with(("localhost", 0))
    fake_socket.getsockname.assert_called_once()
    fake_socket.close.assert_called_once()

    assert port == 12345
