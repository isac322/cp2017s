CREATE TABLE IF NOT EXISTS history (
    id                MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    homework_id       MEDIUMINT UNSIGNED,
    homework_entry_id MEDIUMINT UNSIGNED,
    exercise_id       MEDIUMINT UNSIGNED,
    exercise_group_id MEDIUMINT UNSIGNED,
    project_id        MEDIUMINT UNSIGNED,
    project_entry_id  MEDIUMINT UNSIGNED,
    category          ENUM ('Homework', 'Exercise', 'Project'),
    student_id        VARCHAR(32)        NOT NULL,
    created           TIMESTAMP          NOT NULL,
    email             VARCHAR(100)       NOT NULL,
    FOREIGN KEY (homework_id) REFERENCES homework_log (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    FOREIGN KEY (homework_entry_id) REFERENCES homework_entry (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    FOREIGN KEY (exercise_id) REFERENCES exercise_judge_log (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    FOREIGN KEY (exercise_group_id) REFERENCES exercise_group (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES project_log (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    FOREIGN KEY (project_entry_id) REFERENCES project_entry (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES user (student_id)
        ON UPDATE CASCADE,
    FOREIGN KEY (student_id, email) REFERENCES email (student_id, email)
        ON UPDATE CASCADE,
    INDEX (created)
)