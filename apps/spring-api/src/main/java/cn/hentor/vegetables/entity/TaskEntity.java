package cn.hentor.vegetables.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("\"Task\"")
public class TaskEntity {
  @TableId("\"id\"")
  private String id;

  @TableField("\"storeId\"")
  private String storeId;

  @TableField("\"name\"")
  private String name;

  @TableField("\"status\"")
  private String status;

  @TableField("\"startsAt\"")
  private LocalDateTime startsAt;

  @TableField("\"endsAt\"")
  private LocalDateTime endsAt;

  @TableField("\"cutoffTime\"")
  private String cutoffTime;

  @TableField("\"tag\"")
  private String tag;

  @TableField("\"createdAt\"")
  private LocalDateTime createdAt;

  @TableField("\"updatedAt\"")
  private LocalDateTime updatedAt;
}
