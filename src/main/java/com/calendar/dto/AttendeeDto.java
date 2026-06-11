package com.calendar.dto;

import java.util.UUID;

public record AttendeeDto(
    UUID userId,
    String name,
    String email,
    String response
) {}
