package cn.hentor.vegetables.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record AdminRoleUpdateRequest(
  @NotBlank String name,
  @NotEmpty List<String> permissionIds
) {}
