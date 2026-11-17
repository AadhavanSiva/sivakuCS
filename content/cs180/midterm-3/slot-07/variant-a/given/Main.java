// Complete: you do not need to open or change this file.

void main() throws Exception {
    TicketServer server = new TicketServer(new MemoryStore(100));
    ServerSocket listener = new ServerSocket(4242);
    Thread serving = new Thread(() -> {
        try {
            server.serve(listener);
        } catch (IOException e) {
            // the listener was closed
        }
    });
    serving.setDaemon(true);
    serving.start();
    for (int visitor = 1; visitor <= 2; visitor++) {
        try (Socket socket = new Socket("localhost", 4242)) {
            BufferedReader in = new BufferedReader(new InputStreamReader(socket.getInputStream()));
            PrintWriter out = new PrintWriter(socket.getOutputStream(), true);
            for (String command : new String[] {"HELLO", "TICKET", "BYE"}) {
                out.println(command);
                IO.println(command + " -> " + in.readLine());
            }
        }
    }
    listener.close();
}
