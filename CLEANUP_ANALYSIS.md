# Project Cleanup and Ergonomics Analysis

## Unused Files Identified

### 1. Duplicate/Alternative Versions
- `client/src/pages/Discounts_New.jsx` - Alternative version of Discounts.jsx
- `client/src/pages/DiscountsClean.jsx` - Cleaner version of Discounts.jsx  
- `client/src/pages/SmartBottling_original.jsx` - Original version of SmartBottling.jsx
- `client/src/pages/IntegrationsStandardized.jsx` - Standardized version of Integrations.jsx

### 2. Unused Pages (Not in Navigation/Routes)
- `client/src/pages/Procurement.jsx` - Not referenced in App.jsx routes
- `client/src/pages/OrdersDashboard.jsx` - Not referenced in App.jsx routes
- `client/src/pages/AtelierSale.jsx` - Not referenced in App.jsx routes

### 3. Backup Files
- `client/src/lib/i18n/fr.js.bak` - Backup file

### 4. Unused Components (Based on Analysis)
- `client/src/components/charts/ExpenseChart.jsx` - Not imported anywhere
- `client/src/components/CurrencyConversionDemo.jsx` - Demo component
- `client/src/components/PricingAnalysis.jsx` - Not used in current navigation
- `client/src/components/PricingDashboard.jsx` - Not used in current navigation
- `client/src/components/PricingOptimization.jsx` - Not used in current navigation
- `client/src/components/ProductIntelligence.jsx` - Not used in current navigation
- `client/src/components/ProfessionalFinancialReports.jsx` - Not used in current navigation

## Ergonomics Improvements Needed

### 1. Navigation Simplification
- Too many nested menus in Navigation.jsx
- Inconsistent role-based access patterns
- Some menu items lead to non-existent pages

### 2. Component Organization
- Large components like MeasurementsModal.jsx could be split
- Inconsistent styling patterns across components
- Missing loading states in some components

### 3. Code Quality Issues
- Duplicate code in discount management files
- Inconsistent error handling patterns
- Missing TypeScript definitions

### 4. User Experience Issues
- Complex forms without proper validation feedback
- Inconsistent button styles and interactions
- Missing keyboard navigation support

## Recommended Actions

### Phase 1: File Cleanup
1. Remove duplicate/alternative versions
2. Remove unused pages and components
3. Clean up backup files
4. Update imports and references

### Phase 2: Navigation Optimization
1. Simplify menu structure
2. Consolidate similar functionality
3. Improve role-based access control
4. Add breadcrumb navigation

### Phase 3: Component Improvements
1. Split large components into smaller ones
2. Standardize styling patterns
3. Add proper loading states
4. Improve form validation

### Phase 4: UX Enhancements
1. Add keyboard navigation
2. Improve accessibility
3. Standardize button interactions
4. Add better error messages