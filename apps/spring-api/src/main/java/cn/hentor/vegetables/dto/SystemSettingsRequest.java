package cn.hentor.vegetables.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record SystemSettingsRequest(
  @NotNull String aboutText,
  @NotNull String customerServiceTel,
  List<String> deliveryCities,
  List<String> deliveryProvinces,
  Integer homeDishColumns,
  @NotNull String loginImageUrl,
  @NotNull String loginSubtitle,
  @NotNull String loginTitle,
  @NotNull String loginWelcome,
  @NotNull String privacyPolicyUrl,
  @NotBlank String storeId,
  @NotNull String userAgreementUrl
) {}
