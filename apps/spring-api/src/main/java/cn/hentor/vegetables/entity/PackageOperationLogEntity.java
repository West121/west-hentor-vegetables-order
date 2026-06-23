package cn.hentor.vegetables.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("\"PackageOperationLog\"")
public class PackageOperationLogEntity {
  @TableId("\"id\"")
  private String id;

  @TableField("\"userPackageId\"")
  private String userPackageId;

  @TableField("\"beforeValue\"")
  private String beforeValue;

  @TableField("\"afterValue\"")
  private String afterValue;

  @TableField("\"reason\"")
  private String reason;

  @TableField("\"operatorId\"")
  private String operatorId;

  @TableField("\"createdAt\"")
  private LocalDateTime createdAt;
}
