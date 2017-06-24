CREATE VIEW project_board AS
    SELECT
        a.id AS `log_id`,
        a.student_id,
        a.attachment_id,
        a.submitted,
        a.file_name
    FROM project_log AS a LEFT OUTER JOIN project_log AS b
            ON a.student_id = b.student_id AND a.attachment_id = b.attachment_id AND a.submitted < b.submitted
    WHERE b.student_id IS NULL
    ORDER BY a.student_id, a.attachment_id;
