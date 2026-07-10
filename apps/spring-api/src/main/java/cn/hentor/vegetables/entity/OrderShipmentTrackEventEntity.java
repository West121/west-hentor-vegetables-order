package cn.hentor.vegetables.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("\"OrderShipmentTrackEvent\"")
public class OrderShipmentTrackEventEntity {
  @TableId("\"id\"")
  private String id;

  @TableField("\"trackId\"")
  private String trackId;

  @TableField("\"shipmentId\"")
  private String shipmentId;

  @TableField("\"eventTime\"")
  private LocalDateTime eventTime;

  @TableField("\"content\"")
  private String content;

  @TableField("\"location\"")
  private String location;

  @TableField("\"status\"")
  private String status;

  @TableField("\"sortOrder\"")
  private Integer sortOrder;

  @TableField("\"rawJson\"")
  private String rawJson;

  @TableField("\"createdAt\"")
  private LocalDateTime createdAt;
}
