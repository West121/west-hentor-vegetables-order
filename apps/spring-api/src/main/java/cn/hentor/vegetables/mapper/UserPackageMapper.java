package cn.hentor.vegetables.mapper;

import cn.hentor.vegetables.entity.UserPackageEntity;
import com.github.yulichang.base.MPJBaseMapper;
import java.time.LocalDateTime;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;

public interface UserPackageMapper extends MPJBaseMapper<UserPackageEntity> {
  @Insert("""
    INSERT INTO "UserPackage" (
      "id", "userId", "storeId", "templateId", "nameSnapshot", "totalTimes", "usedTimes",
      "weightLimitJin", "status", "frozenReason", "startsAt", "expiresAt", "createdAt", "updatedAt"
    )
    VALUES (
      #{id}, #{userId}, #{storeId}, #{templateId}, #{nameSnapshot}, #{totalTimes}, #{usedTimes},
      #{weightLimitJin}, #{status}, #{frozenReason}, #{startsAt},
      #{expiresAt}, #{createdAt}, #{updatedAt}
    )
    """)
  int insertAdminUserPackage(UserPackageEntity userPackage);

  @Update("""
    UPDATE "UserPackage"
    SET "totalTimes" = #{totalTimes},
        "usedTimes" = #{usedTimes},
        "weightLimitJin" = #{weightLimitJin},
        "updatedAt" = #{updatedAt}
    WHERE "id" = #{id}
    """)
  int updateAdminUserPackageAdjustment(UserPackageEntity userPackage);

  @Update("""
    UPDATE "UserPackage"
    SET "status" = #{status},
        "frozenReason" = #{frozenReason},
        "updatedAt" = #{updatedAt}
    WHERE "id" = #{id}
    """)
  int updateAdminUserPackageStatus(UserPackageEntity userPackage);

  @Delete("""
    DELETE FROM "UserPackage"
    WHERE "id" = #{id}
    """)
  int deleteAdminUserPackage(@Param("id") String id);

  @Update("""
    UPDATE "UserPackage"
    SET "usedTimes" = "usedTimes" + 1,
        "lastUsedAt" = #{lastUsedAt},
        "updatedAt" = #{updatedAt}
    WHERE "id" = #{id}
    """)
  int incrementUsedTimes(
    @Param("id") String id,
    @Param("lastUsedAt") LocalDateTime lastUsedAt,
    @Param("updatedAt") LocalDateTime updatedAt
  );

  @Update("""
    UPDATE "UserPackage"
    SET "usedTimes" = GREATEST("usedTimes" - 1, 0),
        "updatedAt" = #{updatedAt}
    WHERE "id" = #{id}
    """)
  int decrementUsedTimes(
    @Param("id") String id,
    @Param("updatedAt") LocalDateTime updatedAt
  );
}
