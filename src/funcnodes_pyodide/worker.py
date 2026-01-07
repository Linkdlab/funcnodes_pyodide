import uuid
from typing import Any

from exposedfunctionality import exposed_method
from funcnodes_worker import RemoteWorker


class PyodideWorker(RemoteWorker):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._receiver = None

    async def receivejs(self, msg: Any) -> None:
        await self.receive_message(msg)

    async def sendmessage(self, msg: str, **kwargs: Any) -> None:
        if not self._receiver:
            return
        worker_id = self.uuid()
        self._receiver.receivepy(msg, worker_id=worker_id)

    async def send_bytes(self, data: bytes, header: dict, **sendkwargs: Any) -> None:
        """send a message to the frontend"""
        if not self._receiver or not data:
            return

        chunkheader = f"chunk=1/1;msgid={uuid.uuid4()};"

        headerbytes = (
            "; ".join(f"{key}={value}" for key, value in header.items()).encode("utf-8")
            + b"\r\n\r\n"
        )

        msg = chunkheader.encode("utf-8") + headerbytes + data

        worker_id = self.uuid()
        self._receiver.receivepy_bytes(msg, worker_id=worker_id)

    def set_receiver(self, res: Any) -> None:
        self._receiver = res

    @exposed_method()
    def get_info(self) -> dict:
        from importlib import metadata

        packages = sorted(
            (
                {"name": dist.name, "version": dist.version}
                for dist in metadata.distributions()
            ),
            key=lambda p: p["name"],
        )
        return {
            "name": self.name(),
            "uuid": self.uuid(),
            "packages": packages,
        }
