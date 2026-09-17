-- Photos parents send in through /gallery/share. Nothing shows on the site
-- until an admin sets status = 'approved' in /admin/gallery. The original
-- file is never kept: image (1600px) and thumb (800px) are re-encoded WebP.
CREATE TABLE "gallery_upload" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploader_name" TEXT,
    "note" TEXT,
    "caption" TEXT,
    "image" BYTEA NOT NULL,
    "thumb" BYTEA NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewed_at" TIMESTAMPTZ(6),
    "reviewed_by" TEXT,
    "ip_hash" TEXT,

    CONSTRAINT "gallery_upload_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "gallery_upload_status_idx" ON "gallery_upload"("status", "created_at" DESC);
