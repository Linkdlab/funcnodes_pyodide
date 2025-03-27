from funcnodes_worker import RemoteWorker
import json
import uuid


class PyodideWorker(RemoteWorker):
    pass

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._receiver = None

    async def receivejs(self, msg):
        await self.receive_message(msg)

    async def sendmessage(self, msg: str, **kwargs):
        if self._receiver:
            self._receiver.receivepy(msg, worker_id=self.uuid())

    async def send_bytes(self, data: bytes, header: dict, **sendkwargs):
        """send a message to the frontend"""
        if not self._receiver:
            return
        if not data:
            return
        chunkheader = "chunk=1/1;msgid=" + str(uuid.uuid4()) + ";"

        headerbytes = (
            "; ".join([f"{key}={value}" for key, value in header.items()]).encode(
                "utf-8"
            )
            + b"\r\n\r\n"
        )

        msg = chunkheader.encode("utf-8") + headerbytes + data

        self._receiver.receivepy_bytes(msg, worker_id=self.uuid())

    def set_receiver(self, res):
        self._receiver = res
