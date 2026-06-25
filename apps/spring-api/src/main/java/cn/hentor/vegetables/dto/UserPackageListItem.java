package cn.hentor.vegetables.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.Data;

@Data
public class UserPackageListItem {
  private String frozenReason;
  private String id;
  private String nameSnapshot;
  private String status;
  private BigDecimal weightLimitJin;
  private Integer remainingTimes;
  private Integer totalTimes;
  private Integer usedTimes;
  private LocalDateTime createdAt;
  private LocalDateTime lastUsedAt;
  private String userId;
  private String userAvatarUrl;
  private String userNickname;
  private String userPhone;
  private String userStatus;
}
