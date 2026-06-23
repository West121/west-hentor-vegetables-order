package cn.hentor.vegetables.dto;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.LocalDateTime;

public record OperationLogItemDto(
  String action,
  JsonNode afterValue,
  JsonNode beforeValue,
  LocalDateTime createdAt,
  Integer durationMs,
  String id,
  String ip,
  OperationLogActorDto operator,
  String resource,
  String resourceId,
  String requestMethod,
  JsonNode requestParams,
  String requestPath,
  JsonNode responseData,
  Integer statusCode,
  OperationLogStoreDto store,
  OperationLogUserDto user,
  String userAgent
) {}
