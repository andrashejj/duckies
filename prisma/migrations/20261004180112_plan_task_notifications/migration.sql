-- CreateTable
CREATE TABLE "plan_task_notification" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "first_attempt_at" TIMESTAMPTZ(6),
    "next_attempt_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "sent_at" TIMESTAMPTZ(6),
    "provider_id" TEXT,
    "last_error" TEXT,

    CONSTRAINT "plan_task_notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "plan_task_notification_pending_idx" ON "plan_task_notification"("sent_at", "next_attempt_at");

-- AddForeignKey
ALTER TABLE "plan_task_notification" ADD CONSTRAINT "plan_task_notification_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "plan_task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
