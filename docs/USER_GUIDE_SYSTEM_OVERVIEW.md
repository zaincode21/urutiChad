# Urutirose System Overview and User Guide

This guide explains how the Urutirose Smart Retail Platform works from a user perspective, grouped by major categories. It also links key parts of the codebase and API so developers and power users can go deeper.

- Audience: Cashiers, Managers, Admins, and Developers
- Frontend: React (client/)
- Backend: Node.js + Express + PostgreSQL (server/)
- Base URLs (development):
  - Web App: http://localhost:3000
  - API: http://127.0.0.1:5000/api

Refer to `docs/API_REFERENCE.md` for endpoint details and `server/routes/*.js` for implementation.

---

## Table of Contents
1. Roles and Access Control
2. Authentication and Sessions
3. Products and Inventory
4. Barcodes: Generate, View, Download
5. Categories and Brands
6. Orders and Sales (Overview)
7. Expenses and Financials (Overview)
8. Notifications and Intelligence (Overview)
9. Files, Uploads, and Downloads
10. Error Handling and Toast Messages
11. Environment, CORS and Server Setup
12. Data Model (High-level)
13. Useful Paths in the Codebase

---

## 1) Roles and Access Control

- Roles: `admin`, `manager`, `cashier`.
- Where role is stored: `client/src/contexts/AuthContext.jsx` and browser `localStorage` key `user`.
- UI behavior by role (examples):
  - Admin/Manager see global inventory; Cashier sees shop-specific inventory.
  - Barcode generation: Admin/Manager can generate; Cashier view-only.
  - Some toolbar actions are available only to Admin/Manager.

Related files:
- `client/src/pages/Products.jsx` (role-aware inventory labels and actions)
- `server/middleware/auth.js` and `server/middleware/permissions.js`

---

## 2) Authentication and Sessions

- Login/Logout handled by `AuthProvider` (`client/src/contexts/AuthContext.jsx`).
- On successful login, the API returns `token` and `user` stored in `localStorage`.
- Protected API routes require `Authorization: Bearer <token>`.

Related files:
- Routes: `server/routes/auth.js`
- Client API: `client/src/lib/api.js`

---

## 3) Products and Inventory

- Page: `Products` at `/products`.
- Features:
  - Search, filters (category, brand, stock, status, price).
  - View modes: grid, list, table.
  - Pagination and sorting.
  - Create/Edit/Delete products.
  - Duplicate product.
  - Toggle active/inactive.
  - Quick View modal with details.

- Stock visibility:
  - Admin/Manager: global stock view.
  - Cashier: shop-specific stock view.

Related files:
- Client: `client/src/pages/Products.jsx`
- Server:
  - `server/routes/products.js` (CRUD + status + barcode PATCH)
  - `server/routes/brands.js`, `server/routes/categories.js`
  - Inventory shop filtering: `server/routes/products.js` (cashier behavior)

---

## 4) Barcodes: Generate, View, Download

- Components:
  - `BarcodeGenerator` modal: `client/src/components/BarcodeGenerator.jsx`
  - `BarcodeDisplay` renderer: `client/src/components/BarcodeDisplay.jsx`

- How it works in the UI:
  - If a product has no barcode, card shows “Generate Barcode” icon (Admin/Manager only for applying).
  - If a product has a barcode, card shows “View Barcode” icon (all roles can view).
  - The generator opens as a modal. In view-only mode, inputs are disabled but Copy/Download are allowed.
  - Download file name pattern: `name (SKU).png` or `name (barcode).png` if SKU is missing.

- Validation:
  - For numeric symbologies (EAN-13, EAN-8, UPC, ITF-14), value must be digits with specific lengths.
  - For alphanumeric needs, use CODE128 (recommended) or CODE39.

- Saving the barcode to product:
  - The app sends `PATCH /api/products/:id` with `{ barcode }`.
  - Server updates the `products.barcode` column.

Related code:
- Client usage and permissions: `client/src/pages/Products.jsx`
- Server endpoints: `server/routes/products.js`
- Data column: `server/database/schema.js` (products.barcode)

---

## 5) Categories and Brands

- Categories power filters and product classification.
- Brands list powers brand selection.

