# API Reference Guide

## Base URL
```
http://localhost:3001/api
```

## Authentication
All endpoints require authentication via Bearer token in the Authorization header:
```
Authorization: Bearer <your-token>
```

## Product Management

### Get All Products
```http
GET /products
```

**Query Parameters:**
- `type` (string): Filter by product type
- `brand_id` (string): Filter by brand ID
- `category_id` (string): Filter by category ID
- `search` (string): Search in name/description
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)

**Response:**
```json
{
  "success": true,
  "products": [...],
  "total": 100,
  "page": 1,
  "limit": 20
}
```

### Create Product
```http
POST /products
```

**Request Body:**
```json
{
  "name": "Product Name",
  "description": "Description",
  "sku": "SKU-123", // Optional
  "barcode": "1234567890123",
  "brand_id": "brand-uuid",
  "product_type": "perfume",
  "size": "100ml",
  "color": "Blue",
  "variant": "Summer Edition",
  "price": 99.99,
  "cost_price": 50.00,
  "stock_quantity": 50,
  "category_ids": ["cat-uuid-1", "cat-uuid-2"]
}
```

### Update Product
```http
PUT /products/:id
```

### Delete Product
```http
DELETE /products/:id
```

### Update Product Barcode
```http
PATCH /products/:id
```

**Request Body:**
```json
{
  "barcode": "new-barcode-value"
}
```

### Get Product Intelligence
```http
GET /products/:id/intelligence
```

**Response:**
```json
{
  "success": true,
  "insights": {
    "skuAnalysis": {...},
    "duplicateAnalysis": {...},
    "demandForecast": {...},
    "imageAnalysis": {...},
    "overallScore": 87,
    "recommendations": [...]
  }
}
```

## Category Management

### Get All Categories
```http
GET /categories
```

### Create Category
```http
POST /categories
```

**Request Body:**
```json
{
  "name": "Category Name",
  "description": "Description",
  "parent_id": "parent-category-id" // Optional
}
```

### Update Category
```http
PUT /categories/:id
```

### Delete Category
```http
DELETE /categories/:id
```

## Brand Management

### Get All Brands
```http
GET /brands
```

### Create Brand
```http
POST /brands
```

**Request Body:**
```json
{
  "name": "Brand Name",
  "description": "Description",
  "logo_url": "https://example.com/logo.png",
  "website": "https://brand.com"
}
```

### Update Brand
```http
PUT /brands/:id
```

### Delete Brand
```http
DELETE /brands/:id
```

## Image Upload

### Upload Image
```http
POST /upload
```

**Request:** Multipart form data with `image` field

**Response:**
```json
{
  "success": true,
  "imageUrl": "/uploads/filename.jpg",
  "filename": "filename.jpg"
}
```

## Perfume Management

### Get Bulk Perfumes
```http
GET /perfume/bulk
```

### Add Bulk Perfume
```http
POST /perfume/bulk
```

**Request Body:**
```json
{
  "name": "Perfume Name",
  "description": "Description",
  "fragrance_family": "Floral",
  "concentration": "Eau de Parfum",
  "volume_ml": 1000,
  "cost_per_ml": 0.05,
  "supplier": "Supplier Name",
  "batch_number": "BATCH-001",
  "expiry_date": "2025-12-31"
}
```

### Get Bottle Sizes
```http
GET /perfume/bottle-sizes
```

### Add Bottle Size
```http
POST /perfume/bottle-sizes
```

**Request Body:**
```json
{
  "size_ml": 50,
  "bottle_cost": 2.50,
  "cap_cost": 0.75,
  "label_cost": 0.25,
  "packaging_cost": 1.00
}
```

### Bottle Perfume
```http
POST /perfume/bottling
```

**Request Body:**
```json
{
  "bulk_perfume_id": "bulk-perfume-uuid",
  "bottle_size_id": "bottle-size-uuid",
  "quantity": 100,
  "bottling_date": "2024-01-15",
  "batch_number": "BOTTLE-001"
}
```

## Error Responses

### 400 Bad Request
```json
{
  "error": "Validation error message"
}
```

### 401 Unauthorized
```json
{
  "error": "Authentication required"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Server error"
}
```

## Status Codes

- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `404`: Not Found
- `500`: Internal Server Error

## Rate Limiting

- 100 requests per minute per IP
- 1000 requests per hour per user

## File Upload Limits

- Maximum file size: 5MB
- Supported formats: JPG, PNG, GIF, WebP
- Maximum files per request: 10 