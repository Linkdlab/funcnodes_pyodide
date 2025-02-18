from .worker import PyodideWorker
import asyncio


async def new_worker(debug=False):
    worker = PyodideWorker(debug=debug)
    loop = asyncio.get_event_loop()
    loop.create_task(worker.run_forever_async())
    return worker
