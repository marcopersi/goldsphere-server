/**
 * Market Data Scheduler
 * Handles automatic price updates from external APIs
 * Uses Dependency Injection for testability
 */

import { CronJob } from 'cron';
import type { IMarketDataService } from './IMarketDataService';

export class MarketDataScheduler {
  private updateJob?: CronJob;
  private cacheCleanupJob?: CronJob;

  constructor(private readonly marketDataService: IMarketDataService) {}

  /**
   * Initialize scheduled jobs
   */
  initialize(): void {
    // Update prices every 5 minutes during market hours (weekdays 9am-5pm UTC)
    this.updateJob = new CronJob(
      '*/5 9-17 * * 1-5', // Every 5 minutes, 9am-5pm, Monday-Friday
      async () => {
        console.log('[MarketDataScheduler] Running scheduled price update...');
        try {
          const result = await this.marketDataService.updatePricesFromApi();
          if (result.success) {
            console.log(
              `[MarketDataScheduler] Price update successful - Provider: ${result.provider}, Metals: ${result.updatedMetals.join(', ')}`
            );
          } else {
            console.error(
              `[MarketDataScheduler] Price update failed - Errors: ${result.errors.join(', ')}`
            );
          }
        } catch (error) {
          console.error('[MarketDataScheduler] Price update error:', error);
        }
      },
      null, // onComplete
      false, // start immediately
      'UTC' // timezone
    );

    // Clean up expired cache every hour
    this.cacheCleanupJob = new CronJob(
      '0 * * * *', // Every hour at minute 0
      async () => {
        console.log('[MarketDataScheduler] Running cache cleanup...');
        try {
          await this.marketDataService.cleanupCache();
          console.log('[MarketDataScheduler] Cache cleanup completed');
        } catch (error) {
          console.error('[MarketDataScheduler] Cache cleanup error:', error);
        }
      },
      null,
      false,
      'UTC'
    );

    console.log('[MarketDataScheduler] Scheduler initialized (not started)');
  }

  /**
   * Start all scheduled jobs
   */
  start(): void {
    if (this.updateJob) {
      this.updateJob.start();
      console.log('[MarketDataScheduler] Price update job started');
    }

    if (this.cacheCleanupJob) {
      this.cacheCleanupJob.start();
      console.log('[MarketDataScheduler] Cache cleanup job started');
    }
  }

  /**
   * Stop all scheduled jobs
   */
  stop(): void {
    if (this.updateJob) {
      this.updateJob.stop();
      console.log('[MarketDataScheduler] Price update job stopped');
    }

    if (this.cacheCleanupJob) {
      this.cacheCleanupJob.stop();
      console.log('[MarketDataScheduler] Cache cleanup job stopped');
    }
  }

  /**
   * Run price update immediately
   */
  async runUpdateNow(): Promise<void> {
    console.log('[MarketDataScheduler] Running manual price update...');
    try {
      const result = await this.marketDataService.updatePricesFromApi();
      if (result.success) {
        console.log(
          `[MarketDataScheduler] Manual update successful - Provider: ${result.provider}, Metals: ${result.updatedMetals.join(', ')}`
        );
      } else {
        console.error(
          `[MarketDataScheduler] Manual update failed - Errors: ${result.errors.join(', ')}`
        );
      }
    } catch (error) {
      console.error('[MarketDataScheduler] Manual update error:', error);
      throw error;
    }
  }
}
