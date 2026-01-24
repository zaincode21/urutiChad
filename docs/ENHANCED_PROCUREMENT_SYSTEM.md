# Enhanced Procurement System for Smart Bottling Module

## Overview

The Enhanced Procurement System is a comprehensive raw material acquisition solution that follows real-world procurement processes. It provides end-to-end management from supplier onboarding to goods receipt, including quality control and performance tracking.

## Key Features

### 1. Supplier Management
- **Supplier Onboarding**: Complete supplier registration with contact details, payment terms, and credit limits
- **Supplier Categories**: Classification by type (perfume, packaging, general)
- **Performance Tracking**: Rating system based on delivery, quality, and communication
- **Approval Workflow**: Multi-level approval process for new suppliers

### 2. Purchase Requisition System
- **Request Creation**: Department heads can create purchase requests
- **Multi-level Approval**: Manager and finance approval workflows
- **Priority Management**: Low, normal, high, urgent priority levels
- **Cost Estimation**: Automatic cost calculation and budget tracking

### 3. Purchase Order Management
- **PO Generation**: Convert approved requisitions to purchase orders
- **Supplier Selection**: Choose from approved suppliers based on performance and pricing
- **Order Tracking**: Real-time status updates (pending, approved, in_transit, delivered)
- **Cost Breakdown**: Detailed cost analysis including shipping and taxes

### 4. Goods Receipt & Quality Control
- **GRN Creation**: Document received materials with batch numbers and expiry dates
- **Quality Inspection**: Multi-level quality checks (visual, functional, lab testing)
- **Acceptance/Rejection**: Track accepted vs rejected quantities with reasons
- **Stock Updates**: Automatic inventory updates upon acceptance

### 5. Performance Analytics
- **Supplier Performance**: Delivery on-time rates, quality acceptance rates
- **Cost Analysis**: Spend analysis by supplier, material, and time period
- **Reorder Suggestions**: AI-powered reorder recommendations
- **Trend Analysis**: Historical data analysis for better decision making

## Database Schema

### Core Tables

