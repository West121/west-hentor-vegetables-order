package cn.hentor.vegetables.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("\"AdminWechatBinding\"")
public class AdminWechatBindingEntity {
  @TableId("\"id\"")
  private String id;

  @TableField("\"adminUserId\"")
  private String adminUserId;

  @TableField("\"openid\"")
  private String openid;

  @TableField("\"unionid\"")
  private String unionid;

  @TableField("\"lastLoginAt\"")
  private LocalDateTime lastLoginAt;

  @TableField("\"createdAt\"")
  private LocalDateTime createdAt;

  @TableField("\"updatedAt\"")
  private LocalDateTime updatedAt;
}
