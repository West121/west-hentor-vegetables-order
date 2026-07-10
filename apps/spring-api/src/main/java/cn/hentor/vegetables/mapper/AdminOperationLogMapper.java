package cn.hentor.vegetables.mapper;

import cn.hentor.vegetables.entity.AdminOperationLogEntity;
import cn.hentor.vegetables.service.OperationLogRequestContext;
import com.github.yulichang.base.MPJBaseMapper;
import org.apache.ibatis.annotations.Insert;

public interface AdminOperationLogMapper extends MPJBaseMapper<AdminOperationLogEntity> {
  default int insertLog(AdminOperationLogEntity log) {
    OperationLogRequestContext.enrich(log);
    return insertLogRow(log);
  }

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
  int insertLogRow(AdminOperationLogEntity log);
}
