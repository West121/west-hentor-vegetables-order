package cn.hentor.vegetables.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("\"Address\"")
public class AddressEntity {
  @TableId("\"id\"")
  private String id;

  @TableField("\"userId\"")
  private String userId;

  @TableField("\"storeId\"")
  private String storeId;

  @TableField("\"receiverName\"")
  private String receiverName;

  @TableField("\"receiverPhone\"")
  private String receiverPhone;

  @TableField("\"province\"")
  private String province;

  @TableField("\"city\"")
  private String city;

  @TableField("\"district\"")
  private String district;

  @TableField("\"detail\"")
  private String detail;

  @TableField("\"isDefault\"")
  private Boolean isDefault;

  @TableField("\"createdAt\"")
  private LocalDateTime createdAt;

  @TableField("\"updatedAt\"")
  private LocalDateTime updatedAt;
}
