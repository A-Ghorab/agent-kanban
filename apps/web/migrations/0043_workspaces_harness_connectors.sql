CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_workspaces_owner ON workspaces(owner_id);
CREATE UNIQUE INDEX idx_workspaces_owner_name ON workspaces(owner_id, name);

ALTER TABLE boards ADD COLUMN workspace_id TEXT REFERENCES workspaces(id);

INSERT OR IGNORE INTO workspaces (id, owner_id, name, description, created_at, updated_at)
SELECT
  lower(hex(randomblob(6))),
  owner_id,
  'Default Workspace',
  'Auto-created default workspace',
  COALESCE(MIN(created_at), datetime('now')),
  COALESCE(MAX(updated_at), datetime('now'))
FROM boards
GROUP BY owner_id;

UPDATE boards
SET workspace_id = (
  SELECT w.id
  FROM workspaces w
  WHERE w.owner_id = boards.owner_id
  ORDER BY w.created_at ASC
  LIMIT 1
)
WHERE workspace_id IS NULL;

CREATE TABLE boards_next (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  task_seq INTEGER NOT NULL DEFAULT 0,
  visibility TEXT NOT NULL DEFAULT 'private',
  share_slug TEXT,
  type TEXT NOT NULL DEFAULT 'dev' CHECK(type IN ('dev', 'ops')),
  labels TEXT NOT NULL DEFAULT '[]'
);

INSERT INTO boards_next (id, owner_id, workspace_id, name, description, created_at, updated_at, task_seq, visibility, share_slug, type, labels)
SELECT id, owner_id, workspace_id, name, description, created_at, updated_at, task_seq, visibility, share_slug, type, labels
FROM boards;

DROP TABLE boards;
ALTER TABLE boards_next RENAME TO boards;

CREATE INDEX idx_boards_owner ON boards(owner_id);
CREATE UNIQUE INDEX idx_boards_owner_name ON boards(owner_id, name);
CREATE UNIQUE INDEX idx_boards_share_slug ON boards(share_slug);
CREATE INDEX idx_boards_workspace ON boards(workspace_id);

CREATE TABLE workspace_repositories (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  repository_id TEXT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (workspace_id, repository_id)
);

CREATE INDEX idx_workspace_repositories_repository ON workspace_repositories(repository_id);

INSERT OR IGNORE INTO workspace_repositories (workspace_id, repository_id, created_at)
SELECT b.workspace_id, br.repository_id, COALESCE(br.created_at, datetime('now'))
FROM board_repositories br
JOIN boards b ON b.id = br.board_id
WHERE b.workspace_id IS NOT NULL;

ALTER TABLE agents ADD COLUMN connectors TEXT;

UPDATE agents
SET connectors = json_array(runtime)
WHERE runtime IS NOT NULL
  AND connectors IS NULL;

ALTER TABLE tasks ADD COLUMN story_type TEXT NOT NULL DEFAULT 'story' CHECK(story_type IN ('story', 'epic'));
ALTER TABLE tasks ADD COLUMN harness TEXT;

CREATE TABLE tasks_next (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'todo'
    CHECK(status IN ('todo', 'in_progress', 'in_review', 'done', 'stopped', 'cancelled')),
  title TEXT NOT NULL,
  description TEXT,
  repository_id TEXT REFERENCES repositories(id) ON DELETE SET NULL,
  labels TEXT,
  created_by TEXT,
  assigned_to TEXT REFERENCES agents(id) ON DELETE SET NULL,
  result TEXT,
  pr_url TEXT,
  input TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  story_type TEXT NOT NULL DEFAULT 'story' CHECK(story_type IN ('story', 'epic')),
  harness TEXT,
  created_from TEXT REFERENCES tasks(id) ON DELETE SET NULL,
  scheduled_at TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO tasks_next (
  id, board_id, seq, status, title, description, repository_id, labels, created_by, assigned_to, result, pr_url, input, metadata, story_type, harness, created_from, scheduled_at, position, created_at, updated_at
)
SELECT
  id, board_id, seq, status, title, description, repository_id, labels, created_by, assigned_to, result, pr_url, input, metadata, story_type, harness, created_from, scheduled_at, position, created_at, updated_at
FROM tasks;

DROP TABLE tasks;
ALTER TABLE tasks_next RENAME TO tasks;

CREATE INDEX idx_tasks_board ON tasks(board_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_repository ON tasks(repository_id);
CREATE INDEX idx_tasks_created_from ON tasks(created_from);
CREATE INDEX idx_tasks_assigned_status ON tasks(assigned_to, status);
