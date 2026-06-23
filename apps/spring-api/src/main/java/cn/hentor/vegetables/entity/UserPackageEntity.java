package cn.hentor.vegetables.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("\"UserPackage\"")
public class UserPackageEntity {
  @TableId("\"id\"")
  private String id;

  @TableField("\"userId\"")
  private String userId;

  @TableField("\"storeId\"")
  private String storeId;

  @TableField("\"templateId\"")
  private String templateId;

  @TableField("\"nameSnapshot\"")
  private String nameSnapshot;

  @TableField("\"totalTimes\"")
  private Integer totalTimes;

  @TableField("\"usedTimes\"")
  private Integer usedTimes;

  @TableField("\"weightLimitJin\"")
  private BigDecimal weightLimitJin;

  @TableField("\"status\"")
  private String status;

  @TableField("\"frozenReason\"")
  private String frozenReason;

  @TableField("\"startsAt\"")
  private LocalDateTime startsAt;

  @TableField("\"expiresAt\"")
  private LocalDateTime expiresAt;

  @TableField("\"lastUsedAt\"")
  private LocalDateTime lastUsedAt;

  @TableField("\"nextOrderDate\"")
  private LocalDateTime nextOrderDate;

  @TableField("\"createdAt\"")
  private LocalDateTime createdAt;

  @TableField("\"updatedAt\"")
  private LocalDateTime updatedAt;
}
