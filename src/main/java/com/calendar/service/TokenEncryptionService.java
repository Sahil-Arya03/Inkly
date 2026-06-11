package com.calendar.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.encrypt.BytesEncryptor;
import org.springframework.security.crypto.encrypt.Encryptors;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

/**
 * Encrypts/decrypts Google refresh tokens at rest using AES-256-GCM
 * ({@link Encryptors#stronger}). The key comes from
 * {@code calendar.token.encryption-key} / the CALENDAR_TOKEN_ENCRYPTION_KEY
 * environment variable and must base64-decode to exactly 32 bytes
 * (generate with: openssl rand -base64 32). Startup fails fast otherwise.
 */
@Service
public class TokenEncryptionService {

    private final BytesEncryptor encryptor;

    public TokenEncryptionService(
            @Value("${calendar.token.encryption-key}") String key) {
        byte[] decoded;
        try {
            decoded = Base64.getDecoder().decode(key);
        } catch (IllegalArgumentException e) {
            throw new IllegalStateException(
                    "CALENDAR_TOKEN_ENCRYPTION_KEY is not valid base64. "
                    + "Generate one with: openssl rand -base64 32");
        }
        if (decoded.length != 32) {
            throw new IllegalStateException(
                    "CALENDAR_TOKEN_ENCRYPTION_KEY must base64-decode to exactly 32 bytes, got "
                    + decoded.length + ". Generate one with: openssl rand -base64 32");
        }
        // Fixed hex salt; GCM "stronger" mode adds a random IV per message.
        this.encryptor = Encryptors.stronger(key, "deadbeefdeadbeef");
    }

    public String encrypt(String plaintext) {
        byte[] encrypted = encryptor.encrypt(plaintext.getBytes(StandardCharsets.UTF_8));
        return Base64.getEncoder().encodeToString(encrypted);
    }

    /**
     * @throws TokenDecryptionException if the ciphertext cannot be decrypted
     *         (e.g. it was written under a previous key). Callers should treat
     *         the stored token as lost and require re-authorization, not 500.
     */
    public String decrypt(String base64Ciphertext) {
        try {
            byte[] decoded = Base64.getDecoder().decode(base64Ciphertext);
            return new String(encryptor.decrypt(decoded), StandardCharsets.UTF_8);
        } catch (RuntimeException e) {
            throw new TokenDecryptionException(
                    "Stored token could not be decrypted (encryption key changed?)", e);
        }
    }

    /** Thrown when a stored ciphertext cannot be decrypted under the current key. */
    public static class TokenDecryptionException extends RuntimeException {
        public TokenDecryptionException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
