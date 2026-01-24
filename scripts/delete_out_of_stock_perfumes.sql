-- ============================================
-- Delete Out of Stock Perfume Products (SAFE VERSION)
-- ============================================
-- This script safely deletes products that are:
-- 1. Product Type = 'perfume'
-- 2. Stock Quantity = 0 (Out of Stock)
-- 3. NOT referenced in any orders
-- ============================================

-- STEP 1: Find products that CAN be safely deleted (not in any orders)
SELECT 
    p.id,
    p.name,
    p.sku,
    p.product_type,
    p.size,
    p.stock_quantity,
    p.current_stock,
    p.price
FROM products p
WHERE p.product_type = 'perfume' 
  AND (p.stock_quantity = 0 OR p.stock_quantity IS NULL)
  AND (p.current_stock = 0 OR p.current_stock IS NULL)
  AND p.id NOT IN (
      SELECT DISTINCT product_id 
      FROM order_items 
      WHERE product_id IS NOT NULL
  )
ORDER BY p.name
LIMIT 20;

-- STEP 2: Count how many can be safely deleted
SELECT COUNT(*) as safe_to_delete
FROM products p
WHERE p.product_type = 'perfume' 
  AND (p.stock_quantity = 0 OR p.stock_quantity IS NULL)
  AND (p.current_stock = 0 OR p.current_stock IS NULL)
  AND p.id NOT IN (
      SELECT DISTINCT product_id 
      FROM order_items 
      WHERE product_id IS NOT NULL
  );

-- STEP 3: Count products that CANNOT be deleted (in orders)
SELECT COUNT(*) as cannot_delete_in_orders
FROM products p
WHERE p.product_type = 'perfume' 
  AND (p.stock_quantity = 0 OR p.stock_quantity IS NULL)
  AND (p.current_stock = 0 OR p.current_stock IS NULL)
  AND p.id IN (
      SELECT DISTINCT product_id 
      FROM order_items 
      WHERE product_id IS NOT NULL
  );

-- STEP 4: Delete related records for products that CAN be deleted
-- Delete from product_categories
DELETE FROM product_categories
WHERE product_id IN (
    SELECT p.id FROM products p
    WHERE p.product_type = 'perfume' 
      AND (p.stock_quantity = 0 OR p.stock_quantity IS NULL)
      AND (p.current_stock = 0 OR p.current_stock IS NULL)
      AND p.id NOT IN (
          SELECT DISTINCT product_id 
          FROM order_items 
          WHERE product_id IS NOT NULL
      )
);

-- Delete from shop_inventory
DELETE FROM shop_inventory
WHERE product_id IN (
    SELECT p.id FROM products p
    WHERE p.product_type = 'perfume' 
      AND (p.stock_quantity = 0 OR p.stock_quantity IS NULL)
      AND (p.current_stock = 0 OR p.current_stock IS NULL)
      AND p.id NOT IN (
          SELECT DISTINCT product_id 
          FROM order_items 
          WHERE product_id IS NOT NULL
      )
);

-- Delete from product_attribute_values
DELETE FROM product_attribute_values
WHERE product_id IN (
    SELECT p.id FROM products p
    WHERE p.product_type = 'perfume' 
      AND (p.stock_quantity = 0 OR p.stock_quantity IS NULL)
      AND (p.current_stock = 0 OR p.current_stock IS NULL)
      AND p.id NOT IN (
          SELECT DISTINCT product_id 
          FROM order_items 
          WHERE product_id IS NOT NULL
      )
);

-- Delete from product_images
DELETE FROM product_images
WHERE product_id IN (
    SELECT p.id FROM products p
    WHERE p.product_type = 'perfume' 
      AND (p.stock_quantity = 0 OR p.stock_quantity IS NULL)
      AND (p.current_stock = 0 OR p.current_stock IS NULL)
      AND p.id NOT IN (
          SELECT DISTINCT product_id 
          FROM order_items 
          WHERE product_id IS NOT NULL
      )
);

-- STEP 5: Delete the products (only those not in orders)
DELETE FROM products
WHERE product_type = 'perfume' 
  AND (stock_quantity = 0 OR stock_quantity IS NULL)
  AND (current_stock = 0 OR current_stock IS NULL)
  AND id NOT IN (
      SELECT DISTINCT product_id 
      FROM order_items 
      WHERE product_id IS NOT NULL
  );

-- STEP 6: Mark products that are in orders as inactive instead
UPDATE products
SET is_active = false,
    updated_at = CURRENT_TIMESTAMP
WHERE product_type = 'perfume' 
  AND (stock_quantity = 0 OR stock_quantity IS NULL)
  AND (current_stock = 0 OR current_stock IS NULL)
  AND id IN (
      SELECT DISTINCT product_id 
      FROM order_items 
      WHERE product_id IS NOT NULL
  );

-- STEP 7: Verification
SELECT 
    'Total perfume products' as metric,
    COUNT(*) as count
FROM products
WHERE product_type = 'perfume'
UNION ALL
SELECT 
    'Out of stock perfumes (active)' as metric,
    COUNT(*) as count
FROM products
WHERE product_type = 'perfume' 
  AND (stock_quantity = 0 OR stock_quantity IS NULL)
  AND is_active = true
UNION ALL
SELECT 
    'Out of stock perfumes (inactive)' as metric,
    COUNT(*) as count
FROM products
WHERE product_type = 'perfume' 
  AND (stock_quantity = 0 OR stock_quantity IS NULL)
  AND is_active = false;
