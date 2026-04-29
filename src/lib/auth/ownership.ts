import { prisma } from '@/lib/db'
import type { ModelRun, SceneSession, Workspace, Prisma } from '@prisma/client'

export class OwnershipError extends Error {
  constructor(message = 'not found') {
    super(message)
    this.name = 'OwnershipError'
  }
}

export async function assertWorkspaceOwnership(
  workspaceId: string,
  userId: string
): Promise<Workspace> {
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } })
  if (!workspace || workspace.userId !== userId) throw new OwnershipError()
  return workspace
}

export async function assertWorkspaceOwnershipWithInclude<
  T extends Prisma.WorkspaceInclude
>(
  workspaceId: string,
  userId: string,
  include: T
): Promise<Prisma.WorkspaceGetPayload<{ include: T }>> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include,
  })
  if (!workspace || workspace.userId !== userId) throw new OwnershipError()
  return workspace as Prisma.WorkspaceGetPayload<{ include: T }>
}

export async function assertSceneSessionOwnership(
  sceneSessionId: string,
  userId: string
): Promise<{ session: SceneSession; workspace: Workspace }> {
  const session = await prisma.sceneSession.findUnique({
    where: { id: sceneSessionId },
    include: { workspace: true },
  })
  if (!session || !session.workspace || session.workspace.userId !== userId) {
    throw new OwnershipError()
  }
  return { session, workspace: session.workspace }
}

export async function assertModelRunOwnership(
  runId: string,
  userId: string
): Promise<{ modelRun: ModelRun; workspace: Workspace }> {
  const modelRun = await prisma.modelRun.findUnique({
    where: { id: runId },
    include: { workspace: true },
  })
  if (!modelRun || !modelRun.workspace || modelRun.workspace.userId !== userId) {
    throw new OwnershipError()
  }
  return { modelRun, workspace: modelRun.workspace }
}
