import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

/**
 * A one-way, in-memory byte pipe: what one end writes, the other reads.
 * Unlike PipedInputStream it does not care which threads read and write,
 * so a server thread may end while its client is still reading.
 */
final class Pipe {
    private final byte[] buffer = new byte[64 * 1024];
    private int start;
    private int length;
    private boolean writerClosed;
    private boolean readerClosed;

    final InputStream in = new InputStream() {
        @Override
        public int read() throws IOException {
            byte[] one = new byte[1];
            return read(one, 0, 1) < 0 ? -1 : one[0] & 0xff;
        }

        @Override
        public int read(byte[] b, int off, int len) throws IOException {
            synchronized (Pipe.this) {
                while (length == 0 && !writerClosed && !readerClosed) {
                    try {
                        Pipe.this.wait();
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                        throw new IOException("interrupted");
                    }
                }
                if (readerClosed) {
                    throw new IOException("Socket closed");
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
                    while (length == buffer.length && !readerClosed) {
                        try {
                            Pipe.this.wait();
                        } catch (InterruptedException e) {
                            Thread.currentThread().interrupt();
                            throw new IOException("interrupted");
                        }
                    }
                    if (writerClosed || readerClosed) {
                        throw new IOException("Broken pipe");
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
}
