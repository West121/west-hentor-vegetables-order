package cn.hentor.vegetables.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("\"PackageTemplate\"")
public class PackageTemplateEntity {
  @TableId("\"id\"")
  private String id;

  @TableField("\"storeId\"")
  private String storeId;

  @TableField("\"name\"")
  private String name;

  @TableField("\"totalTimes\"")
  private Integer totalTimes;

  @TableField("\"weightLimitJin\"")
  private BigDecimal weightLimitJin;

  @TableField("\"validDays\"")
  private Integer validDays;

  @TableField("\"status\"")
  private String status;

  @TableField("\"sortOrder\"")
  private Integer sortOrder;

  @TableField("\"createdAt\"")
  private LocalDateTime createdAt;

  @TableField("\"updatedAt\"")
  private LocalDateTime updatedAt;
}
