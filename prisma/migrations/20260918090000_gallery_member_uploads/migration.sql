-- The gallery is members-only now: uploads come from a signed-in club member
-- (recorded, never shown on the site) and go live without an approval step.
-- The free-text uploader name goes; status stays so an admin can still hide
-- or remove a photo.
ALTER TABLE "gallery_upload" DROP COLUMN "uploader_name";
ALTER TABLE "gallery_upload" ADD COLUMN "uploaded_by" TEXT;
ALTER TABLE "gallery_upload" ALTER COLUMN "status" SET DEFAULT 'approved';
UPDATE "gallery_upload" SET "status" = 'approved' WHERE "status" = 'pending';
