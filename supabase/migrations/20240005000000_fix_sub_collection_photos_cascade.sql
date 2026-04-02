-- Re-add the photo_id FK on sub_collection_photos with ON DELETE CASCADE so
-- that deleting a photo automatically removes it from all sub-collections.
-- The previous constraint had no explicit cascade action (defaulted to RESTRICT),
-- which would block photo deletion whenever the photo belonged to any sub-collection.

ALTER TABLE sub_collection_photos
  DROP CONSTRAINT sub_collection_photos_photo_id_fkey;

ALTER TABLE sub_collection_photos
  ADD CONSTRAINT sub_collection_photos_photo_id_fkey
  FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE;
