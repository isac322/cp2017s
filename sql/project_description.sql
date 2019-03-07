CREATE TABLE IF NOT EXISTS project_description (
    project_id MEDIUMINT UNSIGNED NOT NULL,
    url        VARCHAR(2083)      NOT NULL,
    FOREIGN KEY (project_id) REFERENCES project (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);