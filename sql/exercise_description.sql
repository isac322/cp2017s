CREATE TABLE IF NOT EXISTS exercise_description (
    exercise_id MEDIUMINT UNSIGNED NOT NULL,
    url         VARCHAR(2083)      NOT NULL,
    FOREIGN KEY (exercise_id) REFERENCES exercise (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);