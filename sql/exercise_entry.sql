CREATE TABLE IF NOT EXISTS exercise_entry (
    id        MEDIUMINT UNSIGNED                                NOT NULL PRIMARY KEY AUTO_INCREMENT,
    group_id  MEDIUMINT UNSIGNED                                NOT NULL,
    name      VARCHAR(255)                                      NOT NULL,
    extension ENUM ('cpp', 'hpp', 'java', 'make', 'zip', 'pdf') NOT NULL,
    FOREIGN KEY (group_id) REFERENCES exercise_group (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);