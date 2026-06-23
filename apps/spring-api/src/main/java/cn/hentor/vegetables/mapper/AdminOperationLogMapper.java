package cn.hentor.vegetables.mapper;

import cn.hentor.vegetables.entity.AdminOperationLogEntity;
import com.github.yulichang.base.MPJBaseMapper;
import org.apache.ibatis.annotations.Insert;

public interface AdminOperationLogMapper extends MPJBaseMapper<AdminOperationLogEntity> {
  @Insert("""
    INSERT INTO "AdminOperationLog" (
      "id", "storeId", "operatorId", "userId", "resource", "resourceId", "action",
      "beforeValue", "afterValue", "requestMethod", "requestPath", "requestParams",
      "statusCode", "responseData", "durationMs", "ip", "userAgent", "createdAt"
    )
    VALUES (
      #{id}, #{storeId}, #{operatorId}, #{userId}, #{resource}, #{resourceId}, #{action},
      #{beforeValue}, #{afterValue},
      #{requestMethod}, #{requestPath}, #{requestParams},
      #{statusCode}, #{responseData}, #{durationMs}, #{ip}, #{userAgent}, #{createdAt}
    )
    """)
  int insertLog(AdminOperationLogEntity log);
}
