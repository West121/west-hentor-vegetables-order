package cn.hentor.vegetables.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("\"MemberStoreBinding\"")
public class MemberStoreBindingEntity {
  @TableId("\"id\"")
  private String id;

  @TableField("\"userId\"")
  private String userId;

  @TableField("\"storeId\"")
  private String storeId;

  @TableField("\"status\"")
  private String status;

  @TableField("\"source\"")
  private String source;

  @TableField("\"isDefault\"")
  private Boolean isDefault;

  @TableField("\"createdAt\"")
  private LocalDateTime createdAt;

  @TableField("\"updatedAt\"")
  private LocalDateTime updatedAt;
}
