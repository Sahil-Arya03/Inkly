package com.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class RegisterRequest {

    @NotBlank(message = "Email is required")
    @Email(message = "Enter a valid email address")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password must be at least 8 characters")
    private String password;

    @NotBlank(message = "Name is required")
    @Size(min = 2, message = "Name must be at least 2 characters")
    private String name;

    @NotBlank(message = "Workspace is required")
    @Size(min = 3, message = "Workspace must be at least 3 characters")
    @Pattern(regexp = "^[a-z0-9-]+$", message = "Workspace: lowercase letters, numbers, and dashes only")
    private String workspace;
}
