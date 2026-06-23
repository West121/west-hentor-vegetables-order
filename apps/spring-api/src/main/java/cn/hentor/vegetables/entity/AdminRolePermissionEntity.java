package cn.hentor.vegetables.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

@Data
@TableName("\"AdminRolePermission\"")
public class AdminRolePermissionEntity {
  @TableField("\"roleId\"")
  private String roleId;

  @TableField("\"permissionId\"")
  private String permissionId;
}
