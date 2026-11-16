import java.io.ByteArrayOutputStream;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.io.ByteArrayInputStream;
import java.util.Map;

/**
 * Renames classes in a compiled class file by rewriting its constant pool.
 * Every reference to a class (superclass, field and method types, calls,
 * new, casts, stack maps, generic signatures) goes through UTF-8 entries in
 * the pool, so replacing "javax/swing/JButton" and "Ljavax/swing/JButton;"
 * there renames it everywhere; the rest of the file refers to the pool by
 * index and is copied unchanged.
 */
final class Renamer {
    private Renamer() {
    }

    /** @param renames internal names, such as "javax/swing/JButton" to "FakeButton" */
    static byte[] rename(byte[] classFile, Map<String, String> renames, int[] count) throws IOException {
        DataInputStream in = new DataInputStream(new ByteArrayInputStream(classFile));
        ByteArrayOutputStream bytes = new ByteArrayOutputStream(classFile.length + 256);
        DataOutputStream out = new DataOutputStream(bytes);
        out.writeInt(in.readInt()); // magic
        out.writeShort(in.readUnsignedShort()); // minor
        out.writeShort(in.readUnsignedShort()); // major
        int entries = in.readUnsignedShort();
        out.writeShort(entries);
        for (int i = 1; i < entries; i++) {
            int tag = in.readUnsignedByte();
            out.writeByte(tag);
            switch (tag) {
                case 1 -> { // Utf8
                    String text = in.readUTF();
                    String renamed = renameText(text, renames);
                    if (!renamed.equals(text)) {
                        count[0]++;
                    }
                    out.writeUTF(renamed);
                }
                case 3, 4 -> out.writeInt(in.readInt()); // Integer, Float
                case 5, 6 -> { // Long, Double take two slots
                    out.writeLong(in.readLong());
                    i++;
                }
                case 7, 8, 16, 19, 20 -> out.writeShort(in.readUnsignedShort()); // Class, String, MethodType, Module, Package
                case 9, 10, 11, 12, 17, 18 -> out.writeInt(in.readInt()); // refs, NameAndType, Dynamic, InvokeDynamic
                case 15 -> { // MethodHandle
                    out.writeByte(in.readUnsignedByte());
                    out.writeShort(in.readUnsignedShort());
                }
                default -> throw new IOException("unknown constant pool tag " + tag);
            }
        }
        in.transferTo(out);
        return bytes.toByteArray();
    }

    /** A class name that is exactly one of ours, or descriptors and signatures that mention them. */
    private static String renameText(String text, Map<String, String> renames) {
        String exact = renames.get(text);
        if (exact != null) {
            return exact;
        }
        if (text.indexOf('L') < 0) {
            return text;
        }
        String result = text;
        for (Map.Entry<String, String> e : renames.entrySet()) {
            result = result.replace("L" + e.getKey() + ";", "L" + e.getValue() + ";")
                    .replace("L" + e.getKey() + "<", "L" + e.getValue() + "<");
        }
        return result;
    }
}
