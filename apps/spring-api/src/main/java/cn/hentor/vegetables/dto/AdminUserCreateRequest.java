package cn.hentor.vegetables.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record AdminUserCreateRequest(
  @NotBlank String name,
  @NotBlank @Size(min = 8) String password,
  String phone,
  @NotEmpty List<String> roleIds,
  @NotBlank String status,
  @NotNull List<String> storeIds,
  @NotBlank String username
) {}
