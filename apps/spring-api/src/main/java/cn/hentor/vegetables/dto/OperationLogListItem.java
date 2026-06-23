package cn.hentor.vegetables.dto;

import java.time.LocalDateTime;
import lombok.Data;

@Data
public class OperationLogListItem {
  private String action;
  private String afterValue;
  private String beforeValue;
  private LocalDateTime createdAt;
  private Integer durationMs;
  private String id;
  private String ip;
  private String operatorActorId;
  private String operatorName;
  private String operatorUsername;
  private String requestMethod;
  private String requestParams;
  private String requestPath;
  private String resource;
  private String resourceId;
  private String responseData;
  private Integer statusCode;
  private String storeActorId;
  private String storeCode;
  private String storeName;
  private String storeType;
  private String userActorId;
  private String userAgent;
  private String userNickname;
  private String userPhone;
}
