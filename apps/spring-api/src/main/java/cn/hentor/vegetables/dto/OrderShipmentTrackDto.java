package cn.hentor.vegetables.dto;

import java.time.LocalDateTime;
import java.util.List;

public record OrderShipmentTrackDto(
  String logisticsNo,
  String kuaidicom,
  String stateCode,
  String stateText,
  String subscribeStatus,
  String subscribeMessage,
  LocalDateTime lastTraceTime,
  LocalDateTime lastSyncAt,
  String mapStatus,
  String mapMessage,
  String mapTrailUrl,
  String mapArrivalTime,
  String mapTotalTime,
  String mapRemainTime,
  LocalDateTime mapSyncedAt,
  List<OrderShipmentTrackEventDto> events
) {}
