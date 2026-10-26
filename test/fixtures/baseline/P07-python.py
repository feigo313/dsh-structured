import asyncio


async def worker(queue: asyncio.Queue) -> None:
    item = await queue.get()
    await asyncio.sleep(0.01)
    queue.task_done()
    return item


async def main() -> None:
    queue: asyncio.Queue = asyncio.Queue(maxsize=1)
    task = asyncio.create_task(worker(queue))
    queue.put_nowait("a")
    queue.put_nowait("b")  # 可能阻塞/丢失；分析队列和任务生命周期风险
    await task


if __name__ == "__main__":
    asyncio.run(main())
