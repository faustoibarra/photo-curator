-- Add featured_photo_ids to sub_collections for slideshow photo selection
ALTER TABLE sub_collections
  ADD COLUMN featured_photo_ids uuid[] DEFAULT '{}';
