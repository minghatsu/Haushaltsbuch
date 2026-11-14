package de.sascha.haushaltsbuch;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.security.SecureRandom;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.SecretKeySpec;

final class Vault {
    private static final String ALIAS = "hb-master";
    private static final String PREFS = "hb-vault";
    private static SecretKey dataKey;

    private static SecretKey master() throws Exception {
        KeyStore ks = KeyStore.getInstance("AndroidKeyStore");
        ks.load(null);
        if (ks.containsAlias(ALIAS)) return ((KeyStore.SecretKeyEntry) ks.getEntry(ALIAS, null)).getSecretKey();
        KeyGenerator g = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        g.init(new KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build());
        return g.generateKey();
    }

    private static synchronized SecretKey key(Context ctx) throws Exception {
        if (dataKey != null) return dataKey;
        SharedPreferences p = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String wrapped = p.getString("k", null);
        SecretKey m = master();
        if (wrapped == null) {
            byte[] raw = new byte[32];
            new SecureRandom().nextBytes(raw);
            Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
            c.init(Cipher.ENCRYPT_MODE, m);
            byte[] ct = c.doFinal(raw);
            p.edit().putString("k", b64(concat(c.getIV(), ct))).commit();
            dataKey = new SecretKeySpec(raw, "AES");
        } else {
            byte[] u = Base64.decode(wrapped, Base64.NO_WRAP);
            Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
            c.init(Cipher.DECRYPT_MODE, m, new GCMParameterSpec(128, u, 0, 12));
            dataKey = new SecretKeySpec(c.doFinal(u, 12, u.length - 12), "AES");
        }
        return dataKey;
    }

    static String seal(Context ctx, String text) {
        try {
            byte[] iv = new byte[12];
            new SecureRandom().nextBytes(iv);
            Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
            c.init(Cipher.ENCRYPT_MODE, key(ctx), new GCMParameterSpec(128, iv));
            return "v1:" + b64(concat(iv, c.doFinal(text.getBytes(StandardCharsets.UTF_8))));
        } catch (Exception e) { return ""; }
    }

    static String unseal(Context ctx, String sealed) {
        try {
            if (sealed == null || !sealed.startsWith("v1:")) return null;
            byte[] u = Base64.decode(sealed.substring(3), Base64.NO_WRAP);
            Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
            c.init(Cipher.DECRYPT_MODE, key(ctx), new GCMParameterSpec(128, u, 0, 12));
            return new String(c.doFinal(u, 12, u.length - 12), StandardCharsets.UTF_8);
        } catch (Exception e) { return null; }
    }

    static String pbkdf2(String pin, String salt, int iter) {
        try {
            PBEKeySpec s = new PBEKeySpec(pin.toCharArray(), salt.getBytes(StandardCharsets.UTF_8), Math.max(1000, Math.min(iter, 2000000)), 256);
            byte[] h = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(s).getEncoded();
            StringBuilder b = new StringBuilder();
            for (byte x : h) b.append(String.format("%02x", x));
            return b.toString();
        } catch (Exception e) { return ""; }
    }

    private static byte[] concat(byte[] a, byte[] b) { byte[] o = new byte[a.length + b.length]; System.arraycopy(a, 0, o, 0, a.length); System.arraycopy(b, 0, o, a.length, b.length); return o; }
    private static String b64(byte[] b) { return Base64.encodeToString(b, Base64.NO_WRAP); }
}
