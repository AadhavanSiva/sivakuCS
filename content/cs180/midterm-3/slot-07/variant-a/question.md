# Q7: Ticket server

`TicketServer.java` is a working ticket server for a museum. A client sends commands, one per line: `HELLO` (the
reply is `WELCOME`), `TICKET` (the reply is `TICKET` and the next ticket number) and `BYE` (the reply is `BYE`, then
the connection closes). Anything else gets `ERROR`. Ticket numbers come from a `NumberStore`: each ticket is one
more than the number stored, and is then stored.

The server has two shortcomings, described in its class comment. Fix both:

1. Serve each client on its own thread, so that a client is answered while other clients are still connected.
2. Make taking a ticket number safe when several clients ask at once: no number may be handed out twice or skipped,
   and once every client has finished, the store must hold the last number handed out.

Do not change the commands or the replies. `serve` may still end by throwing once the listener is closed.

`Main.java`, `NumberStore.java` and `MemoryStore.java` are read-only. Run `Main.java` to try your server: it starts
it on port 4242 and connects two clients, one after the other.

## Sample run

Running `Main.java` prints:

```
HELLO -> WELCOME
TICKET -> TICKET 101
BYE -> BYE
HELLO -> WELCOME
TICKET -> TICKET 102
BYE -> BYE
```

The sample run is one of the tests. The rest are hidden.
