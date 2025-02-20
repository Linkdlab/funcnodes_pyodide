import os
import http.server
import socketserver
import functools


def find_free_port():
    import socket

    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.bind(("localhost", 0))
    addr, port = s.getsockname()
    s.close()
    return port


def serve():
    port = find_free_port()
    # Get the directory where this script resides
    script_dir = os.path.dirname(os.path.abspath(__file__))
    # Define the static directory relative to the script
    static_dir = os.path.join(script_dir, "static")

    # Create a request handler that serves files from the static directory
    Handler = functools.partial(
        http.server.SimpleHTTPRequestHandler, directory=static_dir
    )

    with socketserver.TCPServer(("", port), Handler) as httpd:
        print("Serving at http://localhost:" + str(port))
        httpd.serve_forever()


if __name__ == "__main__":
    serve()
