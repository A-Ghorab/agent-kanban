import type { Repository } from "@agent-kanban/shared";
import type { D1 } from "./db";

function withFullName<T extends { url: string }>(repo: T): T & { full_name: string } {
  const match = repo.url.match(/^https?:\/\/[^/]+\/(.+)$/);
  return { ...repo, full_name: match?.[1] ?? repo.url };
}

export async function recordWorkspaceRepository(db: D1, workspaceId: string, repositoryId: string): Promise<void> {
  await db.prepare("INSERT OR IGNORE INTO workspace_repositories (workspace_id, repository_id) VALUES (?, ?)").bind(workspaceId, repositoryId).run();
}

export async function listWorkspaceRepositories(db: D1, ownerId: string, workspaceId: string): Promise<(Repository & { full_name: string })[]> {
  const result = await db
    .prepare(
      `
      SELECT r.*
      FROM workspace_repositories wr
      JOIN workspaces w ON w.id = wr.workspace_id AND w.owner_id = ?
      JOIN repositories r ON r.id = wr.repository_id AND r.owner_id = w.owner_id
      WHERE wr.workspace_id = ?
      ORDER BY r.created_at DESC
      `,
    )
    .bind(ownerId, workspaceId)
    .all<Repository>();
  return result.results.map(withFullName);
}
