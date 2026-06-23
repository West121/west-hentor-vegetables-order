package cn.hentor.vegetables.dto;

import java.time.LocalDateTime;
import java.util.List;

public record StoreManagementItemDto(
  String address,
  String addressDetail,
  long adminUserCount,
  String city,
  String code,
  String contactName,
  String contactPhone,
  LocalDateTime createdAt,
  String customerServiceTel,
  String cutoffTime,
  List<String> deliveryCities,
  List<String> deliveryProvinces,
  String district,
  LocalDateTime franchiseEndsAt,
  StoreManagementFranchiseeDto franchisee,
  String franchiseeId,
  String franchiseeName,
  String id,
  long memberCount,
  String name,
  boolean operatorVisible,
  long orderCount,
  long packageTemplateCount,
  String province,
  String status,
  String type,
  LocalDateTime updatedAt
) {}
