void main() {
    int[][] grid = Grid.read();

    for (int r = 0; r < grid.length; r++) {
        int total = 0;
        for (int c = 0; c < grid[r].length; c++) {
            total += grid[r][c];
        }
        IO.println("Row " + r + " total: " + total);
    }

    int largest = grid[0][0];
    int largestRow = 0;
    int largestColumn = 0;
    for (int r = 0; r < grid.length; r++) {
        for (int c = 0; c < grid[r].length; c++) {
            if (grid[r][c] > largest) {
                largest = grid[r][c];
                largestRow = r;
                largestColumn = c;
            }
        }
    }
    IO.println("Largest: " + largest + " at row " + largestRow + ", column " + largestColumn);
}
