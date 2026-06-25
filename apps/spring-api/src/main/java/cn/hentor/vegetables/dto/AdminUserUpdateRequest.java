package cn.hentor.vegetables.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record AdminUserUpdateRequest(
  @NotBlank(message = "请输入用户姓名") String name,
  String phone,
  @NotEmpty(message = "请选择后台角色") List<String> roleIds,
  @NotBlank(message = "请选择用户状态") String status,
  @NotNull(message = "授权门店参数不能为空") List<String> storeIds
) {}
