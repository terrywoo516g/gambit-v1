/*
  Warnings:

  - You are about to drop the column `summaryCache` on the `Workspace` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Workspace" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "deviceId" TEXT,
    "prompt" TEXT NOT NULL,
    "selectedModels" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "title" TEXT NOT NULL DEFAULT '新工作台',
    "recommendScene" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Workspace" ("createdAt", "deviceId", "id", "prompt", "recommendScene", "selectedModels", "status", "title", "updatedAt", "userId") SELECT "createdAt", "deviceId", "id", "prompt", "recommendScene", "selectedModels", "status", "title", "updatedAt", "userId" FROM "Workspace";
DROP TABLE "Workspace";
ALTER TABLE "new_Workspace" RENAME TO "Workspace";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
