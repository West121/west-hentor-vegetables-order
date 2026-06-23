package cn.hentor.vegetables.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("\"Store\"")
public class StoreEntity {
  @TableId("\"id\"")
  private String id;

  @TableField("\"franchiseeId\"")
  private String franchiseeId;

  @TableField("\"code\"")
  private String code;

  @TableField("\"name\"")
  private String name;

  @TableField("\"type\"")
  private String type;

  @TableField("\"status\"")
  private String status;

  @TableField("\"contactName\"")
  private String contactName;

  @TableField("\"contactPhone\"")
  private String contactPhone;

  @TableField("\"province\"")
  private String province;

  @TableField("\"city\"")
  private String city;

  @TableField("\"district\"")
  private String district;

  @TableField("\"address\"")
  private String address;

  @TableField("\"deliveryProvinces\"")
  private String deliveryProvinces;

  @TableField("\"deliveryCities\"")
  private String deliveryCities;

  @TableField("\"customerServiceTel\"")
  private String customerServiceTel;

  @TableField("\"cutoffTime\"")
  private String cutoffTime;

  @TableField("\"franchiseEndsAt\"")
  private LocalDateTime franchiseEndsAt;

  @TableField("\"createdAt\"")
  private LocalDateTime createdAt;

  @TableField("\"updatedAt\"")
  private LocalDateTime updatedAt;
}
