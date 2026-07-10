package cn.hentor.vegetables.dto;

import java.time.LocalDateTime;

public record OrderShipmentTrackEventDto(
  String content,
  LocalDateTime eventTime,
  String location,
  String status
) {}
