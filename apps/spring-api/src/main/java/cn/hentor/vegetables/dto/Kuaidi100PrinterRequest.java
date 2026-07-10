package cn.hentor.vegetables.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.Map;

public record Kuaidi100PrinterRequest(
  String apiKey,
  String apiSecret,
  String code,
  String expType,
  Boolean isDefault,
  String kuaidicom,
  @NotBlank(message = "请输入打印机名称") String name,
  String partnerId,
  String partnerKey,
  String payType,
  String remark,
  Map<String, Object> requestParams,
  String senderAddress,
  String senderCompany,
  String senderMobile,
  @NotBlank(message = "请输入快递100打印机 siid") String siid,
  Integer sortOrder,
  String status,
  @NotBlank(message = "缺少门店信息") String storeId,
  String tempId
) {}
