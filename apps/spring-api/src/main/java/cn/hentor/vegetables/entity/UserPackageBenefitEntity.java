package cn.hentor.vegetables.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("\"UserPackageBenefit\"")
public class UserPackageBenefitEntity {
  @TableId("\"id\"")
  private String id;

  @TableField("\"userPackageId\"")
  private String userPackageId;

  @TableField("\"templateBenefitId\"")
  private String templateBenefitId;

  @TableField("\"kind\"")
  private String kind;

  @TableField("\"nameSnapshot\"")
  private String nameSnapshot;

  @TableField("\"unitSnapshot\"")
  private String unitSnapshot;

  @TableField("\"totalQuantity\"")
  private BigDecimal totalQuantity;

  @TableField("\"usedQuantity\"")
  private BigDecimal usedQuantity;

  @TableField("\"sortOrder\"")
  private Integer sortOrder;

  @TableField("\"shipmentGroup\"")
  private String shipmentGroup;

  @TableField("\"createdAt\"")
  private LocalDateTime createdAt;

  @TableField("\"updatedAt\"")
  private LocalDateTime updatedAt;
}
