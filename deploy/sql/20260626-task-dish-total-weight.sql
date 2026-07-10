SET @task_dish_total_weight_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'TaskDish'
    AND COLUMN_NAME = 'totalWeightJin'
);

SET @task_dish_total_weight_sql := IF(
  @task_dish_total_weight_exists = 0,
  'ALTER TABLE `TaskDish` ADD COLUMN `totalWeightJin` decimal(10,2) NOT NULL DEFAULT 0',
  'SELECT 1'
);

PREPARE task_dish_total_weight_stmt FROM @task_dish_total_weight_sql;
EXECUTE task_dish_total_weight_stmt;
DEALLOCATE PREPARE task_dish_total_weight_stmt;

UPDATE `TaskDish` td
JOIN `Dish` d ON d.`id` = td.`dishId`
SET td.`totalWeightJin` = COALESCE(NULLIF(d.`stockJin`, 0), 20)
WHERE td.`totalWeightJin` = 0;
