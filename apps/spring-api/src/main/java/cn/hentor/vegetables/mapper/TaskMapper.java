package cn.hentor.vegetables.mapper;

import cn.hentor.vegetables.entity.TaskEntity;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import java.time.LocalDateTime;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;

public interface TaskMapper extends BaseMapper<TaskEntity> {
  @Insert("""
    INSERT INTO "Task" (
      "id", "storeId", "name", "status", "startsAt", "endsAt",
      "cutoffTime", "tag", "createdAt", "updatedAt"
    )
    VALUES (
      #{id}, #{storeId}, #{name}, #{status},
      #{startsAt}, #{endsAt}, #{cutoffTime}, #{tag}, #{createdAt}, #{updatedAt}
    )
    """)
  int insertAdminTask(TaskEntity task);

  @Update("""
    UPDATE "Task"
    SET "name" = #{name},
        "status" = #{status},
        "startsAt" = #{startsAt},
        "endsAt" = #{endsAt},
        "cutoffTime" = #{cutoffTime},
        "tag" = #{tag},
        "updatedAt" = #{updatedAt}
    WHERE "id" = #{id}
    """)
  int updateAdminTask(TaskEntity task);

  @Update("""
    UPDATE "Task"
    SET "status" = 'DISABLED',
        "updatedAt" = #{updatedAt}
    WHERE "storeId" = #{storeId}
      AND "status" = 'ACTIVE'
      AND "endsAt" <= #{now}
    """)
  int disableExpiredActiveTasks(
    @Param("storeId") String storeId,
    @Param("now") LocalDateTime now,
    @Param("updatedAt") LocalDateTime updatedAt
  );
}
