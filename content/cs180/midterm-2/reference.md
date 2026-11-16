<!-- receivers: s=String, t=String, reader=BufferedReader, writer=PrintWriter, e=Exception -->

## Input and output

| Method | Returns | What it does |
|---|---|---|
| `IO.println(x)` | `void` | Prints `x`, then a line break |
| `IO.print(x)` | `void` | Prints `x` |
| `IO.readln()` | `String` | Reads one line typed by the user |
| `IO.readln(prompt)` | `String` | Prints `prompt`, then reads one line |
| `String.format(format, args...)` | `String` | Fills each `%` hole in `format` with the next argument, as in `String.format("%s: %d for $%.2f", name, count, price)`: `%s` text, `%d` whole number, `%.2f` two decimals |

## Numbers

| Method | Returns | What it does |
|---|---|---|
| `Integer.parseInt(s)` | `int` | The whole number written in `s` |
| `Double.parseDouble(s)` | `double` | The decimal number written in `s` |
| `Math.abs(a)` | same as `a` | `a` without its sign |
| `Math.max(a, b)` | same as `a`, `b` | The larger of `a` and `b` |
| `Math.min(a, b)` | same as `a`, `b` | The smaller of `a` and `b` |
| `Math.pow(a, b)` | `double` | `a` to the power `b` |
| `Math.sqrt(a)` | `double` | The square root of `a` |
| `Math.PI` | `double` | π |

## Strings

| Method | Returns | What it does |
|---|---|---|
| `s.length()` | `int` | The number of characters in `s` |
| `s.charAt(i)` | `char` | The character at index `i` |
| `s.substring(start, end)` | `String` | The characters from index `start` up to, not including, `end` |
| `s.substring(start)` | `String` | The characters from index `start` to the end |
| `s.indexOf(t)` | `int` | The index of the first `t` in `s`, or -1 |
| `s.contains(t)` | `boolean` | Whether `t` appears in `s` |
| `s.isEmpty()` | `boolean` | Whether `s` has no characters |
| `s.toUpperCase()` | `String` | `s` in upper case |
| `s.toLowerCase()` | `String` | `s` in lower case |
| `s.equals(t)` | `boolean` | Whether `s` and `t` have the same characters |
| `s.equalsIgnoreCase(t)` | `boolean` | Whether `s` and `t` are the same, ignoring case |
| `s.trim()` | `String` | `s` without spaces at either end |
| `s.split(t)` | `String[]` | The parts of `s` between each `t`, as in `s.split(" ")` or `s.split(",")` |
| `Objects.equals(a, b)` | `boolean` | Whether `a` and `b` are equal, or both `null` |

## Arrays

| Method | Returns | What it does |
|---|---|---|
| `int[] a = {4, 8, 15};` | | An array holding the values listed |
| `new int[n]` | `int[]` | An array of `n` zeros |
| `a[i]` | element type | The element at index `i` |
| `a.length` | `int` | The number of elements |
| `new int[rows][columns]` | `int[][]` | A grid of zeros; `g[r][c]` is row `r`, column `c` |
| `g.length`, `g[r].length` | `int` | The number of rows; the number of elements in row `r` |

## Types

| Method | Returns | What it does |
|---|---|---|
| `x instanceof Student s` | `boolean` | Whether `x` is a `Student`; if so, `s` is `x` as a `Student` |

## Exceptions

| Exception | Thrown when |
|---|---|
| `NumberFormatException` | `Integer.parseInt` or `Double.parseDouble` is given text that is not a number |
| `ArithmeticException` | A whole number is divided by zero |
| `ArrayIndexOutOfBoundsException` | An array index is below 0 or not less than its length |
| `StringIndexOutOfBoundsException` | `charAt` or `substring` is given an index outside the string |
| `NullPointerException` | A method is called on `null` |
| `IllegalArgumentException` | A method is given a value it does not accept |
| `FileNotFoundException` | A file to read does not exist |
| `IOException` | Reading or writing a file fails |

| Method | Returns | What it does |
|---|---|---|
| `try { ... } catch (NumberFormatException e) { ... }` | | Runs the `catch` block if the `try` block throws that exception |
| `throw new IllegalArgumentException(message)` | | Throws the exception with that message |
| `e.getMessage()` | `String` | The exception's message |

## Files

| Method | Returns | What it does |
|---|---|---|
| `new BufferedReader(new FileReader(name))` | `BufferedReader` | Opens the file `name` for reading |
| `reader.readLine()` | `String` | The next line of the file, or `null` at the end |
| `reader.close()` | `void` | Closes the file |
| `new PrintWriter(new FileOutputStream(name))` | `PrintWriter` | Opens the file `name` for writing, replacing it if it exists |
| `new PrintWriter(new FileOutputStream(name, true))` | `PrintWriter` | Opens the file `name` for writing, adding to the end if it exists |
| `writer.println(x)` | `void` | Writes `x`, then a line break |
| `writer.print(x)` | `void` | Writes `x` |
| `writer.printf(format, args...)` | `PrintWriter` | Writes formatted text, as `String.format` does |
| `writer.close()` | `void` | Finishes writing and closes the file |
