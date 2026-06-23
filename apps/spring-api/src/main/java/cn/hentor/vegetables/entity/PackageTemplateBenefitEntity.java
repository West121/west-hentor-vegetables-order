package cn.hentor.vegetables.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("\"PackageTemplateBenefit\"")
public class PackageTemplateBenefitEntity {
  @TableId("\"id\"")
  private String id;

  @TableField("\"templateId\"")
  private String templateId;

  @TableField("\"kind\"")
  private String kind;

  @TableField("\"name\"")
  private String name;

  @TableField("\"unit\"")
  private String unit;

  @TableField("\"totalQuantity\"")
  private BigDecimal totalQuantity;

  @TableField("\"sortOrder\"")
  private Integer sortOrder;

  @TableField("\"shipmentGroup\"")
  private String shipmentGroup;

  @TableField("\"createdAt\"")
  private LocalDateTime createdAt;

  @TableField("\"updatedAt\"")
  private LocalDateTime updatedAt;
}
