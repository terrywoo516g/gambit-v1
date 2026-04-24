-- CreateTable
CREATE TABLE "FinalDraftBlock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceLabel" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "inDraft" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinalDraftBlock_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FinalDraft" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sceneSessionId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'markdown',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinalDraft_sceneSessionId_fkey" FOREIGN KEY ("sceneSessionId") REFERENCES "SceneSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_FinalDraft" ("content", "createdAt", "format", "id", "sceneSessionId", "version") SELECT "content", "createdAt", "format", "id", "sceneSessionId", "version" FROM "FinalDraft";
DROP TABLE "FinalDraft";
ALTER TABLE "new_FinalDraft" RENAME TO "FinalDraft";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "FinalDraftBlock_workspaceId_order_idx" ON "FinalDraftBlock"("workspaceId", "order");
