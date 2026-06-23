package cn.hentor.vegetables.dto;

import com.fasterxml.jackson.databind.JsonNode;

public record Kuaidi100PrintResultDto(
  String kuaidinum,
  JsonNode rawResponse,
  String shipmentId,
  String taskId
) {}
