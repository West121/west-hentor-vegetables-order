package cn.hentor.vegetables.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("\"Dish\"")
public class DishEntity {
  @TableId("\"id\"")
  private String id;

  @TableField("\"storeId\"")
  private String storeId;

  @TableField("\"name\"")
  private String name;

  @TableField("\"category\"")
  private String category;

  @TableField("\"status\"")
  private String status;

  @TableField("\"stepJin\"")
  private BigDecimal stepJin;

  @TableField("\"stockJin\"")
  private BigDecimal stockJin;

  @TableField("\"imageKey\"")
  private String imageKey;

  @TableField("\"imageUrl\"")
  private String imageUrl;

  @TableField("\"description\"")
  private String description;

  @TableField("\"sortOrder\"")
  private Integer sortOrder;

  @TableField("\"deletedAt\"")
  private LocalDateTime deletedAt;

  @TableField("\"createdAt\"")
  private LocalDateTime createdAt;

  @TableField("\"updatedAt\"")
  private LocalDateTime updatedAt;
}
