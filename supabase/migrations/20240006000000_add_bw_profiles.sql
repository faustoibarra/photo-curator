-- Add B&W profile columns to photos
ALTER TABLE photos
  ADD COLUMN bw_profile text,
  ADD COLUMN bw_processed_url text;

-- Add B&W mode flag to sub_collections
ALTER TABLE sub_collections
  ADD COLUMN is_bw boolean NOT NULL DEFAULT false;
