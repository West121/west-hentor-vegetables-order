package cn.hentor.vegetables.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("\"Order\"")
public class OrderEntity {
  @TableId("\"id\"")
  private String id;

  @TableField("\"storeId\"")
  private String storeId;

  @TableField("\"userId\"")
  private String userId;

  @TableField("\"userPackageId\"")
  private String userPackageId;

  @TableField("\"addressId\"")
  private String addressId;

  @TableField("\"orderNo\"")
  private String orderNo;

  @TableField("\"status\"")
  private String status;

  @TableField("\"totalWeightJin\"")
  private BigDecimal totalWeightJin;

  @TableField("\"addressSnapshot\"")
  private String addressSnapshot;

  @TableField("\"logisticsNo\"")
  private String logisticsNo;

  @TableField("\"userVisibleRemark\"")
  private String userVisibleRemark;

  @TableField("\"internalRemark\"")
  private String internalRemark;

  @TableField("\"cancelReason\"")
  private String cancelReason;

  @TableField("\"shippedAt\"")
  private LocalDateTime shippedAt;

  @TableField("\"signedAt\"")
  private LocalDateTime signedAt;

  @TableField("\"canceledAt\"")
  private LocalDateTime canceledAt;

  @TableField("\"modifiedAt\"")
  private LocalDateTime modifiedAt;

  @TableField("\"deletedByUserAt\"")
  private LocalDateTime deletedByUserAt;

  @TableField("\"createdAt\"")
  private LocalDateTime createdAt;

  @TableField("\"updatedAt\"")
  private LocalDateTime updatedAt;
}
