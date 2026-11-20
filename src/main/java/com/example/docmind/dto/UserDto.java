package com.example.docmind.dto;

import com.example.docmind.entity.Role;

public record UserDto(
        Long id,
        String username,
        String email ,
        Role role
) {
}
