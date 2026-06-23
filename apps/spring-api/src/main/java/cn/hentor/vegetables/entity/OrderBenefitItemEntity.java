package cn.hentor.vegetables.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.math.BigDecimal;
import lombok.Data;

@Data
@TableName("\"OrderBenefitItem\"")
public class OrderBenefitItemEntity {
  @TableId("\"id\"")
  private String id;

  @TableField("\"orderId\"")
  private String orderId;

  @TableField("\"userPackageBenefitId\"")
  private String userPackageBenefitId;

  @TableField("\"kind\"")
  private String kind;

  @TableField("\"nameSnapshot\"")
  private String nameSnapshot;

  @TableField("\"unitSnapshot\"")
  private String unitSnapshot;

  @TableField("\"quantity\"")
  private BigDecimal quantity;

  @TableField("\"shipmentGroup\"")
  private String shipmentGroup;
}
