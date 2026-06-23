package cn.hentor.vegetables.mapper;

import cn.hentor.vegetables.entity.PackageTemplateEntity;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Update;

public interface PackageTemplateMapper extends BaseMapper<PackageTemplateEntity> {
  @Insert("""
    INSERT INTO "PackageTemplate" (
      "id", "storeId", "name", "totalTimes", "weightLimitJin", "validDays",
      "status", "sortOrder", "createdAt", "updatedAt"
    )
    VALUES (
      #{id}, #{storeId}, #{name}, #{totalTimes}, #{weightLimitJin}, #{validDays},
      #{status}, #{sortOrder}, #{createdAt}, #{updatedAt}
    )
    """)
  int insertAdminPackageTemplate(PackageTemplateEntity template);

  @Update("""
    UPDATE "PackageTemplate"
    SET "name" = #{name},
        "totalTimes" = #{totalTimes},
        "weightLimitJin" = #{weightLimitJin},
        "validDays" = #{validDays},
        "status" = #{status},
        "sortOrder" = #{sortOrder},
        "updatedAt" = #{updatedAt}
    WHERE "id" = #{id}
    """)
  int updateAdminPackageTemplate(PackageTemplateEntity template);
}
