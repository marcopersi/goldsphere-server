# Market Data System

Comprehensive market data integration for precious metals (Gold, Silver, Platinum, Palladium) with support for multiple API providers, caching, and automatic price updates.

## Features

- Real-time spot prices from external APIs
- Historical price data with time-series analysis
- Multiple provider support with automatic fallback
- Intelligent caching layer (5-minute TTL)
- Scheduled price updates (every 5 minutes during market hours)
- RESTful API endpoints
- Currency support (USD, EUR, GBP, CHF, etc.)
- Multiple Price Types (SPOT, REALTIME, BID, ASK)

## Architecture

### Database Schema

```
market_data_provider  → Configuration for API providers (GoldAPI, SIX Swiss Exchange)
market_price          → Current spot prices for each metal
price_history         → Historical price data for charts/analysis
market_data_cache     → Cache layer for API responses
price_type            → Price type definitions (SPOT, REALTIME, BID, ASK)
```

### Components

- **MarketDataService**: Core service handling API calls, caching, database operations
- **MarketDataScheduler**: Cron-based scheduler for automatic updates
- **GoldApiProvider**: GoldAPI provider for spot prices and historical data
- **SIXSwissExchangeProvider**: SIX Swiss Exchange provider for European market data
- **API Routes**: RESTful endpoints at `/api/market-data/*`

## Setup

### 1. Environment Variables

Add the following to your `.env` file:

```bash
# Market Data Providers (at least one required)
GOLD_API_KEY=your_gold_api_key_here

# Enable automatic price updates (optional)
ENABLE_MARKET_DATA_SCHEDULER=true
```

**Getting API Keys:**

- **GoldAPI**: https://www.goldapi.io/ (Free tier: 50 requests/month)

### 2. Database Migration

The market data schema is automatically applied when initializing the database:

```bash
# Reset database and apply all schemas (including market data)
npm run db:reset
```

Or manually run the migrations:

```bash
# Base market data schema
docker exec -i postgres-goldsphere-db psql -U goldsphere -d goldsphere < initdb/05-market-data.sql

# Price types extension
docker exec -i postgres-goldsphere-db psql -U goldsphere -d goldsphere < initdb/07-market-data-price-types.sql
```

### 3. Initial Price Update

After setup, trigger an initial price update:

```bash
curl -X POST http://localhost:8080/api/market-data/update
```

Or use the automatic scheduler by setting `ENABLE_MARKET_DATA_SCHEDULER=true`.

## API Endpoints

### Get Current Price

```http
GET /api/market-data/price/:metalSymbol?currency=USD
```

**Example:**
```bash
curl http://localhost:8080/api/market-data/price/AU
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "metal_symbol": "AU",
    "metal_name": "Gold",
    "price_per_troy_oz": 2050.75,
    "currency": "USD",
    "bid": 2050.00,
    "ask": 2051.50,
    "high_24h": 2055.00,
    "low_24h": 2045.00,
    "change_24h": 5.25,
    "change_percent_24h": 0.26,
    "timestamp": "2025-12-01T10:30:00Z",
    "provider_name": "Metals-API"
  }
}
```

### Get Multiple Prices

```http
GET /api/market-data/prices?symbols=AU,AG,PT&currency=USD
```

**Example:**
```bash
curl "http://localhost:8080/api/market-data/prices?symbols=AU,AG"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "AU": { "price_per_troy_oz": 2050.75, ... },
    "AG": { "price_per_troy_oz": 25.30, ... }
  }
}
```

### Get Historical Prices

```http
GET /api/market-data/history/:metalSymbol?startDate=2025-01-01&endDate=2025-01-31&limit=100
```

**Parameters:**
- `startDate` (optional): ISO 8601 date string
- `endDate` (optional): ISO 8601 date string  
- `currency` (optional): Default USD
- `limit` (optional): Max 1000, default 100

**Example:**
```bash
curl "http://localhost:8080/api/market-data/history/AU?startDate=2025-11-01&limit=30"
```

**Response:**
```json
{
  "success": true,
  "count": 30,
  "data": [
    {
      "id": "uuid",
      "metal_symbol": "AU",
      "price_per_troy_oz": 2050.75,
      "currency": "USD",
      "timestamp": "2025-11-30T15:00:00Z"
    },
    ...
  ]
}
```

### Trigger Manual Update (Admin)

```http
POST /api/market-data/update
```

**Example:**
```bash
curl -X POST http://localhost:8080/api/market-data/update
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "provider": "Metals-API",
    "updatedMetals": ["XAU", "XAG", "XPT", "XPD"],
    "errors": [],
    "timestamp": "2025-12-01T10:35:00Z"
  }
}
```

### Get Provider Status

```http
GET /api/market-data/providers
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Metals-API",
      "is_active": true,
      "priority": 1,
      "last_success": "2025-12-01T10:30:00Z",
      "last_failure": null,
      "failure_count": 0
    },
    ...
  ]
}
```

### Clear Cache (Admin)

```http
DELETE /api/market-data/cache
```

---

## Metal Symbols

**Note:** The system uses chemical element symbols (not ISO 4217 currency codes).

