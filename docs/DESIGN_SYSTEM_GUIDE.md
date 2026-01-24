# Design System Implementation Guide

## Overview
This guide explains how to apply consistent styling, fonts, and colors across all pages in the UrutiRose application using our standardized design system.

## 🎨 Design System Components

### 1. CSS Utility Classes (`src/index.css`)

Our design system includes pre-built CSS classes that follow the Integrations page styling:

#### Layout Classes
- `page-container` - Main page wrapper (min-h-screen bg-gray-50)
- `page-header` - Page header section with white background and border
- `page-content` - Main content area with consistent padding
- `stats-grid` - Responsive grid for stat cards (1-4 columns)

#### Typography Classes
- `page-title` - Main page titles (text-2xl font-bold text-gray-900)
- `page-subtitle` - Page descriptions (text-gray-600)
- `text-heading-1/2/3` - Consistent heading styles
- `text-body` - Standard body text (text-sm text-gray-700)
- `text-caption` - Small text (text-xs text-gray-500)
- `text-muted` - Muted text (text-gray-600)

#### Component Classes
- `btn-primary/secondary/success/error/outline/ghost` - Standardized buttons
- `card/card-header/card-body/card-footer` - Card components
- `badge-success/warning/error/info/primary/gray` - Status badges
- `input/select/textarea` - Form elements with consistent styling

### 2. React Components

#### PageLayout Component
Standardizes page structure across the application:

```jsx
import PageLayout from '../components/PageLayout';

<PageLayout
  title="Page Title"
  subtitle="Optional description"
  headerActions={<button className="btn-primary">Action</button>}
  showTabs={true}
  tabs={tabs}
  activeTab={activeTab}
  onTabChange={setActiveTab}
>
  {/* Your page content */}
</PageLayout>
```

#### StatsCard Component
For displaying metrics consistently:

```jsx
import StatsCard, { StatsGrid } from '../components/StatsCard';

<StatsGrid>
  <StatsCard
    title="Total Sales"
    value="$12,345"
    icon={DollarSign}
    iconColor="text-green-600"
    trend="up"
    trendValue="12%"
  />
</StatsGrid>
```

#### SearchFilter Component
For search and filtering sections:

```jsx
import SearchFilter from '../components/SearchFilter';

<SearchFilter
  searchValue={searchTerm}
  onSearchChange={setSearchTerm}
  searchPlaceholder="Search items..."
  filters={[
    {
      label: 'Category',
      type: 'select',
      value: filterCategory,
      onChange: setFilterCategory,
      options: [
        { value: '', label: 'All Categories' },
        { value: 'electronics', label: 'Electronics' }
      ]
    }
  ]}
  actions={<button className="btn-primary">Create New</button>}
/>
```

#### Modal Component
For consistent modal dialogs:

```jsx
import Modal from '../components/Modal';

<Modal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  title="Modal Title"
  size="lg"
  footer={
    <>
      <button className="btn-outline" onClick={() => setShowModal(false)}>
        Cancel
      </button>
      <button className="btn-primary" onClick={handleSubmit}>
        Save
      </button>
    </>
  }
>
  {/* Modal content */}
</Modal>
```

## 🎯 Color Scheme

### Primary Colors
- **Primary**: `primary-500/600/700` (Teal/Green theme)
- **Background**: `bg-gray-50` (page background), `bg-white` (cards)
- **Text**: `text-gray-900` (headings), `text-gray-700` (body), `text-gray-500/600` (muted)

### Status Colors
- **Success**: `text-green-600`, `bg-green-100`
- **Error**: `text-red-600`, `bg-red-100`
- **Warning**: `text-yellow-600`, `bg-yellow-100`
- **Info**: `text-blue-600`, `bg-blue-100`

### Interactive States
- **Hover**: Consistent hover effects using opacity and color changes
- **Focus**: `focus:ring-primary-500` for form elements
- **Active**: Distinct styling for active tabs and selected items

## 📝 Step-by-Step Migration Guide

### 1. Update Page Structure

**Before:**
```jsx
const MyPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900">Page Title</h1>
        </div>
      </div>
      {/* Content */}
    </div>
  );
};
```

**After:**
```jsx
import PageLayout from '../components/PageLayout';

const MyPage = () => {
  return (
    <PageLayout title="Page Title" subtitle="Page description">
      {/* Content */}
    </PageLayout>
  );
};
```

### 2. Replace Inline Styles with Utility Classes

**Before:**
```jsx
<button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700">
  Button
</button>
```

**After:**
```jsx
<button className="btn-primary">
  Button
</button>
```

### 3. Standardize Stats Cards

**Before:**
```jsx
<div className="bg-white rounded-lg shadow p-6">
  <div className="flex items-center">
    <DollarSign className="h-8 w-8 text-primary-600" />
    <div className="ml-4">
      <p className="text-sm font-medium text-gray-500">Revenue</p>
      <p className="text-2xl font-semibold text-gray-900">$12,345</p>
    </div>
  </div>
</div>
```

**After:**
```jsx
<StatsCard
  title="Revenue"
  value="$12,345"
  icon={DollarSign}
  iconColor="text-primary-600"
/>
```

### 4. Implement Consistent Forms

**Before:**
```jsx
<div>
  <label className="block text-sm font-medium text-gray-700">Name</label>
  <input className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md..." />
</div>
```

**After:**
```jsx
<div className="form-group">
  <label className="form-label">Name</label>
  <input className="input" />
</div>
```

## 🔧 Quick Implementation Checklist

For each page you're updating:

- [ ] Replace page structure with `PageLayout` component
- [ ] Update all buttons to use `btn-*` classes
- [ ] Replace stat cards with `StatsCard` component  
- [ ] Use `SearchFilter` for search/filter sections
- [ ] Replace custom modals with `Modal` component
- [ ] Update form elements to use `form-*` and `input` classes
- [ ] Replace status indicators with `badge-*` classes
- [ ] Use consistent typography classes (`text-heading-*`, `text-body`, etc.)
- [ ] Apply consistent spacing with predefined classes
- [ ] Use standardized icons from Lucide React

## 🎨 Benefits of This Approach

1. **Consistency**: All pages will have the same look and feel
2. **Maintainability**: Changes to the design system affect all pages
3. **Development Speed**: Pre-built components reduce development time
4. **Accessibility**: Consistent focus states and color contrast
5. **Responsive**: All components are mobile-first and responsive
6. **Brand Cohesion**: Unified color scheme and typography

## 📁 File Structure

```
src/
├── components/
│   ├── PageLayout.jsx      # Main page wrapper
│   ├── StatsCard.jsx       # Metrics display
│   ├── SearchFilter.jsx    # Search/filter section
│   ├── Modal.jsx           # Modal dialogs
│   └── ...
├── index.css               # Design system CSS classes
└── pages/
    ├── IntegrationsStandardized.jsx  # Example implementation
    └── ...
```

## 🚀 Next Steps

1. Start with one page (like Dashboard) to test the implementation
2. Gradually migrate other pages using the same patterns
3. Create additional components as needed for specific use cases
4. Update the design system classes if you need variations
5. Consider creating page-specific components that extend the base components

This standardized approach will ensure all pages in your application have the same professional, clean aesthetic as the Integrations page while making maintenance and future updates much easier.
