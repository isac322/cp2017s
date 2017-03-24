CREATE TABLE exercise_config (
    id            MEDIUMINT UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT,
    exercise_id   MEDIUMINT UNSIGNED NOT NULL,
    name          VARCHAR(255)       NOT NULL,
    extension     VARCHAR(50)        NOT NULL,
    test_set_size MEDIUMINT UNSIGNED NOT NULL,
    FOREIGN KEY (exercise_id) REFERENCES exercise (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);