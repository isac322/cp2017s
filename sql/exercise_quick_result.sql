CREATE TABLE IF NOT EXISTS exercise_quick_result (
    group_id   MEDIUMINT UNSIGNED NOT NULL,
    student_id VARCHAR(32)        NOT NULL,
    PRIMARY KEY (group_id, student_id),
    FOREIGN KEY (group_id) REFERENCES exercise_group (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    FOREIGN KEY (student_id) REFERENCES user (student_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);