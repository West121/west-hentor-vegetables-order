package cn.hentor.vegetables.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("\"OrderShipment\"")
public class OrderShipmentEntity {
  @TableId("\"id\"")
  private String id;

  @TableField("\"orderId\"")
  private String orderId;

  @TableField("\"packageType\"")
  private String packageType;

  @TableField("\"packageName\"")
  private String packageName;

  @TableField("\"logisticsNo\"")
  private String logisticsNo;

  @TableField("\"kuaidicom\"")
  private String kuaidicom;

  @TableField("\"status\"")
  private String status;

  @TableField("\"sortOrder\"")
  private Integer sortOrder;

  @TableField("\"shippedAt\"")
  private LocalDateTime shippedAt;

  @TableField("\"signedAt\"")
  private LocalDateTime signedAt;

  @TableField("\"remark\"")
  private String remark;

  @TableField("\"createdAt\"")
  private LocalDateTime createdAt;

  @TableField("\"updatedAt\"")
  private LocalDateTime updatedAt;
}
