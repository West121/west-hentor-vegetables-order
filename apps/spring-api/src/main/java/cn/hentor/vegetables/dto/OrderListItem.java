package cn.hentor.vegetables.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import lombok.Data;

@Data
public class OrderListItem {
  private Map<String, String> addressSnapshot;
  private List<AdminOrderBenefitItemDto> benefitItems;
  private String id;
  private List<AdminOrderItemDto> items;
  private String logisticsNo;
  private String orderNo;
  private String packageName;
  private List<AdminOrderShipmentDto> shipments;
  private String status;
  private BigDecimal totalWeightJin;
  private LocalDateTime createdAt;
  private String userAvatarUrl;
  private String userNickname;
  private String userPhone;
}
