package cn.hentor.vegetables.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

@Data
@TableName("\"TaskDish\"")
public class TaskDishEntity {
  @TableField("\"taskId\"")
  private String taskId;

  @TableField("\"dishId\"")
  private String dishId;

  @TableField("\"sortOrder\"")
  private Integer sortOrder;
}
