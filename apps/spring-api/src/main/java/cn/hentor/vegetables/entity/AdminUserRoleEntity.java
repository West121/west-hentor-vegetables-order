package cn.hentor.vegetables.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

@Data
@TableName("\"AdminUserRole\"")
public class AdminUserRoleEntity {
  @TableField("\"adminUserId\"")
  private String adminUserId;

  @TableField("\"roleId\"")
  private String roleId;
}
