# 🚀 Intelligent Pricing Engine

## Overview

The Intelligent Pricing Engine is a sophisticated, AI-driven pricing system that automatically calculates optimal product prices based on multiple factors including raw materials, expenses, taxes, market conditions, demand, competition, and business rules. This system provides 5 different pricing strategies and can dynamically adjust prices in real-time.

## 🎯 Key Features

### 1. **Multiple Pricing Strategies**
- **Cost-Plus Pricing**: Traditional markup-based pricing
- **Market-Based Pricing**: Competitive market positioning
- **Value-Based Pricing**: Customer perceived value pricing
- **Dynamic Pricing**: Real-time demand and inventory-based pricing
- **Competitive Pricing**: Competitor-based pricing strategies

### 2. **Intelligent Factors**
- Raw material costs and fluctuations
- Labor and overhead expenses
- Tax rates and location-based calculations
- Market demand and seasonal trends
- Inventory levels and turnover rates
- Competitor pricing analysis
- Customer willingness to pay
- Brand premium and quality ratings

### 3. **Real-Time Adjustments**
- Time-based pricing (peak hours, weekends)
- Seasonal adjustments (holidays, peak seasons)
- Inventory-based pricing (low stock premium, high stock discounts)
- Demand-based pricing (sales velocity, order frequency)
- Economic factor adjustments (inflation, market sentiment)

### 4. **Business Rules Engine**
- Minimum profit margin constraints
- Maximum price caps
- Psychological pricing ($0.99 endings)
- Bulk pricing discounts
- Customer tier pricing

## 🏗️ Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Pricing Engine Service                   │
├─────────────────────────────────────────────────────────────┤
│  • calculateProductPrice() - Main pricing calculation      │
│  • calculateBasePrice() - Cost breakdown                   │
│  • applyPricingStrategy() - Strategy selection             │
│  • applyMarketAdjustments() - Market factors               │
│  • applyBusinessRules() - Business constraints              │
│  • generateRecommendations() - AI insights                 │
└─────────────────────────────────────────────────────────────┘
```

### Database Schema

```sql
-- Products table enhancements
ALTER TABLE products ADD COLUMN pricing_strategy TEXT DEFAULT 'costPlus';
ALTER TABLE products ADD COLUMN default_markup DECIMAL(5,2) DEFAULT 100.00;
ALTER TABLE products ADD COLUMN packaging_cost DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE products ADD COLUMN brand_premium BOOLEAN DEFAULT 0;
ALTER TABLE products ADD COLUMN quality_rating DECIMAL(3,1) DEFAULT 4.0;
ALTER TABLE products ADD COLUMN unique_features BOOLEAN DEFAULT 0;

-- Pricing audit trail
CREATE TABLE price_change_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id TEXT NOT NULL,
  old_price DECIMAL(10,2) NOT NULL,
  new_price DECIMAL(10,2) NOT NULL,
  change_reason TEXT,
  pricing_strategy TEXT,
  calculated_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Configurable pricing rules
CREATE TABLE pricing_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rule_name TEXT NOT NULL UNIQUE,
  rule_type TEXT NOT NULL,
  rule_conditions TEXT NOT NULL,
  rule_actions TEXT NOT NULL,
  priority INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT 1
);

-- Market data storage
CREATE TABLE market_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id TEXT,
  data_type TEXT NOT NULL,
  data_value TEXT NOT NULL,
  source TEXT,
  confidence_score DECIMAL(3,2) DEFAULT 0.8
);

-- Competitor price tracking
CREATE TABLE competitor_prices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id TEXT NOT NULL,
  competitor_name TEXT NOT NULL,
  competitor_price DECIMAL(10,2) NOT NULL,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 🚀 Getting Started

### 1. Update Database Schema

```bash
node server/database/updatePricingSchema.js
```

### 2. Test the Pricing Engine

```bash
node test-pricing-engine.js
```

### 3. Start the Server

```bash
npm start
```

## 📡 API Endpoints

### Calculate Product Price

```http
POST /api/pricing/calculate/{productId}
Content-Type: application/json
Authorization: Bearer {token}

{
  "strategy": "dynamic",
  "markup": 150,
  "positioning": "premium",
  "location": "US"
}
```

**Response:**
```json
{
  "product_id": "123",
  "base_cost": 25.50,
  "calculated_price": 89.99,
  "pricing_strategy": "dynamic",
  "price_breakdown": {
    "raw_materials": 15.00,
    "labor": 5.50,
    "overhead": 3.00,
    "packaging": 2.00,
    "taxes": 2.04,
    "markup": 64.49,
    "profit_margin": 71.7
  },
  "market_factors": {
    "demand_level": 1.2,
    "competition_factor": 0.95,
    "seasonal_adjustment": 1.25
  },
  "recommendations": [
    {
      "type": "info",
      "message": "High profit margin detected. Consider competitive positioning.",
      "action": "market_analysis"
    }
  ]
}
```

### Bulk Pricing Calculation