| Symbol | Metal     | Chemical Symbol | ISO 4217 |
|--------|-----------|-----------------|----------|
| AU     | Gold      | Au              | XAU      |
| AG     | Silver    | Ag              | XAG      |
| PT     | Platinum  | Pt              | XPT      |
| PD     | Palladium | Pd              | XPD      |

## Automatic Updates

When `ENABLE_MARKET_DATA_SCHEDULER=true`, the system automatically:

1. **Price Updates**: Every 5 minutes during market hours (weekdays 9am-5pm UTC)
2. **Cache Cleanup**: Every hour to remove expired cache entries

**Cron Schedule:**
```
Price Updates:    */5 9-17 * * 1-5  (Every 5 min, 9am-5pm, Mon-Fri)
Cache Cleanup:    0 * * * *         (Every hour)
```

**Manual Control:**
```typescript
import { marketDataScheduler } from './services/marketDataScheduler';

// Start scheduler
marketDataScheduler.initialize();
marketDataScheduler.start();

// Stop scheduler
marketDataScheduler.stop();

// Run update now
await marketDataScheduler.runUpdateNow();
```

## Caching Strategy

- **Cache Duration**: 5 minutes per price
- **Cache Key Format**: `price:{METAL_SYMBOL}:{CURRENCY}`
- **Cache Storage**: PostgreSQL `market_data_cache` table
- **Automatic Cleanup**: Hourly via scheduled job

## Provider Fallback

The system tries providers in priority order:

1. **SIX Swiss Exchange** (Priority 1)
2. **GoldAPI** (Priority 2)

If the primary provider fails:
- Automatically tries next provider
- Tracks failure count
- Updates `last_failure` timestamp
- Logs errors for monitoring

## Error Handling

All endpoints return consistent error format:

```json
{
  "success": false,
  "error": "Human-readable error message",
  "details": "Technical error details"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (invalid parameters)
- `404` - Not Found (metal not found)
- `500` - Internal Server Error

## Testing

### Unit Tests

```bash
npm run test:unit -- tests/unit/marketDataService.test.ts
```

### Integration Tests

```bash
npm run test:integration -- tests/integration/marketData.integration.test.ts
```

### Manual Testing

```bash
# Get gold price
curl http://localhost:8080/api/market-data/price/AU

# Get multiple prices
curl "http://localhost:8080/api/market-data/prices?symbols=AU,AG"

# Get historical data
curl "http://localhost:8080/api/market-data/history/AU?limit=10"

# Trigger update
curl -X POST http://localhost:8080/api/market-data/update

# Check providers
curl http://localhost:8080/api/market-data/providers
```

## Database Maintenance

### Clean Old History

Automatically archives price history older than 2 years:

```sql
SELECT archive_old_price_history();
```

### Manual Cache Cleanup

```sql
SELECT cleanup_expired_cache();
```

### Check Data Status

```sql
-- Recent prices
SELECT m.symbol, mp.price_per_troy_oz, mp.timestamp
FROM market_price mp
JOIN metal m ON mp.metal_id = m.id
ORDER BY mp.timestamp DESC;

-- Provider health
SELECT name, is_active, last_success, failure_count
FROM market_data_provider
ORDER BY priority;

-- Cache entries
SELECT cache_key, expires_at
FROM market_data_cache
WHERE expires_at > NOW()
ORDER BY expires_at;
```

## Troubleshooting

### No prices returned

1. Check if API keys are configured:
   ```bash
   echo $GOLD_API_KEY
   ```

2. Trigger manual update:
   ```bash
   curl -X POST http://localhost:8080/api/market-data/update
   ```

3. Check provider status:
   ```bash
   curl http://localhost:8080/api/market-data/providers
   ```

### Prices not updating automatically

1. Verify scheduler is enabled:
   ```bash
   grep ENABLE_MARKET_DATA_SCHEDULER .env
   ```

2. Check server logs for scheduler start message:
   ```
   📊 Market Data Scheduler: Started
   ```

3. Verify database connection (scheduler requires DB)

### API rate limits exceeded

1. Check provider failure counts
2. Reduce update frequency in `marketDataScheduler.ts`
3. Add more providers for better distribution

## Performance Considerations

- **Caching**: Reduces API calls by 90%+ (5-minute cache)
- **Indexes**: Optimized for time-series queries
- **Batch Updates**: Single API call updates all metals
- **Connection Pooling**: Efficient database connections

## Security

- ✅ API keys stored in environment variables (never in code/DB)
- ✅ No sensitive data in logs
- ✅ Rate limiting on provider requests
- ✅ Input validation on all endpoints
- ⚠️ TODO: Add authentication for admin endpoints (`/update`, `/cache`)

## Future Enhancements

- [ ] Add authentication middleware for admin endpoints
- [ ] Support more providers (CoinMarketCap, Bloomberg)
- [ ] WebSocket support for real-time price streaming
- [ ] Price alerts and notifications
- [ ] Advanced charting data (OHLCV aggregations)
- [ ] Multi-currency conversion rates
- [ ] Provider health monitoring dashboard

## Related Documentation

- [Backend Architecture](./BACKEND.md)
- [Database Schema](./DATABASE.md)
- [API Reference](./API.md)

## Support

For issues or questions:
- Check server logs: `docker logs goldsphere-backend`
- Verify environment variables
- Test API endpoints manually
- Review provider status
