package cn.hentor.vegetables.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record AdminUserCreateRequest(
  @NotBlank(message = "请输入用户姓名") String name,
  @NotBlank(message = "请输入初始密码") @Size(min = 8, message = "初始密码至少需要 8 位") String password,
  String phone,
  @NotEmpty(message = "请选择后台角色") List<String> roleIds,
  @NotBlank(message = "请选择用户状态") String status,
  @NotNull(message = "授权门店参数不能为空") List<String> storeIds,
  @NotBlank(message = "请输入登录账号") String username
) {}
