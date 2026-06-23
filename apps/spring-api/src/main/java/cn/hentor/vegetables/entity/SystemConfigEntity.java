package cn.hentor.vegetables.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("\"SystemConfig\"")
public class SystemConfigEntity {
  @TableId("\"id\"")
  private String id;

  @TableField("\"storeId\"")
  private String storeId;

  @TableField("\"key\"")
  private String key;

  @TableField("\"value\"")
  private String value;

  @TableField("\"createdAt\"")
  private LocalDateTime createdAt;

  @TableField("\"updatedAt\"")
  private LocalDateTime updatedAt;
}
