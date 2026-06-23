package cn.hentor.vegetables.mapper;

import cn.hentor.vegetables.entity.SystemConfigEntity;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Insert;

public interface SystemConfigMapper extends BaseMapper<SystemConfigEntity> {
  @Insert("""
    INSERT INTO "SystemConfig" ("id", "storeId", "key", "value", "createdAt", "updatedAt")
    VALUES (#{id}, #{storeId}, #{key}, #{value}, #{createdAt}, #{updatedAt})
    ON DUPLICATE KEY UPDATE "value" = VALUES("value"), "updatedAt" = VALUES("updatedAt")
    """)
  int upsertStoreConfig(SystemConfigEntity config);
}
