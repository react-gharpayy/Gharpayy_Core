/**
 * Growth Engine Production Logger
 * Provides structured logging for monitoring and auditing.
 */

export const GrowthLogger = {
  info: (event: string, details: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Growth:INFO] ${event}`, details);
    }
    // In production, this could hook into a DB collection or external logging service
  },

  warn: (event: string, details: any) => {
    console.warn(`[Growth:WARN] ${event}`, details);
    // Potential to log to a 'gp_growth_logs' collection for admin visibility
  },

  error: (event: string, error: any, details?: any) => {
    console.error(`[Growth:ERROR] ${event}`, error, details);
  },

  suspicious: (userId: string, action: string, details: any) => {
    console.warn(`[Growth:SUSPICIOUS] User: ${userId} | Action: ${action}`, details);
    // This should ideally be logged to a DB for admin review
  }
};
