CREATE TABLE exercise_result (
    id               MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    log_id           MEDIUMINT UNSIGNED NOT NULL,
    result           BOOL               NOT NULL,
    created          TIMESTAMP          NOT NULL DEFAULT CURRENT_TIMESTAMP,
    error_msg        TEXT,
    unmatched_index  INT UNSIGNED,
    unmatched_output TEXT,
    FOREIGN KEY (log_id) REFERENCES exercise_log (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
)