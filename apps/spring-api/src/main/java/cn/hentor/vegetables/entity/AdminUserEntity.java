package cn.hentor.vegetables.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("\"AdminUser\"")
public class AdminUserEntity {
  @TableId("\"id\"")
  private String id;

  @TableField("\"username\"")
  private String username;

  @TableField("\"name\"")
  private String name;

  @TableField("\"phone\"")
  private String phone;

  @TableField("\"passwordHash\"")
  private String passwordHash;

  @TableField("\"status\"")
  private String status;

  @TableField("\"lastLoginAt\"")
  private LocalDateTime lastLoginAt;

  @TableField("\"createdAt\"")
  private LocalDateTime createdAt;

  @TableField("\"updatedAt\"")
  private LocalDateTime updatedAt;
}
