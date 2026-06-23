package cn.hentor.vegetables.mapper;

import cn.hentor.vegetables.entity.PackageOperationLogEntity;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Insert;

public interface PackageOperationLogMapper extends BaseMapper<PackageOperationLogEntity> {
  @Insert("""
    INSERT INTO "PackageOperationLog" (
      "id", "userPackageId", "beforeValue", "afterValue", "reason", "operatorId", "createdAt"
    )
    VALUES (
      #{id}, #{userPackageId}, #{beforeValue}, #{afterValue},
      #{reason}, #{operatorId}, #{createdAt}
    )
    """)
  int insertLog(PackageOperationLogEntity log);
}
