<!-- receivers: t=Thread -->

s and t are Strings; x is a number.

## Threads

| Expression | What it does |
|---|---|
| `class Worker implements Runnable { public void run() { ... } }` | Code a thread can run |
| `Thread t = new Thread(new Worker(...));` | A thread that will run a `Worker` |
| `Thread t = new Thread(() -> { ... });` | A thread that will run the code given |
| `t.start()` | Starts the thread; its `run()` happens alongside your code. Never call `run()` yourself |
| `t.join()` | Waits until the thread has finished; throws `InterruptedException` |
| `Thread.sleep(ms)` | Pauses this thread for `ms` milliseconds; throws `InterruptedException` |
| `public synchronized void m() { ... }` | Only one thread at a time runs any synchronized method of the same object |
| `synchronized (gate) { ... }` | Only one thread at a time runs code synchronized on the same `gate` object |
