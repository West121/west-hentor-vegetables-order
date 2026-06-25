package cn.hentor.vegetables.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record Kuaidi100CloudPrintRequest(
  Boolean includePrinted,
  @NotEmpty(message = "请选择需要生成电子面单的订单") List<String> orderIds,
  String printerId,
  @NotBlank(message = "缺少门店信息") String storeId
) {}
