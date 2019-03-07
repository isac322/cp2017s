CREATE TABLE IF NOT EXISTS project_latest_entry (
    student_id VARCHAR(32)        NOT NULL,
    project_id MEDIUMINT UNSIGNED NOT NULL,
    group_id   MEDIUMINT UNSIGNED NOT NULL,
    entry_id   MEDIUMINT UNSIGNED NOT NULL,
    log_id     MEDIUMINT UNSIGNED NOT NULL,
    FOREIGN KEY (student_id) REFERENCES user (student_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    FOREIGN KEY (project_id) REFERENCES project (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    FOREIGN KEY (group_id) REFERENCES project_group (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    FOREIGN KEY (entry_id) REFERENCES project_entry (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    FOREIGN KEY (log_id) REFERENCES project_log (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    PRIMARY KEY (student_id, project_id, group_id, entry_id)
);

CREATE TRIGGER insert_project
AFTER INSERT ON project_log
FOR EACH ROW
    BEGIN
        DECLARE groupId, projectId MEDIUMINT UNSIGNED;
        SELECT
            project_group.id,
            project_id
        INTO groupId, projectId
        FROM project_entry
            JOIN project_group ON project_entry.group_id = project_group.id
        WHERE project_entry.id = NEW.entry_id;
        INSERT INTO project_latest_entry VALUE (NEW.student_id, projectId, groupId, NEW.entry_id, NEW.id)
        ON DUPLICATE KEY UPDATE log_id = NEW.id;

        INSERT INTO history (project_id, project_entry_id, student_id, category, email)
            VALUE (NEW.id, NEW.entry_id, NEW.student_id, 'Project', NEW.email);
    END;