Related files:
- Client: category/brand fetching in `client/src/pages/Products.jsx`.
- Server: `server/routes/categories.js`, `server/routes/brands.js`.

---

## 6) Orders and Sales (Overview)

- Order-related endpoints and logic live under `server/routes/orders.js` and related services.
- POS/sales flows integrate products, pricing, discounts, and inventory updates.

See also:
- `docs/COMPLETE_INTEGRATION_OVERVIEW.md`
- `server/services/orderService.js`

---

## 7) Expenses and Financials (Overview)

- Expense tracking routes under `server/routes/expenses.js`.
- GL Accounting and Financial Reports under `server/routes/glAccounts.js` and `server/routes/financialReports.js`.

See also:
- `docs/GL_ACCOUNTING_IMPLEMENTATION.md`
- `docs/PROFESSIONAL_FINANCIAL_REPORTS_IMPLEMENTATION.md`

---

## 8) Notifications and Intelligence (Overview)

- Notifications: `server/routes/notifications.js`.
- Product Intelligence (AI): `client/src/components/ProductIntelligence.jsx`, coordinated by services under `server/services/ai/`.

---

## 9) Files, Uploads, and Downloads

- Image uploads: `POST /api/upload/image` (client uses `multipart/form-data`).
- Static hosting of uploads: `server/index.js` serves `/uploads`.
- Barcode downloads: client creates an image from canvas and triggers download with name pattern `name (SKU).png`.

---

## 10) Error Handling and Toast Messages

- Client uses `react-hot-toast` for notifications.
- Duplicate SKU and update errors show as red “danger” toasts with message from server (e.g., `SKU already exists`).
- Example handlers:
  - `createProductMutation.onError`
  - `updateProductMutation.onError`

Related file: `client/src/pages/Products.jsx`

---

## 11) Environment, CORS and Server Setup

- Environment variables: `.env.development`, `.env.production`, `env.example`.
- CORS: configured in `server/index.js` to allow frontend origins and methods (`GET, POST, PUT, PATCH, DELETE, OPTIONS`).
- Server Start:
  - Dev: `npm run dev` (concurrently runs server and client)
  - Server only: `npm run server`
  - Client only: `cd client && npm run dev`

---

## 12) Data Model (High-level)

- `products`:
  - Key fields: `id`, `name`, `sku` (unique), `barcode`, `brand_id`, `category_id`, `price`, `stock_quantity`, `is_active`, timestamps
- `brands`, `categories`: reference tables used in filters and product relations
- `shop_inventory`: shop-specific quantity tracking
- Many more tables for orders, expenses, GL, etc. (see `server/database/schema.js`).

---

## 13) Useful Paths in the Codebase

- Frontend
  - `client/src/pages/Products.jsx`: Main product UI
  - `client/src/components/BarcodeGenerator.jsx`: Barcode generator/viewer modal
  - `client/src/components/BarcodeDisplay.jsx`: Renders barcode images
  - `client/src/contexts/AuthContext.jsx`: Auth state and session
  - `client/src/lib/api.js`: API clients (products, categories, brands, auth, etc.)

- Backend
  - `server/index.js`: Express app, middleware, CORS, routers wiring
  - `server/routes/products.js`: Product endpoints (CRUD, status, barcode patch)
  - `server/database/schema.js`: Table definitions (including products.barcode)
  - `server/database/database.js`: PostgreSQL connection, query helpers
  - `server/middleware/auth.js`: JWT auth middleware

---

## Common Workflows

- Create a product
  1. Go to `/products` → Add Product
  2. Fill required fields (name, price, SKU or let system generate)
  3. Save → Success toast, product appears in the list

- Generate a barcode
  1. On a product card without barcode → click Generate icon
  2. For Admin/Manager, choose symbology and generate/apply
  3. For Cashier, open is view-only; download/copy allowed

- View a barcode
  1. On a product card with barcode → click View icon
  2. Preview, Copy, or Download (`name (SKU).png`)

- Update product barcode
  1. Open Edit Product
  2. Use Barcode Generator (Admin/Manager) to create a new one
  3. Save changes

- Duplicate SKU attempt
  1. On save, server responds `400 { error: 'SKU already exists' }`
  2. UI displays red danger toast with that message

---

If you need another version tailored to staff training or a printable quick-start, let us know and we’ll generate it.
