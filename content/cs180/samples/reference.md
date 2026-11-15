## Reading input

| | |
|---|---|
| `new Scanner(System.in)` | Reads from the keyboard |
| `new Scanner(new File(name))` | Reads from a file; throws `FileNotFoundException` if it is missing |
| `sc.nextLine()` | The rest of the current line, without the line break |
| `sc.hasNextLine()` | Whether another line can be read |
| `IO.readln()` | One line from the keyboard, or `null` at the end of input |

## Writing output

| | |
|---|---|
| `System.out.println(x)` | Prints `x` and a line break |
| `System.out.printf(format, ...)` | Prints formatted text; `%d` whole number, `%.2f` two decimals, `%s` text, `%n` line break |
| `String.format(format, ...)` | The same, returned as a `String` |
| `new PrintWriter(name)` | Writes a file, replacing it if it exists |

## Numbers and text

| | |
|---|---|
| `Integer.parseInt(s)`, `Double.parseDouble(s)` | Text to a number; throw `NumberFormatException` if it is not one |
| `Math.min(a, b)`, `Math.max(a, b)` | The smaller and larger of two numbers |
| `s.trim()` | `s` without leading and trailing spaces |
| `s.isEmpty()` | Whether `s` has no characters |
| `s.equalsIgnoreCase(t)` | Equal, ignoring upper and lower case |
| `new File(name).exists()` | Whether a file exists |
