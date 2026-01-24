-- Add is_atelier_item column to order_items table
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS is_atelier_item BOOLEAN DEFAULT false;

-- Create index for better performance when filtering atelier orders
CREATE INDEX IF NOT EXISTS idx_order_items_is_atelier_item ON order_items(is_atelier_item);

-- Update existing records if needed (optional - depends on your data)
-- UPDATE order_items SET is_atelier_item = true WHERE product_id IN (SELECT id FROM raw_materials);