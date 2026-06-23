package cn.hentor.vegetables.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("\"User\"")
public class UserEntity {
  @TableId("\"id\"")
  private String id;

  @TableField("\"openid\"")
  private String openid;

  @TableField("\"unionid\"")
  private String unionid;

  @TableField("\"phone\"")
  private String phone;

  @TableField("\"nickname\"")
  private String nickname;

  @TableField("\"avatarUrl\"")
  private String avatarUrl;

  @TableField("\"status\"")
  private String status;

  @TableField("\"disabledReason\"")
  private String disabledReason;

  @TableField("\"remark\"")
  private String remark;

  @TableField("\"defaultStoreId\"")
  private String defaultStoreId;

  @TableField("\"createdAt\"")
  private LocalDateTime createdAt;

  @TableField("\"updatedAt\"")
  private LocalDateTime updatedAt;
}
