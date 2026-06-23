package cn.hentor.vegetables.mapper;

import cn.hentor.vegetables.entity.FranchiseeEntity;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Update;

public interface FranchiseeMapper extends BaseMapper<FranchiseeEntity> {
  @Insert("""
    INSERT INTO "Franchisee" (
      "id", "name", "contactName", "contactPhone", "status",
      "contractEndsAt", "remark", "createdAt", "updatedAt"
    )
    VALUES (
      #{id}, #{name}, #{contactName}, #{contactPhone}, #{status},
      #{contractEndsAt}, #{remark}, #{createdAt}, #{updatedAt}
    )
    """)
  int insertAdminFranchisee(FranchiseeEntity franchisee);

  @Update("""
    UPDATE "Franchisee"
    SET "name" = #{name},
        "contactName" = #{contactName},
        "contactPhone" = #{contactPhone},
        "status" = #{status},
        "contractEndsAt" = #{contractEndsAt},
        "remark" = #{remark},
        "updatedAt" = #{updatedAt}
    WHERE "id" = #{id}
    """)
  int updateAdminFranchisee(FranchiseeEntity franchisee);
}
