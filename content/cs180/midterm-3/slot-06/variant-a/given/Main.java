// Complete: you do not need to open or change this file.

void main() throws Exception {
    ServerSocket listener = new ServerSocket(0);
    Thread server = new Thread(new PointsServer(listener));
    server.setDaemon(true);
    server.start();
    try (Socket socket = new Socket("localhost", listener.getLocalPort())) {
        BufferedReader in = new BufferedReader(new InputStreamReader(socket.getInputStream()));
        PrintWriter out = new PrintWriter(socket.getOutputStream(), true);
        for (String command : new String[] {"ADD 5", "ADD 3", "SHOW", "RESET", "JUMP", "BYE"}) {
            out.println(command);
            IO.println(command + " -> " + in.readLine());
        }
    }
}
