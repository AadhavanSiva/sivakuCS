package sivaku.net;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.SocketException;
import java.net.SocketTimeoutException;

/**
 * A one-way, in-memory byte pipe: what one end writes, the other reads.
 * Unlike PipedInputStream it does not care which threads read and write,
 * so a server thread may end while its client is still reading. A read
 * waits at most the socket's timeout, as a real socket's does.
 */
final class Pipe {
    private final byte[] buffer = new byte[64 * 1024];
    private int start;
    private int length;
    private boolean writerClosed;
    private boolean readerClosed;
    /** The reading socket's SO_TIMEOUT in ms; 0 waits for ever. */
    volatile int timeoutMs;

    final InputStream in = new InputStream() {
        @Override
        public int read() throws IOException {
            byte[] one = new byte[1];
            return read(one, 0, 1) < 0 ? -1 : one[0] & 0xff;
        }

        @Override
        public int read(byte[] b, int off, int len) throws IOException {
            if (len == 0) {
                return 0;
            }
            synchronized (Pipe.this) {
                long deadline = timeoutMs > 0 ? System.currentTimeMillis() + timeoutMs : 0;
                while (length == 0 && !writerClosed && !readerClosed) {
                    long wait = 0;
                    if (deadline != 0) {
                        wait = deadline - System.currentTimeMillis();
                        if (wait <= 0) {
                            throw new SocketTimeoutException("Read timed out");
                        }
                    }
                    try {
                        Pipe.this.wait(wait);
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                        throw new SocketException("Interrupted");
                    }
                }
                if (readerClosed) {
                    throw new SocketException("Socket closed");
                }
                if (length == 0) {
                    return -1;
                }
                int n = Math.min(len, length);
                for (int i = 0; i < n; i++) {
                    b[off + i] = buffer[(start + i) % buffer.length];
                }
                start = (start + n) % buffer.length;
                length -= n;
                Pipe.this.notifyAll();
                return n;
            }
        }

        @Override
        public int available() throws IOException {
            synchronized (Pipe.this) {
                if (readerClosed) {
                    throw new SocketException("Socket closed");
                }
                return length;
            }
        }

        @Override
        public void close() {
            synchronized (Pipe.this) {
                readerClosed = true;
                Pipe.this.notifyAll();
            }
        }
    };

    final OutputStream out = new OutputStream() {
        @Override
        public void write(int b) throws IOException {
            write(new byte[] {(byte) b}, 0, 1);
        }

        @Override
        public void write(byte[] b, int off, int len) throws IOException {
            synchronized (Pipe.this) {
                for (int i = 0; i < len; i++) {
                    while (length == buffer.length && !readerClosed && !writerClosed) {
                        try {
                            Pipe.this.wait();
                        } catch (InterruptedException e) {
                            Thread.currentThread().interrupt();
                            throw new SocketException("Interrupted");
                        }
                    }
                    if (writerClosed) {
                        throw new SocketException("Socket closed");
                    }
                    if (readerClosed) {
                        throw new SocketException("Broken pipe");
                    }
                    buffer[(start + length) % buffer.length] = b[off + i];
                    length++;
                }
                Pipe.this.notifyAll();
            }
        }

        @Override
        public void close() {
            synchronized (Pipe.this) {
                writerClosed = true;
                Pipe.this.notifyAll();
            }
        }
    };

    /** Closes the reading end: reads fail, and writes fail as a broken pipe. */
    void closeReader() {
        synchronized (this) {
            readerClosed = true;
            notifyAll();
        }
    }

    /** Closes the writing end: the reader sees end of stream once the bytes are read. */
    void closeWriter() {
        synchronized (this) {
            writerClosed = true;
            notifyAll();
        }
    }

    /** Whether the writing end has closed (the reader then sees end of stream once the bytes are read). */
    synchronized boolean writerClosed() {
        return writerClosed;
    }
}
