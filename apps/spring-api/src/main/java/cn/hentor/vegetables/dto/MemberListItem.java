package cn.hentor.vegetables.dto;

import java.time.LocalDateTime;
import lombok.Data;

@Data
public class MemberListItem {
  private Integer activePackageCount;
  private String avatarUrl;
  private String bindingId;
  private MemberAddressDto defaultAddress;
  private String disabledReason;
  private MemberPackageDto latestActivePackage;
  private String nickname;
  private Integer orderCount;
  private String phone;
  private String remark;
  private String source;
  private String status;
  private LocalDateTime createdAt;
  private String userId;
  private String userStatus;
}
