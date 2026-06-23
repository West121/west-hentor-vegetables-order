package cn.hentor.vegetables.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.Data;

@Data
public class OrderListItem {
  private String id;
  private String logisticsNo;
  private String orderNo;
  private String packageName;
  private String status;
  private BigDecimal totalWeightJin;
  private LocalDateTime createdAt;
  private String userNickname;
  private String userPhone;
}
