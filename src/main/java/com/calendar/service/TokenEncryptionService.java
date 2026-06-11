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
 * {@code calendar.token.encryption-key} (generate with: openssl rand -base64 32).
 */
@Service
public class TokenEncryptionService {

    private final BytesEncryptor encryptor;

    public TokenEncryptionService(
            @Value("${calendar.token.encryption-key}") String key) {
        // Fixed hex salt; GCM "stronger" mode adds a random IV per message.
        this.encryptor = Encryptors.stronger(key, "deadbeefdeadbeef");
    }

    public String encrypt(String plaintext) {
        byte[] encrypted = encryptor.encrypt(plaintext.getBytes(StandardCharsets.UTF_8));
        return Base64.getEncoder().encodeToString(encrypted);
    }

    public String decrypt(String base64Ciphertext) {
        byte[] decoded = Base64.getDecoder().decode(base64Ciphertext);
        return new String(encryptor.decrypt(decoded), StandardCharsets.UTF_8);
    }
}
