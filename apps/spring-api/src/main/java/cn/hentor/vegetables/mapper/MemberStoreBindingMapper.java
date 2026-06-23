package cn.hentor.vegetables.mapper;

import cn.hentor.vegetables.entity.MemberStoreBindingEntity;
import com.github.yulichang.base.MPJBaseMapper;
import java.time.LocalDateTime;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Update;

public interface MemberStoreBindingMapper
  extends MPJBaseMapper<MemberStoreBindingEntity> {
  @Insert("""
    INSERT INTO "MemberStoreBinding" (
      "id", "userId", "storeId", "status", "source", "isDefault", "createdAt", "updatedAt"
    )
    VALUES (
      #{id}, #{userId}, #{storeId}, #{status},
      #{source}, #{isDefault}, #{createdAt}, #{updatedAt}
    )
    """)
  int insertAdminBinding(MemberStoreBindingEntity binding);

  @Update("""
    UPDATE "MemberStoreBinding"
    SET "status" = #{status},
        "isDefault" = #{isDefault},
        "updatedAt" = #{updatedAt}
    WHERE "id" = #{id}
    """)
  int updateAdminBinding(MemberStoreBindingEntity binding);

  @Update("""
    UPDATE "MemberStoreBinding"
    SET "status" = 'DISABLED',
        "updatedAt" = #{updatedAt}
    WHERE "id" = #{id}
    """)
  int disableMiniBinding(MemberStoreBindingEntity binding);

  @Update("""
    UPDATE "MemberStoreBinding"
    SET "isDefault" = false,
        "updatedAt" = #{updatedAt}
    WHERE "userId" = #{userId}
    """)
  int clearDefaultForUser(
    @Param("userId") String userId,
    @Param("updatedAt") LocalDateTime updatedAt
  );

  @Update("""
    UPDATE "MemberStoreBinding"
    SET "isDefault" = true,
        "updatedAt" = #{updatedAt}
    WHERE "userId" = #{userId}
      AND "storeId" = #{storeId}
    """)
  int markDefaultForUserStore(
    @Param("userId") String userId,
    @Param("storeId") String storeId,
    @Param("updatedAt") LocalDateTime updatedAt
  );
}
