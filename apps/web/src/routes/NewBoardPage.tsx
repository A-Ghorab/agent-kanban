import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "../components/Header";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { useCreateBoard } from "../hooks/useBoard";
import { useCreateWorkspace, useWorkspaces } from "../hooks/useWorkspaces";

export function NewBoardPage() {
  const navigate = useNavigate();
  const [boardName, setBoardName] = useState("My Board");
  const [boardType, setBoardType] = useState<"dev" | "ops">("dev");
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [error, setError] = useState("");
  const createBoard = useCreateBoard();
  const { workspaces } = useWorkspaces();
  const createWorkspace = useCreateWorkspace();

  async function handleCreateWorkspace() {
    if (!newWorkspaceName.trim()) return;
    const workspace = await createWorkspace.mutateAsync({ name: newWorkspaceName.trim() });
    setWorkspaceId(workspace.id);
    setNewWorkspaceName("");
  }

  async function handleCreateBoard() {
    setError("");
    const board = await createBoard.mutateAsync({ name: boardName, type: boardType, workspace_id: workspaceId || undefined });
    navigate(`/boards/${board.id}`, { replace: true });
  }

  return (
    <div className="min-h-screen bg-surface-primary">
      <Header />
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="max-w-md w-full space-y-6 p-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-content-primary">
              Agent <span className="text-accent">Kanban</span>
            </h1>
            <p className="text-sm text-content-secondary mt-2">Your AI workforce starts here.</p>
          </div>

          <div className="space-y-4">
            <label className="block text-xs font-medium text-content-tertiary uppercase tracking-wide">Board type</label>
            <div className="flex gap-2">
              {(["dev", "ops"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setBoardType(t)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    boardType === t ? "bg-accent text-white" : "bg-surface-tertiary text-content-secondary hover:text-content-primary"
                  }`}
                >
                  {t === "dev" ? "Dev" : "Ops"}
                  <span className="block text-xs font-normal mt-0.5 opacity-70">{t === "dev" ? "Git / PR workflow" : "No repo required"}</span>
                </button>
              ))}
            </div>
            <label className="block text-xs font-medium text-content-tertiary uppercase tracking-wide">Board name</label>
            <Input value={boardName} onChange={(e) => setBoardName(e.target.value)} />
            <label className="block text-xs font-medium text-content-tertiary uppercase tracking-wide">Workspace</label>
            <select
              value={workspaceId}
              onChange={(e) => setWorkspaceId(e.target.value)}
              className="w-full h-9 rounded-md border border-border bg-surface-secondary px-3 text-sm text-content-primary"
            >
              <option value="">Default Workspace</option>
              {workspaces.map((workspace: any) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <Input value={newWorkspaceName} onChange={(e) => setNewWorkspaceName(e.target.value)} placeholder="New workspace name" />
              <Button type="button" variant="outline" onClick={handleCreateWorkspace} disabled={!newWorkspaceName.trim() || createWorkspace.isPending}>
                Add
              </Button>
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <Button onClick={handleCreateBoard} disabled={createBoard.isPending || !boardName.trim()} className="w-full">
              {createBoard.isPending ? "Creating..." : "Create Board"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
