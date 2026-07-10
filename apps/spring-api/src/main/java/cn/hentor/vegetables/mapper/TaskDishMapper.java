package cn.hentor.vegetables.mapper;

import cn.hentor.vegetables.entity.TaskDishEntity;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Param;

public interface TaskDishMapper extends BaseMapper<TaskDishEntity> {
  @Delete("""
    DELETE FROM "TaskDish"
    WHERE "taskId" = #{taskId}
    """)
  int deleteByTaskId(@Param("taskId") String taskId);

  @Insert("""
    INSERT INTO "TaskDish" ("taskId", "dishId", "sortOrder", "totalWeightJin")
    VALUES (#{taskId}, #{dishId}, #{sortOrder}, #{totalWeightJin})
    """)
  int insertTaskDish(TaskDishEntity taskDish);
}
