import { Elysia } from 'elysia';
import { sql, testConnection } from '../shared/db';
import { getNatsConnection } from '../shared/nats';
import { scrubPII } from './pii-scrubber';

const PORT = process.env.ANONYMIZER_PORT || process.env.PORT || 3002;

// Retry helper for resilience
async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      console.warn(`Attempt ${i + 1} failed, retrying in ${delay}ms...`, error);
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
  throw new Error('Max retries exceeded');
}

const app = new Elysia()
  // Health check endpoint
  .get('/health', async () => {
    try {
      const dbOk = await testConnection();
      const natsConnection = await getNatsConnection();
      const natsOk = !natsConnection.isClosed();

      return {
        status: dbOk && natsOk ? 'healthy' : 'degraded',
        service: 'anonymizer',
        timestamp: new Date().toISOString(),
        checks: {
          database: dbOk ? 'ok' : 'failed',
          nats: natsOk ? 'ok' : 'failed',
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        service: 'anonymizer',
        timestamp: new Date().toISOString(),
        error: String(error),
      };
    }
  })
  // PII Scrubbing endpoint
  .post('/scrub', async ({ body, set }) => {
    try {
      const { text } = body as { text: string };

      if (!text) {
        set.status = 400;
        return { error: 'Text is required' };
      }

      const result = scrubPII(text);
      console.log(`PII scrubbing: detected ${result.detectedPII.length} items`);

      return {
        original_length: text.length,
        scrubbed_text: result.scrubbed,
        scrubbed_length: result.scrubbed.length,
        pii_detected: result.detectedPII.length,
        confidence: result.confidence,
        items: result.detectedPII,
      };
    } catch (error) {
      console.error('Scrubbing error:', error);
      set.status = 500;
      return { error: 'Internal server error', details: String(error) };
    }
  })
  .listen({
    port: Number(PORT),
    hostname: '0.0.0.0'
  });

console.log(`🧹 Anonymizer Service running at http://${app.server?.hostname}:${app.server?.port}`);

// Graceful shutdown
let isShuttingDown = false;
process.on('SIGTERM', async () => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  console.log('\n SIGTERM received, shutting down gracefully...');
  try {
    app.stop();
    await sql.end();
    console.log('Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  console.log('\n SIGINT received, shutting down gracefully...');
  try {
    app.stop();
    await sql.end();
    console.log('Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});
