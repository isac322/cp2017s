CREATE TABLE IF NOT EXISTS homework_description (
    homework_id MEDIUMINT UNSIGNED NOT NULL,
    url         VARCHAR(2083)      NOT NULL,
    FOREIGN KEY (homework_id) REFERENCES homework (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);