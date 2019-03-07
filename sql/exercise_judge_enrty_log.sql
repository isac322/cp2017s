CREATE TABLE IF NOT EXISTS exercise_judge_entry_log (
    judge_id  MEDIUMINT UNSIGNED NOT NULL,
    upload_id MEDIUMINT UNSIGNED NOT NULL,
    FOREIGN KEY (judge_id) REFERENCES exercise_judge_log (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    FOREIGN KEY (upload_id) REFERENCES exercise_upload_log (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    PRIMARY KEY (judge_id, upload_id)
);