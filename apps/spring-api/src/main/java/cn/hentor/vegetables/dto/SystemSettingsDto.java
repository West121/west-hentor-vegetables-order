package cn.hentor.vegetables.dto;

import java.util.List;

public record SystemSettingsDto(
  String adminSystemName,
  String aboutText,
  String customerServiceTel,
  List<String> deliveryCities,
  List<String> deliveryProvinces,
  Integer homeDishColumns,
  String loginImageUrl,
  String loginSubtitle,
  String loginTitle,
  String loginWelcome,
  String privacyPolicyContent,
  String privacyPolicyUrl,
  SystemSettingsStoreDto store,
  String userAgreementContent,
  String userAgreementUrl
) {}
