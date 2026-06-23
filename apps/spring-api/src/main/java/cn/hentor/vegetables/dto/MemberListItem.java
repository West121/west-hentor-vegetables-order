package cn.hentor.vegetables.dto;

import java.time.LocalDateTime;
import lombok.Data;

@Data
public class MemberListItem {
  private String bindingId;
  private String disabledReason;
  private String nickname;
  private String phone;
  private String remark;
  private String source;
  private String status;
  private LocalDateTime createdAt;
  private String userId;
  private String userStatus;
}
