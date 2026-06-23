package cn.hentor.vegetables.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("\"InventoryLog\"")
public class InventoryLogEntity {
  @TableId("\"id\"")
  private String id;

  @TableField("\"storeId\"")
  private String storeId;

  @TableField("\"dishId\"")
  private String dishId;

  @TableField("\"beforeJin\"")
  private BigDecimal beforeJin;

  @TableField("\"changeJin\"")
  private BigDecimal changeJin;

  @TableField("\"afterJin\"")
  private BigDecimal afterJin;

  @TableField("\"reason\"")
  private String reason;

  @TableField("\"operatorId\"")
  private String operatorId;

  @TableField("\"createdAt\"")
  private LocalDateTime createdAt;
}
