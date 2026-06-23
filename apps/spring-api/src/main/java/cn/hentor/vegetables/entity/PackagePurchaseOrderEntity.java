package cn.hentor.vegetables.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("\"PackagePurchaseOrder\"")
public class PackagePurchaseOrderEntity {
  @TableId("\"id\"")
  private String id;

  @TableField("\"storeId\"")
  private String storeId;

  @TableField("\"userId\"")
  private String userId;

  @TableField("\"templateId\"")
  private String templateId;

  @TableField("\"amountFen\"")
  private Integer amountFen;

  @TableField("\"status\"")
  private String status;

  @TableField("\"payChannel\"")
  private String payChannel;

  @TableField("\"expiresAt\"")
  private LocalDateTime expiresAt;

  @TableField("\"createdAt\"")
  private LocalDateTime createdAt;

  @TableField("\"updatedAt\"")
  private LocalDateTime updatedAt;
}
