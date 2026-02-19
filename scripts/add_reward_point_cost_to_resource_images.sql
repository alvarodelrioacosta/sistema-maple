/*
 * Add reward_point_cost column to resource_images table.
 * This column stores the cost in reward points for the resource image.
 * It strictly accepts integer values.
 */

ALTER TABLE resource_images 
ADD COLUMN reward_point_cost INTEGER;

COMMENT ON COLUMN resource_images.reward_point_cost IS 'Cost in reward points for the resource image (numeric only)';
