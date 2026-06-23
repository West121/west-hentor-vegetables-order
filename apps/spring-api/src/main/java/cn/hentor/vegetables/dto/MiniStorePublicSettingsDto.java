package cn.hentor.vegetables.dto;

public record MiniStorePublicSettingsDto(
  String aboutText,
  String customerServiceTel,
  String loginImageUrl,
  String loginSubtitle,
  String loginTitle,
  String loginWelcome,
  String privacyPolicyUrl,
  MiniStorePublicSummaryDto store,
  String userAgreementUrl
) {}
