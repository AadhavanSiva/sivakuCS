<!-- receivers: s=String, t=String, reader=BufferedReader, writer=PrintWriter -->

## Input and output

| | |
|---|---|
| `IO.println(x)` | Prints `x` and a line break |
| `IO.print(x)` | Prints `x` without a line break |
| `IO.readln()` | One line typed by the user, without the line break; `null` at the end of input |
| `IO.readln(prompt)` | Prints `prompt`, then reads a line |
| `String.format(format, ...)` | Formatted text: `%d` whole number, `%.2f` two decimals, `%s` text |

## Files

| | |
|---|---|
| `new BufferedReader(new FileReader(name))` | Reads a file; throws `FileNotFoundException` if it is missing |
| `reader.readLine()` | The next line of the file, or `null` at the end |
| `new PrintWriter(name)` | Writes a file, replacing it if it exists |
| `writer.println(x)` | Writes `x` and a line break to the file |
| `new File(name).exists()` | Whether a file exists |

## Numbers and text

| | |
|---|---|
| `Integer.parseInt(s)`, `Double.parseDouble(s)` | Text to a number; throw `NumberFormatException` if it is not one |
| `Math.min(a, b)`, `Math.max(a, b)` | The smaller and larger of two numbers |
| `s.length()` | The number of characters in `s` |
| `s.trim()` | `s` without leading and trailing spaces |
| `s.isEmpty()` | Whether `s` has no characters |
| `s.split(" ")` | The parts of `s` between single spaces, as a `String[]` |
| `s.equalsIgnoreCase(t)` | Equal, ignoring upper and lower case |
