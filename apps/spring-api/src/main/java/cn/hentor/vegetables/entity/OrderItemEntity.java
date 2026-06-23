package cn.hentor.vegetables.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.math.BigDecimal;
import lombok.Data;

@Data
@TableName("\"OrderItem\"")
public class OrderItemEntity {
  @TableId("\"id\"")
  private String id;

  @TableField("\"orderId\"")
  private String orderId;

  @TableField("\"dishId\"")
  private String dishId;

  @TableField("\"dishNameSnapshot\"")
  private String dishNameSnapshot;

  @TableField("\"weightJin\"")
  private BigDecimal weightJin;

  @TableField("\"stepJinSnapshot\"")
  private BigDecimal stepJinSnapshot;
}
