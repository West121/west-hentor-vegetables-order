package cn.hentor.vegetables.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("\"OrderChangeLog\"")
public class OrderChangeLogEntity {
  @TableId("\"id\"")
  private String id;

  @TableField("\"orderId\"")
  private String orderId;

  @TableField("\"beforeItems\"")
  private String beforeItems;

  @TableField("\"afterItems\"")
  private String afterItems;

  @TableField("\"beforeAddress\"")
  private String beforeAddress;

  @TableField("\"afterAddress\"")
  private String afterAddress;

  @TableField("\"source\"")
  private String source;

  @TableField("\"operatorId\"")
  private String operatorId;

  @TableField("\"createdAt\"")
  private LocalDateTime createdAt;
}
