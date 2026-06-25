package cn.hentor.vegetables.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import cn.hentor.vegetables.entity.UserEntity;
import java.time.LocalDateTime;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;

public interface UserMapper extends BaseMapper<UserEntity> {
  @Insert("""
    INSERT INTO "User" (
      "id", "openid", "unionid", "phone", "defaultStoreId", "createdAt", "updatedAt"
    )
    VALUES (
      #{id}, #{openid}, #{unionid}, #{phone}, #{defaultStoreId}, #{createdAt}, #{updatedAt}
    )
    """)
  int insertWechatUser(UserEntity user);

  @Update("""
    UPDATE "User"
    SET "defaultStoreId" = #{defaultStoreId},
        "openid" = #{openid},
        "phone" = #{phone},
        "unionid" = #{unionid},
        "updatedAt" = #{updatedAt}
    WHERE "id" = #{id}
    """)
  int updateWechatUser(UserEntity user);

  @Update("""
    UPDATE "User"
    SET "nickname" = #{nickname},
        "updatedAt" = #{updatedAt}
    WHERE "id" = #{id}
    """)
  int updateMiniNickname(
    @Param("id") String id,
    @Param("nickname") String nickname,
    @Param("updatedAt") LocalDateTime updatedAt
  );

  @Update("""
    UPDATE "User"
    SET "avatarUrl" = #{avatarUrl},
        "updatedAt" = #{updatedAt}
    WHERE "id" = #{id}
    """)
  int updateMiniAvatarUrl(
    @Param("id") String id,
    @Param("avatarUrl") String avatarUrl,
    @Param("updatedAt") LocalDateTime updatedAt
  );

  @Update("""
    UPDATE "User"
    SET "disabledReason" = #{disabledReason},
        "remark" = #{remark},
        "updatedAt" = #{updatedAt}
    WHERE "id" = #{id}
    """)
  int updateAdminMemberProfile(
    @Param("id") String id,
    @Param("disabledReason") String disabledReason,
    @Param("remark") String remark,
    @Param("updatedAt") LocalDateTime updatedAt
  );

  @Update("""
    UPDATE "User"
    SET "status" = 'DISABLED',
        "disabledReason" = #{disabledReason},
        "updatedAt" = #{updatedAt}
    WHERE "id" = #{id}
    """)
  int disableMiniAccount(
    @Param("id") String id,
    @Param("disabledReason") String disabledReason,
    @Param("updatedAt") LocalDateTime updatedAt
  );

  @Update("""
    UPDATE "User"
    SET "defaultStoreId" = #{storeId},
        "updatedAt" = #{updatedAt}
    WHERE "id" = #{id}
    """)
  int updateDefaultStore(
    @Param("id") String id,
    @Param("storeId") String storeId,
    @Param("updatedAt") LocalDateTime updatedAt
  );
}
