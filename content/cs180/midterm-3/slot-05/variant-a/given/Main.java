// Complete: you do not need to open or change this file.

void main() throws Exception {
    ServerSocket listener = new ServerSocket(0);
    Thread server = new Thread(new CampServer(listener));
    server.setDaemon(true);
    server.start();
    int port = listener.getLocalPort();
    IO.println("Booked: " + CampClient.book("localhost", port, new String[] {"pine-1", "lake-2", "oak-3"}));
    IO.println("Booked: " + CampClient.book("localhost", port, new String[] {"pine-1", "lake-2"}));
}
