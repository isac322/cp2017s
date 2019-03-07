CREATE TABLE IF NOT EXISTS homework_latest_entry (
    student_id  VARCHAR(32)        NOT NULL,
    homework_id MEDIUMINT UNSIGNED NOT NULL,
    group_id    MEDIUMINT UNSIGNED NOT NULL,
    entry_id    MEDIUMINT UNSIGNED NOT NULL,
    log_id      MEDIUMINT UNSIGNED NOT NULL,
    FOREIGN KEY (student_id) REFERENCES user (student_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    FOREIGN KEY (homework_id) REFERENCES homework (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    FOREIGN KEY (group_id) REFERENCES homework_group (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    FOREIGN KEY (entry_id) REFERENCES homework_entry (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    FOREIGN KEY (log_id) REFERENCES homework_log (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    PRIMARY KEY (student_id, homework_id, group_id, entry_id)
);

CREATE TRIGGER insert_homework
AFTER INSERT ON homework_log
FOR EACH ROW
    BEGIN
        DECLARE groupId, homeworkId MEDIUMINT UNSIGNED;
        SELECT
            homework_group.id,
            homework_id
        INTO groupId, homeworkId
        FROM homework_entry
            JOIN homework_group ON homework_entry.group_id = homework_group.id
        WHERE homework_entry.id = NEW.entry_id;
        INSERT INTO homework_latest_entry VALUE (NEW.student_id, homeworkId, groupId, NEW.entry_id, NEW.id)
        ON DUPLICATE KEY UPDATE log_id = NEW.id;

        INSERT INTO history (homework_id, homework_entry_id, student_id, category, email)
            VALUE (NEW.id, NEW.entry_id, NEW.student_id, 'Homework', NEW.email);
    END;