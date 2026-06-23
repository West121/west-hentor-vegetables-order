package cn.hentor.vegetables.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record Kuaidi100CloudPrintRequest(
  Boolean includePrinted,
  @NotEmpty List<String> orderIds,
  @NotBlank String storeId
) {}
