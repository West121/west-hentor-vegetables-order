package cn.hentor.vegetables.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("\"AdminOperationLog\"")
public class AdminOperationLogEntity {
  @TableId("\"id\"")
  private String id;

  @TableField("\"storeId\"")
  private String storeId;

  @TableField("\"operatorId\"")
  private String operatorId;

  @TableField("\"userId\"")
  private String userId;

  @TableField("\"resource\"")
  private String resource;

  @TableField("\"resourceId\"")
  private String resourceId;

  @TableField("\"action\"")
  private String action;

  @TableField("\"beforeValue\"")
  private String beforeValue;

  @TableField("\"afterValue\"")
  private String afterValue;

  @TableField("\"requestMethod\"")
  private String requestMethod;

  @TableField("\"requestPath\"")
  private String requestPath;

  @TableField("\"requestParams\"")
  private String requestParams;

  @TableField("\"statusCode\"")
  private Integer statusCode;

  @TableField("\"responseData\"")
  private String responseData;

  @TableField("\"durationMs\"")
  private Integer durationMs;

  @TableField("\"ip\"")
  private String ip;

  @TableField("\"userAgent\"")
  private String userAgent;

  @TableField("\"createdAt\"")
  private LocalDateTime createdAt;
}