#### 1. Suppliers
```sql
CREATE TABLE suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  postal_code TEXT,
  tax_id TEXT,
  payment_terms TEXT DEFAULT 'Net 30',
  credit_limit DECIMAL(10,2) DEFAULT 0,
  current_balance DECIMAL(10,2) DEFAULT 0,
  supplier_category TEXT DEFAULT 'general',
  rating DECIMAL(3,2) DEFAULT 0,
  is_approved BOOLEAN DEFAULT 0,
  is_active BOOLEAN DEFAULT 1,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. Supplier Materials
```sql
CREATE TABLE supplier_materials (
  id TEXT PRIMARY KEY,
  supplier_id TEXT NOT NULL,
  material_id TEXT NOT NULL,
  supplier_material_code TEXT,
  lead_time_days INTEGER DEFAULT 7,
  minimum_order_quantity DECIMAL(10,3) DEFAULT 0,
  standard_cost DECIMAL(10,2) NOT NULL,
  bulk_discount_percentage DECIMAL(5,2) DEFAULT 0,
  is_preferred BOOLEAN DEFAULT 0,
  last_order_date DATE,
  last_order_quantity DECIMAL(10,3),
  last_order_cost DECIMAL(10,2),
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers (id),
  FOREIGN KEY (material_id) REFERENCES raw_materials (id),
  UNIQUE(supplier_id, material_id)
);
```

#### 3. Purchase Requisitions
```sql
CREATE TABLE purchase_requisitions (
  id TEXT PRIMARY KEY,
  requisition_number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'normal',
  status TEXT DEFAULT 'pending',
  requested_by TEXT NOT NULL,
  approved_by TEXT,
  approved_at DATETIME,
  total_estimated_cost DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (requested_by) REFERENCES users (id),
  FOREIGN KEY (approved_by) REFERENCES users (id)
);
```

#### 4. Purchase Orders
```sql
CREATE TABLE purchase_orders (
  id TEXT PRIMARY KEY,
  po_number TEXT UNIQUE NOT NULL,
  supplier_id TEXT NOT NULL,
  requisition_id TEXT,
  order_date DATE NOT NULL,
  expected_delivery_date DATE,
  status TEXT DEFAULT 'pending',
  subtotal DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  shipping_cost DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  payment_terms TEXT,
  shipping_address TEXT,
  notes TEXT,
  created_by TEXT NOT NULL,
  approved_by TEXT,
  approved_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers (id),
  FOREIGN KEY (requisition_id) REFERENCES purchase_requisitions (id),
  FOREIGN KEY (created_by) REFERENCES users (id),
  FOREIGN KEY (approved_by) REFERENCES users (id)
);
```

#### 5. Goods Receipt Notes
```sql
CREATE TABLE goods_receipt_notes (
  id TEXT PRIMARY KEY,
  grn_number TEXT UNIQUE NOT NULL,
  purchase_order_id TEXT NOT NULL,
  delivery_date DATE NOT NULL,
  received_by TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  total_items INTEGER DEFAULT 0,
  total_quantity DECIMAL(10,3) DEFAULT 0,
  total_value DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders (id),
  FOREIGN KEY (received_by) REFERENCES users (id)
);
```

#### 6. Quality Inspections
```sql
CREATE TABLE quality_inspections (
  id TEXT PRIMARY KEY,
  grn_item_id TEXT NOT NULL,
  inspector_id TEXT NOT NULL,
  inspection_date DATETIME NOT NULL,
  inspection_type TEXT DEFAULT 'receiving',
  visual_inspection BOOLEAN DEFAULT 0,
  functional_test BOOLEAN DEFAULT 0,
  lab_test BOOLEAN DEFAULT 0,
  test_results TEXT,
  compliance_status TEXT DEFAULT 'pending',
  defects_found TEXT,
  corrective_actions TEXT,
  is_approved BOOLEAN DEFAULT 0,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (grn_item_id) REFERENCES goods_receipt_items (id),
  FOREIGN KEY (inspector_id) REFERENCES users (id)
);
```

## API Endpoints

### Supplier Management
- `GET /api/procurement/suppliers` - Get all suppliers with filters
- `POST /api/procurement/suppliers` - Create new supplier
- `POST /api/procurement/supplier-materials` - Add supplier material

### Purchase Requisitions
- `GET /api/procurement/requisitions` - Get purchase requisitions
- `POST /api/procurement/requisitions` - Create purchase requisition
- `POST /api/procurement/requisitions/:id/approve` - Approve requisition

### Purchase Orders
- `GET /api/procurement/purchase-orders` - Get purchase orders
- `POST /api/procurement/purchase-orders` - Create purchase order

### Goods Receipt
- `POST /api/procurement/goods-receipts` - Create goods receipt note

### Quality Control
- `POST /api/procurement/quality-inspections` - Perform quality inspection

### Analytics
- `GET /api/procurement/analytics` - Get procurement analytics
- `GET /api/procurement/reorder-suggestions` - Get reorder suggestions

## Business Process Flow

### 1. Supplier Onboarding Process
```
1. Supplier Registration → 2. Document Verification → 3. Credit Check → 4. Approval → 5. Material Mapping
```

### 2. Purchase Requisition Process
```
1. Department Request → 2. Manager Review → 3. Finance Approval → 4. Supplier Selection → 5. PO Creation
```

### 3. Purchase Order Process
```
1. PO Creation → 2. Supplier Confirmation → 3. Order Tracking → 4. Delivery → 5. Goods Receipt
```

### 4. Quality Control Process
```
1. Goods Receipt → 2. Initial Inspection → 3. Quality Testing → 4. Acceptance/Rejection → 5. Stock Update
```

## Key Business Insights

### 1. Cost Optimization
- **Supplier Comparison**: Compare costs across multiple suppliers
- **Bulk Discounts**: Track and apply bulk purchase discounts
- **Total Cost Analysis**: Include shipping, taxes, and handling costs

### 2. Quality Management
- **Acceptance Rates**: Track quality acceptance rates by supplier
- **Defect Tracking**: Document and analyze quality issues
- **Corrective Actions**: Implement and track improvement measures

### 3. Performance Metrics
- **Delivery Performance**: On-time delivery rates
- **Quality Performance**: Acceptance rates and defect tracking
- **Cost Performance**: Price competitiveness analysis
- **Communication**: Response times and issue resolution

### 4. Inventory Optimization
- **Reorder Points**: Automatic reorder suggestions based on stock levels
- **Lead Time Management**: Account for supplier lead times
- **Safety Stock**: Maintain appropriate safety stock levels

## Sample Data

### Suppliers
- **Premium Glass Suppliers Ltd**: Specializes in glass bottles and containers
- **Aroma Essence International**: Premium perfume oils and fragrances
- **Metal Craft Industries**: Metal caps and closures
- **Label Masters Inc**: Custom labels and packaging materials
- **Oud & Musk Suppliers**: Premium oud and musk oils from UAE

### Performance Metrics
- **Delivery On-Time Rate**: 95-100%
- **Quality Acceptance Rate**: 98-100%
- **Price Competitiveness**: 85-95%
- **Communication Rating**: 90-95%

## Integration with Smart Bottling

The Enhanced Procurement System integrates seamlessly with the Smart Bottling module:

1. **Material Requirements**: Automatic calculation of material needs based on production forecasts
2. **Cost Tracking**: Real-time cost updates for accurate bottling cost calculations
3. **Quality Assurance**: Quality-controlled materials ensure consistent product quality
4. **Inventory Management**: Seamless stock updates from procurement to production

## Benefits for End Users

### 1. Operational Efficiency
- **Automated Workflows**: Streamlined approval and ordering processes
- **Real-time Tracking**: Live status updates throughout the procurement cycle
- **Document Management**: Centralized storage of all procurement documents

### 2. Cost Control
- **Transparent Pricing**: Clear visibility into all cost components
- **Supplier Competition**: Easy comparison of supplier offerings
- **Budget Management**: Real-time budget tracking and alerts

### 3. Quality Assurance
- **Systematic Inspections**: Structured quality control processes
- **Defect Tracking**: Comprehensive issue documentation and resolution
- **Supplier Accountability**: Performance-based supplier management

### 4. Strategic Insights
- **Data Analytics**: Comprehensive reporting and analysis tools
- **Trend Analysis**: Historical data for informed decision making
- **Performance Optimization**: Continuous improvement recommendations

## Future Enhancements

### 1. Advanced Analytics
- **Predictive Analytics**: Forecast material requirements and costs
- **Supplier Risk Assessment**: AI-powered supplier risk evaluation
- **Market Intelligence**: Real-time market price monitoring

### 2. Automation
- **Auto-Ordering**: Automatic PO generation based on reorder points
- **Electronic Invoicing**: Automated invoice processing and matching
- **Supplier Portal**: Self-service portal for suppliers

### 3. Compliance
- **Regulatory Compliance**: Track and ensure regulatory requirements
- **Audit Trails**: Comprehensive audit logging for compliance
- **Document Management**: Advanced document storage and retrieval

This Enhanced Procurement System transforms raw material acquisition from a reactive process to a strategic, data-driven function that provides significant competitive advantages through cost optimization, quality assurance, and operational efficiency. 