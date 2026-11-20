package com.example.docmind.dto;

import com.example.docmind.entity.Role;

public record RegisterUserRequest(
        String username ,
        String email ,
        String password
) {
}
