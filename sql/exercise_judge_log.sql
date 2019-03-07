CREATE TABLE IF NOT EXISTS exercise_judge_log (
    id         MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(32)        NOT NULL,
    group_id   MEDIUMINT UNSIGNED NOT NULL,
    email      VARCHAR(100)       NOT NULL,
    created    TIMESTAMP          NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES user (student_id)
        ON UPDATE CASCADE,
    FOREIGN KEY (student_id, email) REFERENCES email (student_id, email)
        ON UPDATE CASCADE,
    FOREIGN KEY (group_id) REFERENCES exercise_group (id)
        ON UPDATE CASCADE
);

CREATE TRIGGER exercise_history_updater
AFTER INSERT ON exercise_judge_log
FOR EACH ROW
    BEGIN
        INSERT INTO history (exercise_id, exercise_group_id, student_id, category, created, email)
            VALUE (NEW.id, NEW.group_id, NEW.student_id, 'Exercise', NEW.created, NEW.email);
    END;