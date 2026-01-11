/**
 * Market Data API Routes
 * RESTful endpoints for precious metal market data
 */

import express, { Request, Response, Router } from 'express';
import { getPool } from '../dbConfig';
import { MarketDataServiceFactory, MarketDataQuery } from '../services/market-data';

// Create service instance with dependency injection
// Lazy service creation - gets current pool for testing
function getMarketDataService() {
  return MarketDataServiceFactory.create(getPool());
}

const router: Router = express.Router();

/**
 * GET /api/market-data/price/:metalSymbol
 * Get current market price for a specific metal
 * 
 * @param metalSymbol - Metal symbol (e.g., XAU for gold, XAG for silver)
 * @query currency - Currency code (default: USD)
 */
router.get('/price/:metalSymbol', async (req: Request, res: Response) => {
  try {
    const { metalSymbol } = req.params;
    const currency = (req.query.currency as string) || 'USD';

    if (!metalSymbol || metalSymbol.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Metal symbol is required'
      });
    }

    const price = await getMarketDataService().getCurrentPrice(
      metalSymbol.toUpperCase(),
      currency.toUpperCase()
    );

    if (!price) {
      return res.status(404).json({
        success: false,
        error: `No market data found for ${metalSymbol}`
      });
    }

    res.json({
      success: true,
      data: price
    });
  } catch (error) {
    console.error('Error fetching market price:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch market price',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/market-data/prices
 * Get current prices for multiple metals
 * 
 * @query symbols - Comma-separated metal symbols (e.g., XAU,XAG,XPT)
 * @query currency - Currency code (default: USD)
 */
router.get('/prices', async (req: Request, res: Response) => {
  try {
    const symbols = (req.query.symbols as string) || '';
    const currency = (req.query.currency as string) || 'USD';

    if (!symbols || symbols.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'At least one metal symbol is required'
      });
    }

    const metalSymbols = symbols.split(',').map(s => s.trim().toUpperCase());
    const prices = await Promise.all(
      metalSymbols.map(symbol => 
        getMarketDataService().getCurrentPrice(symbol, currency.toUpperCase())
      )
    );

    const result = prices.reduce((acc, price, index) => {
      if (price) {
        acc[metalSymbols[index]] = price;
      }
      return acc;
    }, {} as Record<string, unknown>);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching market prices:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch market prices',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/market-data/history/:metalSymbol
 * Get historical price data for a metal
 * 
 * @param metalSymbol - Metal symbol
 * @query startDate - Start date (ISO 8601)
 * @query endDate - End date (ISO 8601)
 * @query currency - Currency code (default: USD)
 * @query limit - Maximum number of records (default: 100, max: 1000)
 */
router.get('/history/:metalSymbol', async (req: Request, res: Response) => {
  try {
    const { metalSymbol } = req.params;
    const { startDate, endDate, currency, limit } = req.query;

    if (!metalSymbol || metalSymbol.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Metal symbol is required'
      });
    }

    // Parse dates if provided
    let parsedStartDate: Date | undefined;
    let parsedEndDate: Date | undefined;

    if (startDate) {
      parsedStartDate = new Date(startDate as string);
      if (Number.isNaN(parsedStartDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Invalid startDate format'
        });
      }
    }

    if (endDate) {
      parsedEndDate = new Date(endDate as string);
      if (Number.isNaN(parsedEndDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Invalid endDate format'
        });
      }
    }

    const query: MarketDataQuery = {
      metalSymbol: metalSymbol.toUpperCase(),
      currency: (currency as string)?.toUpperCase() || 'USD',
      limit: Math.min(Number.parseInt(limit as string, 10) || 100, 1000),
      startDate: parsedStartDate,
      endDate: parsedEndDate
    };

    const history = await getMarketDataService().getHistoricalPrices(query);

    res.json({
      success: true,
      data: history,
      count: history.length
    });
  } catch (error) {
    console.error('Error fetching price history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch price history',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/market-data/update
 * Manually trigger price update from external APIs
 * Requires authentication (admin only)
 */
router.post('/update', async (req: Request, res: Response) => {
  try {
    // TODO: Add authentication middleware to restrict to admin users
    
    const result = await getMarketDataService().updatePricesFromApi();

    if (result.success) {
      res.json({
        success: true,
        data: result
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to update prices',
        details: result.errors
      });
    }
  } catch (error) {
    console.error('Error updating market prices:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update market prices',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/market-data/providers
 * Get status of all market data providers
 */
router.get('/providers', async (req: Request, res: Response) => {
  try {
    const providers = await getMarketDataService().getProviderStatus();

    res.json({
      success: true,
      data: providers
    });
  } catch (error) {
    console.error('Error fetching provider status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch provider status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/market-data/cache
 * Clear expired cache entries
 * Requires authentication (admin only)
 */
router.delete('/cache', async (req: Request, res: Response) => {
  try {
    // TODO: Add authentication middleware to restrict to admin users
    
    await getMarketDataService().cleanupCache();

    res.json({
      success: true,
      message: 'Cache cleanup completed'
    });
  } catch (error) {
    console.error('Error cleaning cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup cache',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
