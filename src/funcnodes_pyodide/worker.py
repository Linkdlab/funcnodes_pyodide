from funcnodes_worker import RemoteWorker
import json


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

    def set_receiver(self, res):
        self._receiver = res
