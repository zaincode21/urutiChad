# Smart Bottling & Cost Tracking Module

## Table of Contents
1. [Overview](#overview)
2. [Core Features](#core-features)
3. [Database Schema](#database-schema)
4. [API Endpoints](#api-endpoints)
5. [Frontend Components](#frontend-components)
6. [Smart Features](#smart-features)
7. [Cost Calculation](#cost-calculation)
8. [Usage Guide](#usage-guide)
9. [Technical Implementation](#technical-implementation)
10. [Troubleshooting](#troubleshooting)

## Overview

The Smart Bottling & Cost Tracking Module is a comprehensive solution for managing the transformation of bulk perfumes into bottled, labeled, and sellable products. It provides detailed cost tracking, inventory management, and intelligent features to optimize the bottling process for perfume businesses.

### Key Benefits
- **Complete Cost Tracking**: Track all cost components including raw materials, labor, and overhead
- **Inventory Management**: Real-time stock tracking with low stock alerts
- **Recipe Management**: Bill of Materials (BOM) for consistent product quality
- **Batch Tracking**: Complete traceability of bottling batches
- **Smart Forecasting**: AI-powered material requirement forecasting
- **Analytics**: Comprehensive reporting and insights

## Core Features

### 1. Raw Materials Management
- **Material Types**: Perfume, bottles, caps, labels, packaging
- **Stock Tracking**: Real-time inventory levels with minimum stock alerts
- **Cost Tracking**: Per-unit cost tracking for accurate pricing
- **Supplier Management**: Track suppliers and batch numbers
- **Stock Ledger**: Complete transaction history

### 2. Recipe Management (Bill of Materials)
- **Recipe Creation**: Define materials and quantities per unit
- **Bottle Size Integration**: Link recipes to specific bottle sizes
- **Material Quantities**: Precise quantity tracking per unit
- **Cost Calculation**: Automatic cost calculation based on materials

### 3. Bottling Batch Management
- **Batch Creation**: Create bottling batches with recipe selection
- **Cost Breakdown**: Detailed cost analysis per batch
- **Product Generation**: Automatic SKU and product creation
- **Batch Tracking**: Unique batch numbers for traceability

### 4. Cost Tracking
- **Component Breakdown**: 
  - Raw perfume cost
  - Bottle cost
  - Cap cost
  - Label cost
  - Labor cost
  - Overhead allocation
- **Unit Cost Calculation**: Per-unit cost analysis
- **Selling Price Generation**: Automatic markup calculation

### 5. Smart Features
- **Material Forecasting**: Predict material requirements based on trends
- **Low Stock Alerts**: Automatic notifications for reordering
- **Popular Size Analysis**: Identify trending bottle sizes
- **Cost Optimization**: Identify cost-saving opportunities

## Database Schema

### Core Tables

#### `raw_materials`
```sql
CREATE TABLE raw_materials (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- perfume, bottle, cap, label, packaging
  description TEXT,
  unit TEXT NOT NULL,
  current_stock DECIMAL(10,3) NOT NULL,
  cost_per_unit DECIMAL(10,2) NOT NULL,
  supplier TEXT,
  batch_number TEXT,
  expiry_date DATE,
  min_stock_level DECIMAL(10,3) DEFAULT 0,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### `bottling_recipes`
```sql
CREATE TABLE bottling_recipes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  bottle_size_id TEXT NOT NULL,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bottle_size_id) REFERENCES bottle_sizes (id)
);
```

#### `recipe_materials`
```sql
CREATE TABLE recipe_materials (
  id TEXT PRIMARY KEY,
  recipe_id TEXT NOT NULL,
  material_id TEXT NOT NULL,
  quantity_per_unit DECIMAL(10,3) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (recipe_id) REFERENCES bottling_recipes (id) ON DELETE CASCADE,
  FOREIGN KEY (material_id) REFERENCES raw_materials (id)
);
```

#### `bottling_batches`
```sql
CREATE TABLE bottling_batches (
  id TEXT PRIMARY KEY,
  batch_number TEXT UNIQUE NOT NULL,
  recipe_id TEXT NOT NULL,
  bulk_perfume_id TEXT NOT NULL,
  quantity_produced INTEGER NOT NULL,
  total_cost DECIMAL(10,2) NOT NULL,
  unit_cost DECIMAL(10,2) NOT NULL,
  selling_price DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'completed',
  notes TEXT,
  created_by TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (recipe_id) REFERENCES bottling_recipes (id),
  FOREIGN KEY (bulk_perfume_id) REFERENCES perfume_bulk (id),
  FOREIGN KEY (created_by) REFERENCES users (id)
);
```

#### `cost_components`
```sql
CREATE TABLE cost_components (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL,
  component_type TEXT NOT NULL, -- material, labor, overhead
  component_name TEXT NOT NULL,
  quantity DECIMAL(10,3) NOT NULL,
  unit_cost DECIMAL(10,2) NOT NULL,
  total_cost DECIMAL(10,2) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (batch_id) REFERENCES bottling_batches (id) ON DELETE CASCADE
);
```

#### `stock_ledger`
```sql
CREATE TABLE stock_ledger (
  id TEXT PRIMARY KEY,
  material_id TEXT NOT NULL,
  transaction_type TEXT NOT NULL, -- initial, consumption, receipt
  quantity DECIMAL(10,3) NOT NULL,
  unit_cost DECIMAL(10,2) NOT NULL,
  total_value DECIMAL(10,2) NOT NULL,
  reference_type TEXT,
  reference_id TEXT,
  notes TEXT,
  created_by TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (material_id) REFERENCES raw_materials (id),
  FOREIGN KEY (created_by) REFERENCES users (id)
);
```

## API Endpoints

### Raw Materials
- `GET /api/smart-bottling/raw-materials` - Get all raw materials
- `POST /api/smart-bottling/raw-materials` - Add new raw material

### Recipes
- `GET /api/smart-bottling/recipes` - Get all recipes with materials
- `POST /api/smart-bottling/recipes` - Create new recipe

### Batches
- `GET /api/smart-bottling/batches` - Get recent bottling batches
- `POST /api/smart-bottling/batch` - Create new bottling batch
- `GET /api/smart-bottling/batch/:id` - Get batch details with cost breakdown

### Analytics
- `GET /api/smart-bottling/stats` - Get comprehensive statistics
- `GET /api/smart-bottling/forecast` - Get material requirements forecast
- `GET /api/smart-bottling/popular-sizes` - Get popular bottle sizes
- `GET /api/smart-bottling/low-stock-alerts` - Get low stock alerts
- `GET /api/smart-bottling/stock-ledger` - Get inventory transaction history
- `GET /api/smart-bottling/cost-breakdown/:batch_id` - Get detailed cost breakdown

## Frontend Components

### Main Page: `SmartBottling.jsx`
The main page provides a tabbed interface with the following sections:

1. **Dashboard Tab**
   - Statistics cards (total batches, bottles, costs, alerts)
   - Quick actions
   - Popular bottle sizes

2. **Raw Materials Tab**
   - Material inventory list
   - Stock levels and costs
   - Add new materials

3. **Recipes Tab**
   - Recipe cards with materials
   - Create new recipes
   - Bill of Materials view

4. **Batches Tab**
   - Recent bottling batches
   - Cost information
   - Batch details view

5. **Forecast Tab**
   - Material requirements forecast
   - Days remaining calculations
   - Consumption trends

6. **Alerts Tab**
   - Low stock alerts
   - Reorder recommendations

### Modal Components
- `RawMaterialModal` - Add/edit raw materials
- `RecipeModal` - Create/edit recipes
- `BatchModal` - Create new bottling batches
- `BatchDetailsModal` - View batch details and costs

## Smart Features

### 1. Material Forecasting
The system analyzes historical bottling data to predict future material requirements:

```javascript
// Calculate daily consumption averages
const dailyAverage = totalConsumption / daysAnalyzed;
const forecast30Days = dailyAverage * 30;
const daysRemaining = currentStock / dailyAverage;
```

### 2. Low Stock Alerts
Automatic monitoring of stock levels against minimum thresholds:

```javascript
// Check if stock is below minimum level
const isLowStock = currentStock <= minStockLevel;
const stockRatio = currentStock / minStockLevel;
```

### 3. Popular Size Analysis
Identifies trending bottle sizes based on production data:

```javascript
// Analyze production trends by size
SELECT size_ml, COUNT(*) as batch_count, SUM(quantity_produced) as total_bottles
FROM bottling_batches bb
JOIN bottling_recipes br ON bb.recipe_id = br.id
JOIN bottle_sizes bs ON br.bottle_size_id = bs.id
GROUP BY size_ml
ORDER BY total_bottles DESC
```

### 4. Cost Optimization
Provides insights for cost reduction:

- Material cost breakdown
- Labor efficiency analysis
- Overhead allocation optimization
- Bulk purchasing recommendations

## Cost Calculation

### Cost Components

1. **Raw Perfume Cost**
   ```
   Perfume Cost = (Liters used) × (Cost per liter)
   ```

2. **Bottle Cost**
   ```
   Bottle Cost = Units × Price per bottle
   ```

3. **Cap Cost**
   ```
   Cap Cost = Units × Price per cap
   ```

4. **Label Cost**
   ```
   Label Cost = Units × Price per label
   ```

5. **Labor Cost**
   ```
   Labor Cost = (Setup hours + Bottling hours) × Labor rate
   Setup hours = 2 hours
   Bottling hours = Units × 0.01 hours per bottle
   ```

6. **Overhead Cost**
   ```
   Overhead = (Direct costs) × 10%
   Direct costs = Perfume + Bottle + Cap + Label + Labor
   ```

### Total Cost Calculation
```
Total Cost = Perfume + Bottle + Cap + Label + Labor + Overhead
Unit Cost = Total Cost / Quantity Produced
Selling Price = Unit Cost × 1.5 (50% markup)
```

## Usage Guide

### Setting Up the System

1. **Add Raw Materials**
   - Navigate to Raw Materials tab
   - Click "Add Material"
   - Fill in material details (name, type, cost, stock level)
   - Set minimum stock levels for alerts

2. **Create Recipes**
   - Go to Recipes tab
   - Click "Create Recipe"
   - Select bottle size
   - Add materials with quantities per unit
   - Save recipe

3. **Create Bottling Batches**
   - Navigate to Dashboard or Batches tab
   - Click "Create New Batch"
   - Select recipe and bulk perfume
   - Enter quantity to produce
   - System calculates costs automatically

### Daily Operations

1. **Monitor Dashboard**
   - Check statistics and alerts
   - Review popular sizes
   - Monitor low stock items

2. **Create Batches**
   - Select appropriate recipe
   - Verify material availability
   - Review cost breakdown
   - Create batch

3. **Track Inventory**
   - Monitor stock levels
   - Review stock ledger
   - Respond to low stock alerts

### Best Practices

1. **Material Management**
   - Set realistic minimum stock levels
   - Monitor supplier performance
   - Track batch numbers for quality control

2. **Recipe Optimization**
   - Review material quantities regularly
   - Optimize for cost efficiency
   - Maintain quality standards

3. **Batch Planning**
   - Plan batches based on demand
   - Consider material availability
   - Monitor cost trends

## Technical Implementation

### Backend Services

#### `bottlingService.js`
Core service handling all bottling operations:

```javascript
class BottlingService {
  // Generate unique batch numbers
  generateBatchNumber() { ... }
  
  // Calculate comprehensive costs
  async calculateBottlingCost(recipeId, quantity, bulkPerfumeId) { ... }
  
  // Create bottling batches with full tracking
  async createBottlingBatch(batchData) { ... }
  
  // Get analytics and statistics
  async getBottlingStats() { ... }
  
  // Forecast material requirements
  async forecastMaterialRequirements(days) { ... }
}
```

#### Database Transactions
All batch creation operations use database transactions to ensure data consistency:

```javascript
await database.run('BEGIN TRANSACTION');
// ... perform operations ...
await database.run('COMMIT');
```

### Frontend State Management

#### React Query Integration
Uses React Query for efficient data fetching and caching:

```javascript
const { data: statsData } = useQuery({
  queryKey: ['bottling-stats'],
  queryFn: () => axios.get('/api/smart-bottling/stats').then(res => res.data)
});
```

#### Mutation Handling
Optimistic updates and error handling:

```javascript
const createBatchMutation = useMutation({
  mutationFn: (data) => axios.post('/api/smart-bottling/batch', data),
  onSuccess: () => {
    queryClient.invalidateQueries(['bottling-batches', 'bottling-stats']);
    setShowBatchModal(false);
  }
});
```

## Troubleshooting

### Common Issues

1. **Material Stock Errors**
   - **Problem**: Insufficient stock for batch creation
   - **Solution**: Check current stock levels and add materials

2. **Cost Calculation Errors**
   - **Problem**: Incorrect cost calculations
   - **Solution**: Verify material costs and recipe quantities

3. **Batch Creation Failures**
   - **Problem**: Database transaction errors
   - **Solution**: Check database connectivity and constraints

### Debugging

1. **Check API Logs**
   ```bash
   # Monitor server logs
   tail -f server/logs/app.log
   ```

2. **Verify Database**
   ```sql
   -- Check raw materials
   SELECT * FROM raw_materials WHERE is_active = 1;
   
   -- Check recipes
   SELECT * FROM bottling_recipes WHERE is_active = 1;
   
   -- Check batches
   SELECT * FROM bottling_batches ORDER BY created_at DESC LIMIT 10;
   ```

3. **Test API Endpoints**
   ```bash
   # Test statistics endpoint
   curl -H "Authorization: Bearer <token>" http://localhost:5000/api/smart-bottling/stats
   ```

### Performance Optimization

1. **Database Indexing**
   ```sql
   -- Add indexes for better performance
   CREATE INDEX idx_bottling_batches_created_at ON bottling_batches(created_at);
   CREATE INDEX idx_cost_components_batch_id ON cost_components(batch_id);
   CREATE INDEX idx_stock_ledger_material_id ON stock_ledger(material_id);
   ```

2. **Query Optimization**
   - Use pagination for large datasets
   - Implement caching for frequently accessed data
   - Optimize complex joins

3. **Frontend Optimization**
   - Implement virtual scrolling for large lists
   - Use React.memo for expensive components
   - Optimize re-renders with proper state management

## Future Enhancements

### Planned Features

1. **Advanced Analytics**
   - Cost trend analysis
   - Profitability reports
   - Efficiency metrics

2. **Integration Features**
   - E-commerce platform sync
   - POS system integration
   - Supplier portal

3. **Automation**
   - Auto-reorder triggers
   - Batch scheduling
   - Quality control automation

4. **Mobile Support**
   - Mobile app for batch creation
   - Barcode scanning
   - Offline capabilities

### API Extensions

1. **Webhook Support**
   - Real-time notifications
   - Third-party integrations
   - Event-driven updates

2. **Bulk Operations**
   - Batch import/export
   - Mass updates
   - Data migration tools

3. **Advanced Queries**
   - Complex filtering
   - Custom reports
   - Data aggregation

---

This Smart Bottling & Cost Tracking Module provides a comprehensive solution for perfume businesses to manage their bottling operations efficiently while maintaining detailed cost control and inventory management. 