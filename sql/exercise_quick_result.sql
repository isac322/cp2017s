CREATE TABLE exercise_quick_result (
    attach_id   MEDIUMINT UNSIGNED NOT NULL,
    student_id  VARCHAR(32)        NOT NULL,
    result      BOOL               NOT NULL,
    FOREIGN KEY (attach_id) REFERENCES exercise_config (id)
        ON UPDATE CASCADE,
    FOREIGN KEY (student_id) REFERENCES user (student_id)
        ON UPDATE CASCADE,
    PRIMARY KEY (attach_id, student_id)
);