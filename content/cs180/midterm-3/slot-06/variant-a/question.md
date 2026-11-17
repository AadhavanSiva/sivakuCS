# Q6: Points keeper

A quiz-night server keeps each table's points over a socket. `PointsServer` accepts clients in a loop and starts a
new thread for each one, which calls `PointsHandler.handle(client)`.

Complete `handle(client)`. Read the client's commands, one per line, and send exactly one reply line for each:

| Command | Reply |
|---|---|
| `ADD n`, where `n` is a whole number (it may be negative) | Adds `n` to the points, then replies `POINTS` and the points |
| `SHOW` | `POINTS` and the points |
| `RESET` | Sets the points to 0, then replies `POINTS 0` |
| `BYE` | `BYE`; then close the connection and return |
| Anything else | `ERROR`; the conversation goes on |

The points start at 0 and belong to this conversation only. Several clients can be connected at once, each on its
own thread, and each has its own points. If the client hangs up without saying `BYE`, return.

`PointsServer.java` and `Main.java` are read-only. Run `Main.java` to try your handler: it starts the server and
sends a few commands.

## Sample run

Running `Main.java` prints:

```
ADD 5 -> POINTS 5
ADD 3 -> POINTS 8
SHOW -> POINTS 8
RESET -> POINTS 0
JUMP -> ERROR
BYE -> BYE
```

The sample run is one of the tests. The rest are hidden.
