package cn.hentor.vegetables.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("\"Franchisee\"")
public class FranchiseeEntity {
  @TableId("\"id\"")
  private String id;

  @TableField("\"name\"")
  private String name;

  @TableField("\"contactName\"")
  private String contactName;

  @TableField("\"contactPhone\"")
  private String contactPhone;

  @TableField("\"status\"")
  private String status;

  @TableField("\"contractEndsAt\"")
  private LocalDateTime contractEndsAt;

  @TableField("\"remark\"")
  private String remark;

  @TableField("\"createdAt\"")
  private LocalDateTime createdAt;

  @TableField("\"updatedAt\"")
  private LocalDateTime updatedAt;
}
