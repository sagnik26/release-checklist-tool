-- Up Migration

CREATE TYPE step_key AS ENUM (
  'merged_prs', 'changelog_updated', 'tests_passing',
  'github_release_created', 'deployed_demo',
  'tested_demo', 'deployed_production'
);

CREATE TABLE release (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL CHECK (btrim(name) <> '' AND char_length(name) <= 100),
  due_date    date NOT NULL,
  notes       text CHECK (notes IS NULL OR char_length(notes) <= 2000),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX release_due_date_idx ON release (due_date);

CREATE TABLE release_step (
  release_id  uuid NOT NULL REFERENCES release (id) ON DELETE CASCADE,
  step_key    step_key NOT NULL,
  completed   boolean NOT NULL DEFAULT false,
  PRIMARY KEY (release_id, step_key)
);

-- Down Migration

DROP TABLE release_step;
DROP TABLE release;
DROP TYPE step_key;
