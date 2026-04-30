/*
  Warnings:

  - The primary key for the `ChatMember` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `ChatMember` table. All the data in the column will be lost.
  - The primary key for the `MessageRead` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `MessageRead` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `Chat` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Attachment" DROP CONSTRAINT "Attachment_uploaderId_fkey";

-- DropIndex
DROP INDEX "ChatMember_chatId_lastReadAt_idx";

-- DropIndex
DROP INDEX "ChatMember_userId_chatId_key";

-- DropIndex
DROP INDEX "MessageRead_messageId_userId_key";

-- DropIndex
DROP INDEX "MessageRead_userId_readAt_idx";

-- AlterTable
ALTER TABLE "Attachment" ALTER COLUMN "uploaderId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Chat" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "isDirect" SET DEFAULT false;

-- AlterTable
ALTER TABLE "ChatMember" DROP CONSTRAINT "ChatMember_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "ChatMember_pkey" PRIMARY KEY ("userId", "chatId");

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "reactions" JSONB DEFAULT '{}',
ADD COLUMN     "replyToMessageId" TEXT;

-- AlterTable
ALTER TABLE "MessageRead" DROP CONSTRAINT "MessageRead_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "MessageRead_pkey" PRIMARY KEY ("messageId", "userId");

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "PinnedMessage" (
    "chatId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "pinnedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PinnedMessage_pkey" PRIMARY KEY ("chatId","messageId")
);

-- CreateIndex
CREATE UNIQUE INDEX "PinnedMessage_messageId_key" ON "PinnedMessage"("messageId");

-- CreateIndex
CREATE INDEX "Message_chatId_createdAt_idx" ON "Message"("chatId", "createdAt");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_replyToMessageId_fkey" FOREIGN KEY ("replyToMessageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PinnedMessage" ADD CONSTRAINT "PinnedMessage_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PinnedMessage" ADD CONSTRAINT "PinnedMessage_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PinnedMessage" ADD CONSTRAINT "PinnedMessage_pinnedById_fkey" FOREIGN KEY ("pinnedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
