package cn.hentor.vegetables.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import java.time.LocalDateTime;

public record FranchiseeRequest(
  @NotBlank String contactName,
  @NotBlank String contactPhone,
  LocalDateTime contractEndsAt,
  @NotBlank String name,
  String remark,
  @NotBlank @Pattern(regexp = "ACTIVE|SUSPENDED|EXPIRED") String status
) {}
