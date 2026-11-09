package ru.stankin.uits.security;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.spec.InvalidKeySpecException;
import java.util.Base64;

public class DjangoAwarePasswordEncoder implements PasswordEncoder {

    private static final String DJANGO_PREFIX = "pbkdf2_sha256$";
    private static final String PBKDF2_ALGORITHM = "PBKDF2WithHmacSHA256";

    private final PasswordEncoder bcrypt = new BCryptPasswordEncoder();

    @Override
    public String encode(CharSequence rawPassword) {
        return bcrypt.encode(rawPassword);
    }

    @Override
    public boolean matches(CharSequence rawPassword, String encodedPassword) {
        if (encodedPassword == null) {
            return false;
        }

        if (encodedPassword.startsWith(DJANGO_PREFIX)) {
            return matchesDjango(rawPassword, encodedPassword);
        }

        return bcrypt.matches(rawPassword, encodedPassword);
    }

    @Override
    public boolean upgradeEncoding(String encodedPassword) {
        return encodedPassword != null && encodedPassword.startsWith(DJANGO_PREFIX);
    }

    private boolean matchesDjango(CharSequence rawPassword, String encodedPassword) {
        String[] parts = encodedPassword.split("[$]");

        if (parts.length != 4) {
            return false;
        }

        int iterations;
        byte[] expected;

        try {
            iterations = Integer.parseInt(parts[1]);
            expected = Base64.getDecoder().decode(parts[3]);
        } catch (IllegalArgumentException e) {
            return false;
        }

        if (iterations <= 0 || expected.length == 0) {
            return false;
        }

        return MessageDigest.isEqual(pbkdf2(rawPassword, parts[2], iterations, expected.length), expected);
    }

    private byte[] pbkdf2(CharSequence rawPassword, String salt, int iterations, int lengthInBytes) {
        PBEKeySpec spec = new PBEKeySpec(
                toCharArray(rawPassword),
                salt.getBytes(StandardCharsets.UTF_8),
                iterations,
                lengthInBytes * 8
        );

        try {
            return SecretKeyFactory.getInstance(PBKDF2_ALGORITHM).generateSecret(spec).getEncoded();
        } catch (NoSuchAlgorithmException | InvalidKeySpecException e) {
            throw new IllegalStateException("Алгоритм " + PBKDF2_ALGORITHM + " недоступен", e);
        } finally {
            spec.clearPassword();
        }
    }

    private char[] toCharArray(CharSequence rawPassword) {
        char[] chars = new char[rawPassword.length()];

        for (int i = 0; i < chars.length; i++) {
            chars[i] = rawPassword.charAt(i);
        }

        return chars;
    }
}
