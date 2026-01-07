import asyncio
import sys

if sys.platform == "emscripten":
    from .patch import patch

    patch()

from .worker import PyodideWorker


async def new_worker(*args, **kwargs):
    worker = PyodideWorker(*args, **kwargs)
    asyncio.get_running_loop().create_task(worker.run_forever_async())
    while worker.runstate != "running":
        await asyncio.sleep(0.1)
    return worker
