package cn.hentor.vegetables.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import java.time.LocalDateTime;
import java.util.List;

public record StoreManagementRequest(
  String address,
  String city,
  @NotBlank String code,
  @NotBlank String contactName,
  @NotBlank String contactPhone,
  String customerServiceTel,
  @NotBlank @Pattern(regexp = "^([01]\\d|2[0-3]):[0-5]\\d$") String cutoffTime,
  List<String> deliveryCities,
  List<String> deliveryProvinces,
  String district,
  LocalDateTime franchiseEndsAt,
  String franchiseeId,
  @NotBlank String name,
  String province,
  @NotBlank @Pattern(regexp = "ACTIVE|DISABLED") String status,
  @NotBlank @Pattern(regexp = "DIRECT|FRANCHISE") String type
) {}
