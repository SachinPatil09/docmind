package com.example.docmind.dto;

public record LoginResponse(
        String accessToken,
        UserDto user
) {
}
