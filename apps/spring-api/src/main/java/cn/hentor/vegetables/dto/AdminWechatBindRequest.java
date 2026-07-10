package cn.hentor.vegetables.dto;

import jakarta.validation.constraints.NotBlank;

public record AdminWechatBindRequest(
  @NotBlank(message = "微信绑定凭证不能为空") String bindToken,
  @NotBlank(message = "请输入账号") String username,
  @NotBlank(message = "请输入密码") String password
) {}
