CREATE TABLE submit_attach (
	id          MEDIUMINT   NOT NULL PRIMARY KEY AUTO_INCREMENT,
	config_id   MEDIUMINT   NOT NULL,
	attachment  MEDIUMBLOB  NOT NULL,
	FOREIGN KEY (config_id) REFERENCES hw_config(id)
);