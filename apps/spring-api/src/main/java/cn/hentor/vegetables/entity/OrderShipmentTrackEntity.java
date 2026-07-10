package cn.hentor.vegetables.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("\"OrderShipmentTrack\"")
public class OrderShipmentTrackEntity {
  @TableId("\"id\"")
  private String id;

  @TableField("\"orderId\"")
  private String orderId;

  @TableField("\"shipmentId\"")
  private String shipmentId;

  @TableField("\"logisticsNo\"")
  private String logisticsNo;

  @TableField("\"kuaidicom\"")
  private String kuaidicom;

  @TableField("\"stateCode\"")
  private String stateCode;

  @TableField("\"stateText\"")
  private String stateText;

  @TableField("\"subscribeStatus\"")
  private String subscribeStatus;

  @TableField("\"subscribeMessage\"")
  private String subscribeMessage;

  @TableField("\"lastTraceTime\"")
  private LocalDateTime lastTraceTime;

  @TableField("\"lastSyncAt\"")
  private LocalDateTime lastSyncAt;

  @TableField("\"mapStatus\"")
  private String mapStatus;

  @TableField("\"mapMessage\"")
  private String mapMessage;

  @TableField("\"mapTrailUrl\"")
  private String mapTrailUrl;

  @TableField("\"mapArrivalTime\"")
  private String mapArrivalTime;

  @TableField("\"mapTotalTime\"")
  private String mapTotalTime;

  @TableField("\"mapRemainTime\"")
  private String mapRemainTime;

  @TableField("\"mapSyncedAt\"")
  private LocalDateTime mapSyncedAt;

  @TableField("\"mapRawJson\"")
  private String mapRawJson;

  @TableField("\"rawJson\"")
  private String rawJson;

  @TableField("\"createdAt\"")
  private LocalDateTime createdAt;

  @TableField("\"updatedAt\"")
  private LocalDateTime updatedAt;
}
