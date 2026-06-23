package cn.hentor.vegetables.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;

public record MiniBenefitSelectionRequest(
  @Positive(message = "附加权益数量必须大于 0") BigDecimal quantity,
  @NotBlank(message = "请选择附加权益") String userPackageBenefitId
) {}
