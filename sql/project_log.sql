CREATE TABLE IF NOT EXISTS project_log (
    id         MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(32)        NOT NULL,
    entry_id   MEDIUMINT UNSIGNED NOT NULL,
    email      VARCHAR(100)       NOT NULL,
    file_name  VARCHAR(128)       NOT NULL,
    submitted  TIMESTAMP          NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES user (student_id)
        ON UPDATE CASCADE,
    FOREIGN KEY (student_id, email) REFERENCES email (student_id, email)
        ON UPDATE CASCADE,
    FOREIGN KEY (entry_id) REFERENCES project_entry (id)
        ON UPDATE CASCADE
);