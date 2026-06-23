package cn.hentor.vegetables.dto;

import java.util.List;

public record SystemSettingsDto(
  String aboutText,
  String cutoffTime,
  String customerServiceTel,
  List<String> deliveryCities,
  List<String> deliveryProvinces,
  String loginImageUrl,
  String loginSubtitle,
  String loginTitle,
  String loginWelcome,
  String privacyPolicyUrl,
  SystemSettingsStoreDto store,
  String userAgreementUrl
) {}
