import type { Workspace } from "@agent-kanban/shared";
import { type D1, newId } from "./db";

export async function createWorkspace(db: D1, ownerId: string, name: string, description?: string): Promise<Workspace> {
  const id = newId();
  const now = new Date().toISOString();
  await db
    .prepare("INSERT INTO workspaces (id, owner_id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(id, ownerId, name, description || null, now, now)
    .run();
  return { id, owner_id: ownerId, name, description: description || null, created_at: now, updated_at: now };
}

export async function listWorkspaces(db: D1, ownerId: string): Promise<Workspace[]> {
  const result = await db.prepare("SELECT * FROM workspaces WHERE owner_id = ? ORDER BY created_at ASC").bind(ownerId).all<Workspace>();
  return result.results;
}

export async function getWorkspace(db: D1, ownerId: string, workspaceId: string): Promise<Workspace | null> {
  return (await db.prepare("SELECT * FROM workspaces WHERE owner_id = ? AND id = ?").bind(ownerId, workspaceId).first<Workspace>()) ?? null;
}

export async function ensureDefaultWorkspace(db: D1, ownerId: string): Promise<Workspace> {
  const existing = await db
    .prepare("SELECT * FROM workspaces WHERE owner_id = ? ORDER BY created_at ASC LIMIT 1")
    .bind(ownerId)
    .first<Workspace>();
  if (existing) return existing;
  return createWorkspace(db, ownerId, "Default Workspace", "Auto-created default workspace");
}
