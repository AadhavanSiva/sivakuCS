<!-- receivers: s=String, t=String, button=JButton, label=JLabel, field=JTextField -->

s and t are Strings; x is a number.

## Swing

| Expression | What it does |
|---|---|
| `import javax.swing.*;` `import java.awt.event.*;` | The imports a panel with listeners needs |
| `new JButton(s)` | A button showing `s` |
| `new JLabel(s)` | A label showing `s` |
| `new JTextField(8)` | A text field about 8 characters wide |
| `button.getText()`, `label.getText()`, `field.getText()` | The text it shows, or what was typed in it |
| `button.setText(s)`, `label.setText(s)`, `field.setText(s)` | Shows `s` instead |
| `button.setEnabled(false)` | Greys the button out; clicking it does nothing |
| `button.isEnabled()` | Whether the button can be clicked |
| `button.addActionListener(e -> { ... });` | Runs the code each time the button is clicked |
| `button.addActionListener(new ActionListener() { public void actionPerformed(ActionEvent e) { ... } });` | The same, as an anonymous class |

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
