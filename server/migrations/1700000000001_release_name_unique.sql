-- Up Migration

CREATE UNIQUE INDEX release_name_lower_idx ON release (lower(name));

-- Down Migration

DROP INDEX release_name_lower_idx;
