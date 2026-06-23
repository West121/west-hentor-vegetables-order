package cn.hentor.vegetables.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

@Data
@TableName("\"AdminUserStore\"")
public class AdminUserStoreEntity {
  @TableField("\"adminUserId\"")
  private String adminUserId;

  @TableField("\"storeId\"")
  private String storeId;
}
