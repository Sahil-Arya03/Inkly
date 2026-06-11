package com.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AuthResponse {
    private String email;
    private String name;
    private String workspace;
    private long expiresIn;
}
