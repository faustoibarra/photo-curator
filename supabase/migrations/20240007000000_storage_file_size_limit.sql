-- Raise the file size limit on the photos bucket to 50 MB.
-- The Supabase free-tier default is 5 MB, which causes large photo uploads
-- to fail mid-stream (fetch throws instead of returning 413).
UPDATE storage.buckets
SET file_size_limit = 52428800  -- 50 MB in bytes
WHERE id = 'photos';
