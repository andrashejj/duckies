-- CreateTable
CREATE TABLE "plan_task_message" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_task_message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_task_attachment" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "bytes" BYTEA NOT NULL,

    CONSTRAINT "plan_task_attachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "plan_task_message_timeline_idx" ON "plan_task_message"("task_id", "created_at", "id");

-- CreateIndex
CREATE INDEX "plan_task_attachment_message_idx" ON "plan_task_attachment"("message_id");

-- AddForeignKey
ALTER TABLE "plan_task_message" ADD CONSTRAINT "plan_task_message_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "plan_task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "plan_task_attachment" ADD CONSTRAINT "plan_task_attachment_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "plan_task_message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Keep validation close to the stored data as well as in the upload API.
ALTER TABLE "plan_task_message" ADD CONSTRAINT "plan_task_message_kind_check" CHECK (kind IN ('comment', 'update'));
ALTER TABLE "plan_task_message" ADD CONSTRAINT "plan_task_message_body_check" CHECK (length(body) <= 4000);
ALTER TABLE "plan_task_attachment" ADD CONSTRAINT "plan_task_attachment_filename_check" CHECK (length(filename) BETWEEN 1 AND 180);
ALTER TABLE "plan_task_attachment" ADD CONSTRAINT "plan_task_attachment_size_check" CHECK (octet_length(bytes) BETWEEN 1 AND 3145728);
