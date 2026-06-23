package cn.hentor.vegetables.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record AdminUserUpdateRequest(
  @NotBlank String name,
  String phone,
  @NotEmpty List<String> roleIds,
  @NotBlank String status,
  @NotNull List<String> storeIds
) {}
