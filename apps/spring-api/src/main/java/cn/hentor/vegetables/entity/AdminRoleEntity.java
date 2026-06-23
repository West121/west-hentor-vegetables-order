package cn.hentor.vegetables.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("\"AdminRole\"")
public class AdminRoleEntity {
  @TableId("\"id\"")
  private String id;

  @TableField("\"code\"")
  private String code;

  @TableField("\"name\"")
  private String name;

  @TableField("\"createdAt\"")
  private LocalDateTime createdAt;

  @TableField("\"updatedAt\"")
  private LocalDateTime updatedAt;
}
