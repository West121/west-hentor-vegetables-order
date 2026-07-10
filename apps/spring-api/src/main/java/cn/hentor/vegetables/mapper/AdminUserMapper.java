package cn.hentor.vegetables.mapper;

import cn.hentor.vegetables.dto.AdminUserStatusCountRow;
import cn.hentor.vegetables.entity.AdminUserEntity;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import java.util.List;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

public interface AdminUserMapper extends BaseMapper<AdminUserEntity> {
  @Select("""
    <script>
    SELECT u."id", u."username", u."name", u."phone", u."passwordHash", u."status",
           u."lastLoginAt", u."createdAt", u."updatedAt"
    FROM "AdminUser" u
    WHERE 1 = 1
    <if test="status != null and status != ''">
      AND u."status" = #{status}
    </if>
    <if test="query != null and query != ''">
      AND (
        u."username" LIKE CONCAT('%', #{query}, '%')
        OR u."name" LIKE CONCAT('%', #{query}, '%')
        OR COALESCE(u."phone", '') LIKE CONCAT('%', #{query}, '%')
      )
    </if>
    <if test="storeIds != null and storeIds.size > 0">
      AND EXISTS (
        SELECT 1
        FROM "AdminUserStore" aus
        WHERE aus."adminUserId" = u."id"
          AND aus."storeId" IN
          <foreach collection="storeIds" item="storeId" open="(" separator="," close=")">
            #{storeId}
          </foreach>
      )
    </if>
    ORDER BY u."createdAt" DESC, u."id" DESC
    LIMIT #{limit}
    OFFSET #{offset}
    </script>
    """)
  List<AdminUserEntity> selectAdminUsers(
    @Param("query") String query,
    @Param("status") String status,
    @Param("storeIds") List<String> storeIds,
    @Param("limit") long limit,
    @Param("offset") long offset
  );

  @Select("""
    <script>
    SELECT COUNT(*)
    FROM "AdminUser" u
    WHERE 1 = 1
    <if test="status != null and status != ''">
      AND u."status" = #{status}
    </if>
    <if test="query != null and query != ''">
      AND (
        u."username" LIKE CONCAT('%', #{query}, '%')
        OR u."name" LIKE CONCAT('%', #{query}, '%')
        OR COALESCE(u."phone", '') LIKE CONCAT('%', #{query}, '%')
      )
    </if>
    <if test="storeIds != null and storeIds.size > 0">
      AND EXISTS (
        SELECT 1
        FROM "AdminUserStore" aus
        WHERE aus."adminUserId" = u."id"
          AND aus."storeId" IN
          <foreach collection="storeIds" item="storeId" open="(" separator="," close=")">
            #{storeId}
          </foreach>
      )
    </if>
    </script>
    """)
  Long countAdminUsers(
    @Param("query") String query,
    @Param("status") String status,
    @Param("storeIds") List<String> storeIds
  );

  @Select("""
    <script>
    SELECT u."status" AS status, COUNT(*) AS count
    FROM "AdminUser" u
    WHERE 1 = 1
    <if test="status != null and status != ''">
      AND u."status" = #{status}
    </if>
    <if test="query != null and query != ''">
      AND (
        u."username" LIKE CONCAT('%', #{query}, '%')
        OR u."name" LIKE CONCAT('%', #{query}, '%')
        OR COALESCE(u."phone", '') LIKE CONCAT('%', #{query}, '%')
      )
    </if>
    <if test="storeIds != null and storeIds.size > 0">
      AND EXISTS (
        SELECT 1
        FROM "AdminUserStore" aus
        WHERE aus."adminUserId" = u."id"
          AND aus."storeId" IN
          <foreach collection="storeIds" item="storeId" open="(" separator="," close=")">
            #{storeId}
          </foreach>
      )
    </if>
    GROUP BY u."status"
    </script>
    """)
  List<AdminUserStatusCountRow> countAdminUsersByStatus(
    @Param("query") String query,
    @Param("status") String status,
    @Param("storeIds") List<String> storeIds
  );

  @Insert("""
    INSERT INTO "AdminUser" (
      "id", "username", "name", "phone", "passwordHash", "status", "lastLoginAt",
      "createdAt", "updatedAt"
    )
    VALUES (
      #{id}, #{username}, #{name}, #{phone}, #{passwordHash},
      #{status}, #{lastLoginAt}, #{createdAt}, #{updatedAt}
    )
    """)
  int insertAdminUser(AdminUserEntity adminUser);

  @Update("""
    UPDATE "AdminUser"
    SET "name" = #{name},
        "phone" = #{phone},
        "status" = #{status},
        "updatedAt" = #{updatedAt}
    WHERE "id" = #{id}
    """)
  int updateAdminUserProfile(AdminUserEntity adminUser);

  @Update("""
    UPDATE "AdminUser"
    SET "passwordHash" = #{passwordHash},
        "updatedAt" = #{updatedAt}
    WHERE "id" = #{id}
    """)
  int updateAdminUserPassword(AdminUserEntity adminUser);
}