```http
POST /api/pricing/calculate/bulk
Content-Type: application/json
Authorization: Bearer {token}

{
  "product_ids": ["1", "2", "3"],
  "options": {
    "strategy": "marketBased",
    "location": "US"
  }
}
```

### Update Product Prices

```http
PUT /api/pricing/update/{productId}
Content-Type: application/json
Authorization: Bearer {token}

{
  "strategy": "valueBased",
  "change_reason": "Market repositioning"
}
```

### Get Pricing Strategies

```http
GET /api/pricing/strategies
Authorization: Bearer {token}
```

### Pricing Analysis

```http
GET /api/pricing/analysis/{productId}
Authorization: Bearer {token}
```

### Price Optimization

```http
POST /api/pricing/optimization
Content-Type: application/json
Authorization: Bearer {token}

{
  "product_ids": ["1", "2", "3"],
  "constraints": {
    "min_profit_margin": 15,
    "max_price_increase": 200
  }
}
```

## 💡 Pricing Strategies Deep Dive

### 1. Cost-Plus Pricing

**Best for:** Standard products with predictable costs
**Formula:** `Final Price = Total Cost × (1 + Markup Percentage)`

```javascript
const markupPercentage = 100; // 100% markup
const markupMultiplier = (markupPercentage / 100) + 1;
const finalPrice = baseCost * markupMultiplier;
```

**Advantages:**
- Simple to implement and understand
- Guaranteed profit margin
- Easy to justify to customers

**Disadvantages:**
- May not reflect market value
- Ignores competition
- Can lead to over/under pricing

### 2. Market-Based Pricing

**Best for:** Products in competitive markets
**Formula:** `Market Price = Competition Price × Demand Factor × Seasonal Factor`

```javascript
const marketPrice = competitionPrice || baseCost * 2.5;
if (demandLevel === 'high') marketPrice *= 1.2;
if (demandLevel === 'low') marketPrice *= 0.8;
```

**Advantages:**
- Market responsive
- Competitive positioning
- Customer acceptance

**Disadvantages:**
- Requires market research
- May reduce profit margins
- Market volatility risk

### 3. Value-Based Pricing

**Best for:** Premium products with unique features
**Formula:** `Value Price = Base Cost × Perceived Value × Customer Willingness`

```javascript
let valuePrice = baseCost * perceivedValue;
if (customerWillingness > 0.8) valuePrice *= 1.3;
if (customerWillingness < 0.4) valuePrice *= 0.7;
```

**Advantages:**
- Higher profit potential
- Customer-focused
- Differentiation

**Disadvantages:**
- Difficult to quantify
- Requires customer research
- Subjective

### 4. Dynamic Pricing

**Best for:** High-demand products with variable demand
**Formula:** `Dynamic Price = Base Price × Time Factor × Day Factor × Season Factor × Inventory Factor × Demand Factor`

```javascript
let dynamicPrice = baseCost * 2.2; // Base markup

// Time-based adjustments
if (timeOfDay >= 9 && timeOfDay <= 17) {
  dynamicPrice *= 1.1; // Peak hours
}

// Day-based adjustments
if (dayOfWeek === 0 || dayOfWeek === 6) {
  dynamicPrice *= 1.15; // Weekend pricing
}

// Seasonal adjustments
if (season === 'holiday') {
  dynamicPrice *= 1.25;
}

// Inventory-based adjustments
if (inventoryLevel < 10) {
  dynamicPrice *= 1.2; // Low inventory premium
} else if (inventoryLevel > 100) {
  dynamicPrice *= 0.95; // High inventory discount
}
```

**Advantages:**
- Revenue optimization
- Inventory management
- Market responsiveness

**Disadvantages:**
- Complex implementation
- Customer confusion
- Requires real-time data

### 5. Competitive Pricing

**Best for:** Products in price-sensitive markets
**Formula:** `Competitive Price = Average Competitor Price × Positioning Factor`

```javascript
const avgCompetitorPrice = competitorPrices.reduce((sum, price) => sum + price, 0) / competitorPrices.length;
const minCompetitorPrice = Math.min(...competitorPrices);

switch (positioning) {
  case 'premium':
    return avgCompetitorPrice * 1.15; // 15% above average
  case 'economy':
    return minCompetitorPrice * 0.95; // 5% below minimum
  case 'competitive':
  default:
    return avgCompetitorPrice * 0.98; // 2% below average
}
```

**Advantages:**
- Market positioning
- Customer price sensitivity
- Competitive advantage

**Disadvantages:**
- Price wars risk
- Reduced profit margins
- Dependency on competitors

## 🔧 Configuration

### Environment Variables

```bash
# Pricing Engine Configuration
PRICING_DEFAULT_STRATEGY=costPlus
PRICING_MIN_PROFIT_MARGIN=10
PRICING_MAX_MARKUP=500
PRICING_TAX_RATE=0.08
PRICING_CURRENCY=USD
```

### Pricing Rules Configuration

