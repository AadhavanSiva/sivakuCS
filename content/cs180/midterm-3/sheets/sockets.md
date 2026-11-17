<!-- receivers: s=String, t=String, socket=Socket, listener=ServerSocket, in=BufferedReader, out=PrintWriter -->

s and t are Strings; x is a number.

## Sockets

| Expression | What it does |
|---|---|
| `import java.net.*;` `import java.io.*;` | The imports for sockets and their streams; every call below can throw `IOException` |
| `new Socket(s, x)` | Connects to the server on host `s` (such as `"localhost"`), port `x` |
| `new ServerSocket(x)` | Listens for clients on port `x` |
| `listener.accept()` | Waits for the next client and returns a `Socket` connected to it |
| `new BufferedReader(new InputStreamReader(socket.getInputStream()))` | Reads the lines the other side sends |
| `new PrintWriter(socket.getOutputStream(), true)` | Sends lines to the other side; `true` sends each line at once |
| `in.readLine()` | The next line received, without its line break; `null` once the other side has closed |
| `out.println(s)` | Sends `s` as one line |
| `socket.close()` | Closes the connection; the other side's `readLine()` then returns `null` |
| `listener.close()` | Stops listening; a waiting `accept()` throws an exception |

## Text and numbers

| Expression | What it does |
|---|---|
| `Integer.parseInt(s)` | The whole number in `s`; throws `NumberFormatException` if it is not one |
| `Double.parseDouble(s)` | The number in `s`; throws `NumberFormatException` if it is not one |
| `String.format("%.2f", x)` | `x` with exactly two decimals |
| `s.trim()` | `s` without spaces at either end |
| `s.split(" ")` | The parts of `s` between single spaces |
| `s.equals(t)` | Whether `s` and `t` hold the same characters |
| `s.startsWith(t)` | Whether `s` begins with `t` |
| `s.substring(b)` | The characters of `s` from index `b` to the end |
| `s.isEmpty()` | Whether `s` has no characters |
| `s.toUpperCase()` | `s` in capitals |
| `s.length()` | The number of characters in `s` |
