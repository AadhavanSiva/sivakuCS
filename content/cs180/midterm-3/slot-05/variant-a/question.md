# Q5: Campsite booking

A campsite server books sites over a socket. The client sends one site name per line. For each line, the server
replies with one line: `BOOKED` followed by a space and the site name if the site was free (it is now booked), or
`FULL` if it was not.

Complete `CampClient.book(host, port, sites)`. Connect to the server at `host` and `port` and try the sites in
order: send one site, then read the server's reply before sending the next. Stop at the first site that is booked
and return it. Return `null` if every site is full, or if the server closes the connection before replying. Close
the connection before returning, in every case.

`CampServer.java` is a practice server, and `Main.java` runs it and calls your method twice. Both are read-only.
Run `Main.java` to try your class.

## Sample run

Running `Main.java` prints:

```
Booked: lake-2
Booked: null
```

The sample run is one of the tests. The rest are hidden.
