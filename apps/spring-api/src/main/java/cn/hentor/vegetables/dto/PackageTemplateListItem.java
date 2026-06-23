package cn.hentor.vegetables.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import lombok.Data;

@Data
public class PackageTemplateListItem {
  private String id;
  private String name;
  private String status;
  private BigDecimal weightLimitJin;
  private Integer sortOrder;
  private Integer totalTimes;
  private LocalDateTime createdAt;
  private List<TemplateBenefitItem> benefits;

  @Data
  public static class TemplateBenefitItem {
    private String id;
    private String kind;
    private String name;
    private String shipmentGroup;
    private String unit;
    private BigDecimal totalQuantity;
    private Integer sortOrder;
  }
}
