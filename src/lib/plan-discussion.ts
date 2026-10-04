import { z } from "zod";
import type { PlanTask, TaskStatus } from "./plan";

export const MAX_TASK_FILES = 3;
export const MAX_TASK_FILE_BYTES = 3 * 1024 * 1024;
export const taskMessageSchema = z.object({
  kind: z.enum(["comment", "update"]),
  body: z.string().trim().max(4000, "Keep your message under 4,000 characters.").refine(value => !value.includes("\0"), "Remove invalid characters from your message."),
});
export type TaskAttachment = { id: string; filename: string; size: number };
export type TaskMessage = {
  id: string; kind: "comment" | "update"; body: string; authorName: string;
  createdAt: string; attachments: TaskAttachment[];
};
export type TaskHistoryEvent = { id: string; status: TaskStatus; ownerName: string; authorName: string; createdAt: string };
export type TaskDiscussion = {
  task: PlanTask; ownerName: string; milestoneTitle: string;
  messages: TaskMessage[]; events: TaskHistoryEvent[]; canEdit: boolean;
};
