-- The shop sells granola: a product category for the three flavours.
-- (Adding an enum value is not undoable in place; nothing else changes.)
-- AlterEnum
ALTER TYPE "ProductCategory" ADD VALUE 'GRANOLA';
