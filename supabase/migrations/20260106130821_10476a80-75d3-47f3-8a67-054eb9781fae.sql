-- Clean up duplicate budget_areas, keeping only the oldest of each name per user
-- First, update category_area_mappings to point to the kept area
WITH kept_areas AS (
  SELECT DISTINCT ON (user_id, name) 
    id, user_id, name
  FROM budget_areas
  ORDER BY user_id, name, created_at ASC
),
duplicates AS (
  SELECT ba.id as duplicate_id, ka.id as kept_id
  FROM budget_areas ba
  JOIN kept_areas ka ON ba.user_id = ka.user_id AND ba.name = ka.name AND ba.id != ka.id
)
UPDATE category_area_mappings cam
SET budget_area_id = d.kept_id
FROM duplicates d
WHERE cam.budget_area_id = d.duplicate_id;

-- Now delete the duplicates
DELETE FROM budget_areas
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, name) id
  FROM budget_areas
  ORDER BY user_id, name, created_at ASC
);