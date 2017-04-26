CREATE VIEW view_exercise_quick_result AS
	SELECT
		attachment_id,
		student_id
	FROM exercise_log
		JOIN exercise_result ON exercise_log.id = exercise_result.log_id AND exercise_result.type = 0
	GROUP BY attachment_id, student_id;