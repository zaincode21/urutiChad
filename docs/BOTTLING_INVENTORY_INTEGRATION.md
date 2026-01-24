# Bottling-Inventory Integration Documentation

## Table of Contents
1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Inventory Impact Flow](#inventory-impact-flow)
4. [Material Consumption Process](#material-consumption-process)
5. [Inventory Transaction Recording](#inventory-transaction-recording)
6. [Finished Product Creation](#finished-product-creation)
7. [Quality Control Impact](#quality-control-impact)
8. [Real-Time Monitoring](#real-time-monitoring)
9. [Database Schema](#database-schema)
10. [API Endpoints](#api-endpoints)
11. [Error Handling](#error-handling)
12. [Best Practices](#best-practices)
13. [Troubleshooting](#troubleshooting)

## Overview

The Bottling-Inventory Integration system manages the complete lifecycle of transforming raw materials into finished bottled products while maintaining real-time inventory accuracy. This system ensures that all material consumption, product creation, and quality adjustments are properly tracked and reflected in inventory levels.

### Key Features
- **Real-time inventory updates** during bottling operations
- **Complete transaction tracking** with audit trails
- **Quality-based inventory adjustments** for defective products
- **Automatic low stock alerts** and reorder notifications
- **Comprehensive cost tracking** for all materials consumed

## System Architecture

### Core Components

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   Raw Materials    │    │   Bottling Batch    │    │  Finished Products  │
│   Inventory        │───▶│   Processing        │───▶│   Inventory         │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
         │                           │                           │
         ▼                           ▼                           ▼
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│  Inventory          │    │   Cost Components   │    │   Quality Control   │
│  Transactions       │    │   & Analysis        │    │   & Adjustments     │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
```

### Service Layer
- **`BottlingInventoryService`**: Handles material consumption and inventory updates
- **`BottlingService`**: Manages bottling operations and cost calculations
- **Database Layer**: Ensures transaction consistency and data integrity

## Inventory Impact Flow

### 1. Pre-Bottling Phase
```
Raw Materials Status:
├── Bottles: 100 units
├── Caps: 100 units  
├── Labels: 100 units
├── Bulk Perfume: 50 liters
└── Total Value: $2,500
```

### 2. Bottling Batch Initiation
```
Material Consumption:
├── Bottles: 100 → 0 units (CONSUMED)
├── Caps: 100 → 0 units (CONSUMED)
├── Labels: 100 → 0 units (CONSUMED)
├── Bulk Perfume: 50 → 45 liters (5L consumed)
└── Inventory Status: REDUCED
```

### 3. Post-Bottling Phase
```
Finished Products Created:
├── Bottled Perfume: +95 units (100 - 5 defective)
├── Raw Materials: 0 units (consumed)
├── Bulk Perfume: 45 liters (remaining)
└── Inventory Status: TRANSFORMED
```

## Material Consumption Process

### Step-by-Step Process

#### 1. Recipe Material Calculation
```javascript
// Calculate required materials for the batch
const recipeMaterials = await database.all(`
  SELECT rm.id, rm.current_stock, rm.name, rm.unit,
         rm.cost_per_unit, rm.min_stock_level,
         rm.reorder_point, rm.safety_stock,
         rm.quantity_per_unit
  FROM recipe_materials rcm
  JOIN raw_materials rm ON rcm.material_id = rm.id
  WHERE rcm.recipe_id = ?
`, [recipe_id]);
```

#### 2. Stock Validation
```javascript
// Check if sufficient materials are available
for (const material of recipeMaterials) {
  const requiredQuantity = material.quantity_per_unit * quantity_planned;
  if (material.current_stock < requiredQuantity) {
    throw new Error(`Insufficient stock for ${material.name}. Required: ${requiredQuantity} ${material.unit}, Available: ${material.current_stock} ${material.unit}`);
  }
}
```

#### 3. Material Consumption
```javascript
// Consume materials and update inventory
for (const material of recipeMaterials) {
  const consumedQuantity = material.quantity_per_unit * quantity_planned;
  const newStock = material.current_stock - consumedQuantity;
  
  // Update raw material stock
  await database.run(`
    UPDATE raw_materials 
    SET current_stock = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [newStock, material.id]);
}
```

### Material Types and Consumption

| Material Type | Consumption Pattern | Inventory Impact |
|---------------|-------------------|------------------|
| **Bottles** | Immediate consumption | Stock level drops to 0 |
| **Caps** | Immediate consumption | Stock level drops to 0 |
| **Labels** | Immediate consumption | Stock level drops to 0 |
| **Bulk Perfume** | Calculated consumption | Stock level reduced by required amount |
| **Packaging** | Immediate consumption | Stock level drops to 0 |

## Inventory Transaction Recording

### Transaction Types

#### 1. Consumption Transactions
```javascript
// Record material consumption
await database.run(`
  INSERT INTO inventory_transactions (
    id, product_id, transaction_type, quantity, 
    previous_stock, new_stock, unit_cost, total_value,
    reference_id, reference_type, notes, created_by
  ) VALUES (?, ?, 'consumption', ?, ?, ?, ?, ?, ?, 'bottling_batch', ?, ?)
`, [
  uuidv4(), material.id, consumedQuantity, 
  material.current_stock, newStock, material.cost_per_unit,
  consumedQuantity * material.cost_per_unit, batchId, 
  `Raw material consumed for batch ${batchNumber}`, operator_id
]);
```

#### 2. Stock Ledger Entries
```javascript
// Record in stock ledger for detailed tracking
await database.run(`
  INSERT INTO stock_ledger (
    id, material_id, transaction_type, quantity, unit_cost, total_value,
    reference_type, reference_id, notes, created_by
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`, [
  uuidv4(), material.material_id, 'consumption', material.quantity,
  material.unit_cost, material.total_cost, 'bottling_batch', batchId,
  `Bottling batch ${batchNumber}`, createdBy
]);
```

### Transaction Reference System

| Field | Description | Example |
|-------|-------------|---------|
| `reference_id` | Bottling batch ID | `batch-uuid-123` |
| `reference_type` | Transaction source | `bottling_batch` |
| `notes` | Human-readable description | `Raw material consumed for batch BATCH-123` |

## Finished Product Creation

### Product Generation Process

#### 1. SKU Generation
```javascript
// Generate unique SKU for finished product
const sku = this.generateSKU(bulkPerfume.name, recipe.size_ml);
// Example: PERF-ROS-100ML
```

#### 2. Product Creation
```javascript
// Create finished product with calculated inventory
const productId = uuidv4();
await database.run(`
  INSERT INTO products (
    id, name, description, sku, barcode, price, cost_price, 
    stock_quantity, product_type, size, image_url
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`, [
  productId, productName, bulkPerfume.scent_description, sku, 
  `BAR-${sku}`, sellingPrice, costBreakdown.unit_cost,
  quantityProduced - quantityDefective, 'perfume', `${recipe.size_ml}ml`, null
]);
```

### Inventory Transformation

```
Before Bottling:
├── Raw Materials: 100 bottles, 100 caps, 100 labels
├── Bulk Perfume: 50 liters
└── Finished Products: 0 units

After Bottling:
├── Raw Materials: 0 bottles, 0 caps, 0 labels
├── Bulk Perfume: 45 liters
├── Finished Products: 95 units (100 - 5 defective)
└── Total Value: $3,800 (finished products)
```

## Quality Control Impact

### Defective Product Handling

#### 1. Quality Assessment
```javascript
// Record quality check results
await database.run(`
  INSERT INTO batch_quality_checks (
    id, batch_id, check_type, inspector_id, check_date, passed, score,
    defects_found, corrective_actions, rework_required, rework_quantity, notes
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`, [
  checkId, batchId, checkType, inspectorId, new Date().toISOString(),
  passed, score, defectsFound, correctiveActions, reworkRequired, reworkQuantity, notes
]);
```

#### 2. Inventory Adjustment
```javascript
// Calculate final inventory based on quality
const finalQuantity = quantityProduced - quantityDefective;
const efficiencyPercentage = quantityProduced > 0 ? 
  ((quantityProduced - quantityDefective) / quantityProduced) * 100 : 0;
const wastePercentage = quantityProduced > 0 ? 
  (quantityDefective / quantityProduced) * 100 : 0;
```

### Quality Metrics Impact

| Metric | Calculation | Inventory Effect |
|--------|-------------|------------------|
| **Efficiency** | (Good Products / Total Produced) × 100 | Determines final inventory |
| **Waste** | (Defective Products / Total Produced) × 100 | Reduces final inventory |
| **Quality Score** | Inspector assessment (0-1) | Affects product value |

## Real-Time Monitoring

### Low Stock Alerts

#### 1. Automatic Detection
```javascript
// Check if stock is below reorder point
if (newStock <= material.reorder_point) {
  await this.createLowStockAlert(material, newStock, material.reorder_point);
}
```

#### 2. Alert Types
- **Reorder Point Alerts**: When stock reaches reorder threshold
- **Safety Stock Violations**: When stock falls below safety level
- **Material Shortage Warnings**: When insufficient stock for planned batches

### Inventory Dashboard Metrics

| Metric | Description | Update Frequency |
|--------|-------------|------------------|
| **Current Stock** | Real-time material levels | Continuous |
| **Consumption Rate** | Materials used per time period | Daily |
| **Reorder Alerts** | Low stock notifications | Real-time |
| **Batch Status** | Current bottling operations | Real-time |

## Database Schema

### Core Tables

#### 1. Raw Materials Table
```sql
CREATE TABLE raw_materials (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  current_stock DECIMAL(10,3) NOT NULL,
  min_stock_level DECIMAL(10,3) DEFAULT 0,
  reorder_point DECIMAL(10,3) DEFAULT 0,
  cost_per_unit DECIMAL(10,2) NOT NULL,
  -- ... additional fields
);
```

#### 2. Inventory Transactions Table
```sql
CREATE TABLE inventory_transactions (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  transaction_type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  previous_stock INTEGER,
  new_stock INTEGER,
  reference_id TEXT,
  reference_type TEXT,
  -- ... additional fields
);
```

#### 3. Bottling Batches Table
```sql
CREATE TABLE bottling_batches (
  id TEXT PRIMARY KEY,
  batch_number TEXT UNIQUE NOT NULL,
  quantity_produced INTEGER NOT NULL,
  quantity_defective INTEGER DEFAULT 0,
  status TEXT DEFAULT 'planned',
  -- ... additional fields
);
```

### Table Relationships

```
raw_materials (1) ←→ (N) recipe_materials (N) ←→ (1) bottling_recipes
     ↓                                                      ↓
     ↓                                              bottling_batches
     ↓                                                      ↓
inventory_transactions ←─────────────────────────────────────┘
```

## API Endpoints

### Bottling Operations

#### 1. Start Bottling Batch
```http
POST /api/bottling/start-batch
Content-Type: application/json

{
  "recipe_id": "recipe-uuid",
  "quantity_planned": 100,
  "operator_id": "user-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "batch_id": "batch-uuid",
  "batch_number": "BATCH-123",
  "consumed_materials": [
    {
      "name": "100ml Bottle",
      "consumed": 100,
      "unit": "units",
      "cost": 150.00
    }
  ],
  "total_material_cost": 250.00
}
```

#### 2. Get Batch Details
```http
GET /api/bottling/batch/{batchId}
```

**Response:**
```json
{
  "batch": {
    "id": "batch-uuid",
    "batch_number": "BATCH-123",
    "status": "in_progress",
    "quantity_produced": 100,
    "quantity_defective": 5
  },
  "cost_components": [...],
  "production_steps": [...]
}
```

### Inventory Operations

#### 1. Get Material Stock Levels
```http
GET /api/inventory/materials/stock
```

#### 2. Get Low Stock Alerts
```http
GET /api/inventory/alerts/low-stock
```

## Error Handling

### Common Error Scenarios

#### 1. Insufficient Stock
```javascript
// Error thrown when materials are insufficient
if (material.current_stock < requiredQuantity) {
  throw new Error(`Insufficient stock for ${material.name}. Required: ${requiredQuantity} ${material.unit}, Available: ${material.current_stock} ${material.unit}`);
}
```

**Resolution:**
- Check current stock levels
- Reorder materials if needed
- Adjust batch quantity if possible

#### 2. Transaction Failures
```javascript
// Database transaction rollback on error
try {
  // ... bottling operations
  await database.run('COMMIT');
} catch (error) {
  await database.run('ROLLBACK');
  throw error;
}
```

**Resolution:**
- Check database connectivity
- Verify data integrity
- Retry operation if appropriate

### Error Recovery

#### 1. Partial Consumption Scenarios
- **Material partially consumed**: Restore remaining materials
- **Batch failure**: Rollback all inventory changes
- **Quality issues**: Adjust final inventory counts

#### 2. Data Consistency
- **Transaction logging**: Maintain audit trail
- **Reference integrity**: Ensure all relationships are valid
- **Stock reconciliation**: Regular inventory counts

## Best Practices

### 1. Inventory Planning
- **Forecast material requirements** based on production schedules
- **Maintain safety stock** levels for critical materials
- **Monitor consumption trends** to optimize reorder points

### 2. Batch Management
- **Validate material availability** before starting batches
- **Track production efficiency** to improve material usage
- **Implement quality controls** to minimize waste

### 3. Data Management
- **Regular inventory audits** to ensure accuracy
- **Backup transaction logs** for compliance
- **Monitor system performance** for large-scale operations

### 4. Cost Optimization
- **Analyze material costs** to identify savings opportunities
- **Track waste percentages** to improve efficiency
- **Optimize batch sizes** for cost-effectiveness

## Troubleshooting

### Common Issues and Solutions

#### 1. Inventory Discrepancies
**Problem**: Stock levels don't match expected values
**Solution**: 
- Check transaction logs for missing entries
- Verify batch completion status
- Reconcile with physical inventory counts

#### 2. Missing Transactions
**Problem**: Material consumption not recorded
**Solution**:
- Check database connectivity
- Verify transaction rollback scenarios
- Review error logs for failed operations

#### 3. Performance Issues
**Problem**: Slow inventory updates during bottling
**Solution**:
- Optimize database queries
- Implement batch operations for large quantities
- Monitor database performance metrics

### Debug Tools

#### 1. Transaction Logs
```sql
-- View all bottling-related transactions
SELECT * FROM inventory_transactions 
WHERE reference_type = 'bottling_batch' 
ORDER BY created_at DESC;
```

#### 2. Stock Level History
```sql
-- Track material stock changes over time
SELECT 
  it.product_id,
  rm.name,
  it.previous_stock,
  it.new_stock,
  it.transaction_type,
  it.created_at
FROM inventory_transactions it
JOIN raw_materials rm ON it.product_id = rm.id
WHERE it.reference_type = 'bottling_batch'
ORDER BY it.created_at DESC;
```

#### 3. Batch Status Monitoring
```sql
-- Monitor current batch status
SELECT 
  bb.batch_number,
  bb.status,
  bb.quantity_produced,
  bb.quantity_defective,
  bb.created_at
FROM bottling_batches bb
WHERE bb.status IN ('in_progress', 'quality_check')
ORDER BY bb.created_at DESC;
```

---

## Conclusion

The Bottling-Inventory Integration system provides a robust, real-time solution for managing the transformation of raw materials into finished products. By maintaining complete transaction visibility, implementing quality controls, and providing comprehensive monitoring, the system ensures inventory accuracy throughout the entire bottling process.

For additional support or questions about this integration, please refer to the system logs or contact the development team.
