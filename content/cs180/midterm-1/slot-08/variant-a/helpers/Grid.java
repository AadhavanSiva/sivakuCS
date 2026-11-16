/** Reads a grid of whole numbers typed by the user, printing its own prompts. */
public class Grid {
    /** Reads the number of rows, the number of columns, then each row's numbers separated by single spaces. */
    public static int[][] read() {
        IO.println("Enter the number of rows:");
        int rows = Integer.parseInt(IO.readln().trim());
        IO.println("Enter the number of columns:");
        int columns = Integer.parseInt(IO.readln().trim());
        int[][] grid = new int[rows][columns];
        for (int r = 0; r < rows; r++) {
            IO.println("Enter row " + r + ":");
            String[] parts = IO.readln().trim().split(" ");
            for (int c = 0; c < columns; c++) {
                grid[r][c] = Integer.parseInt(parts[c]);
            }
        }
        return grid;
    }
}