```json
{
  "rule_name": "Low Inventory Premium",
  "rule_type": "inventory",
  "rule_conditions": {
    "inventory_level": {
      "operator": "<",
      "value": 10
    }
  },
  "rule_actions": {
    "action": "multiply_price",
    "factor": 1.2
  },
  "priority": 1,
  "is_active": true
}
```

## 📊 Monitoring and Analytics

### Key Metrics

- **Profit Margins**: Track profit margins across products and strategies
- **Price Changes**: Monitor frequency and magnitude of price changes
- **Strategy Performance**: Compare effectiveness of different pricing strategies
- **Market Response**: Analyze customer behavior to price changes
- **Competitive Position**: Track positioning relative to competitors

### Dashboard Integration

The pricing engine integrates with the existing dashboard to provide:

- Real-time pricing insights
- Strategy performance metrics
- Price change recommendations
- Market trend analysis
- Profit optimization suggestions

## 🚀 Advanced Features

### 1. Machine Learning Integration

Future enhancements will include:
- Predictive demand forecasting
- Customer price sensitivity modeling
- Automated strategy selection
- Price elasticity analysis
- Revenue optimization algorithms

### 2. External Data Sources

Integration with:
- Economic indicators (inflation, GDP)
- Market sentiment analysis
- Competitor price monitoring
- Weather data for seasonal adjustments
- Social media sentiment analysis

### 3. A/B Testing

- Test different pricing strategies
- Measure customer response
- Optimize conversion rates
- Validate pricing hypotheses

## 🔒 Security and Compliance

### Authentication
- JWT-based authentication required for all pricing endpoints
- Role-based access control for pricing operations
- Audit trail for all price changes

### Data Privacy
- Customer data anonymization
- GDPR compliance for EU customers
- Secure storage of pricing algorithms

### Rate Limiting
- API rate limiting to prevent abuse
- Request throttling for bulk operations
- Monitoring for unusual pricing patterns

## 🧪 Testing

### Unit Tests

```bash
# Test individual pricing strategies
npm test -- --grep "pricing"

# Test pricing engine service
npm test -- --grep "PricingEngine"
```

### Integration Tests

```bash
# Test API endpoints
npm run test:integration -- --grep "pricing"

# Test database operations
npm run test:integration -- --grep "pricing-schema"
```

### Performance Tests

```bash
# Load testing
npm run test:load -- --grep "pricing"

# Stress testing
npm run test:stress -- --grep "pricing"
```

## 📈 Performance Optimization

### Database Optimization

- Indexed queries for fast pricing calculations
- Connection pooling for concurrent requests
- Query optimization for complex pricing rules
- Caching for frequently accessed data

### Caching Strategy

- Redis caching for pricing calculations
- In-memory caching for market data
- CDN caching for static pricing data
- Browser caching for client-side calculations

### Scalability

- Horizontal scaling with load balancers
- Microservices architecture for pricing components
- Queue-based processing for bulk operations
- Auto-scaling based on demand

## 🚨 Troubleshooting

### Common Issues

1. **Pricing Calculation Errors**
   - Check database connectivity
   - Verify product data integrity
   - Review pricing rule configurations

2. **Performance Issues**
   - Monitor database query performance
   - Check caching effectiveness
   - Review pricing rule complexity

3. **Incorrect Prices**
   - Verify cost data accuracy
   - Check market data freshness
   - Review business rule constraints

### Debug Mode

Enable debug logging:

```bash
DEBUG=pricing-engine:* npm start
```

### Health Checks

```bash
# Check pricing engine health
curl http://localhost:5000/api/pricing/health

# Check database connectivity
curl http://localhost:5000/api/health
```

## 🔮 Future Roadmap

### Phase 1 (Current)
- ✅ Core pricing strategies
- ✅ Basic market adjustments
- ✅ Business rule engine
- ✅ API endpoints

### Phase 2 (Next)
- 🔄 Machine learning integration
- 🔄 Advanced market analysis
- 🔄 Predictive pricing
- 🔄 A/B testing framework

### Phase 3 (Future)
- 📋 AI-powered strategy selection
- 📋 Real-time market data feeds
- 📋 Advanced customer segmentation
- 📋 Revenue optimization algorithms

## 📚 Additional Resources

- [API Reference](./API_REFERENCE.md#pricing)
- [Database Schema](./DATABASE_SCHEMA.md#pricing)
- [Integration Guide](./INTEGRATION_GUIDE.md#pricing)
- [Best Practices](./BEST_PRACTICES.md#pricing)

## 🤝 Contributing

To contribute to the pricing engine:

1. Fork the repository
2. Create a feature branch
3. Implement your changes
4. Add tests and documentation
5. Submit a pull request

## 📄 License

This pricing engine is part of the Smart Retail Platform and is licensed under the MIT License.

---

**🎯 Ready to optimize your pricing strategy? Start with the [Quick Start Guide](#getting-started) and transform your business with intelligent pricing!**
