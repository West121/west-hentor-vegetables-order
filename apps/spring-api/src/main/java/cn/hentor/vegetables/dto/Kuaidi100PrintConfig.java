package cn.hentor.vegetables.dto;

import java.util.Map;

public record Kuaidi100PrintConfig(
  String backTempId,
  String childTempId,
  String code,
  String expType,
  String key,
  String kuaidicom,
  String needBack,
  String needChild,
  boolean needDesensitization,
  boolean needLogo,
  boolean needOcr,
  String partnerId,
  String partnerKey,
  String payType,
  String printerId,
  String printerName,
  Map<String, Object> requestParams,
  String secret,
  String senderCompany,
  String siid,
  String tempId
) {}
