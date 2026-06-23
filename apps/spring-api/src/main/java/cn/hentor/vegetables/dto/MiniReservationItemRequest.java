package cn.hentor.vegetables.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;

public record MiniReservationItemRequest(
  @NotBlank(message = "请选择菜品") String dishId,
  @Positive(message = "菜品重量必须大于 0") BigDecimal weightJin
) {}
