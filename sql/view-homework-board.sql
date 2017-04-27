CREATE VIEW homework_board AS
	SELECT
		a.id,
		a.student_id,
		a.attachment_id,
		a.submitted,
		name
	FROM homework_log AS a LEFT OUTER JOIN homework_log AS b
			ON a.student_id = b.student_id AND a.attachment_id = b.attachment_id AND a.submitted < b.submitted
		JOIN user ON a.student_id = user.student_id
	WHERE b.student_id IS NULL
	ORDER BY a.student_id, a.attachment_id;
