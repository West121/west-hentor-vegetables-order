package cn.hentor.vegetables.dto;

import java.util.List;

public record MiniStorePublicSettingsDto(
  String aboutText,
  String customerServiceTel,
  List<String> deliveryCities,
  List<String> deliveryProvinces,
  String loginImageUrl,
  String loginSubtitle,
  String loginTitle,
  String loginWelcome,
  String privacyPolicyContent,
  String privacyPolicyUrl,
  MiniStorePublicSummaryDto store,
  String userAgreementContent,
  String userAgreementUrl
) {}
