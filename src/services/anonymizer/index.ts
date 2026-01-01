import { Elysia } from 'elysia';
import { sql, testConnection } from '../shared/db';
import { getNatsConnection } from '../shared/nats';
import { scrubPII } from './pii-scrubber';

const PORT = process.env.ANONYMIZER_PORT || process.env.PORT || 3002;

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

      console.log(`🧹 PII scrubbing: ${result.detectedPII.length} items detected`);

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
  .listen(PORT);

console.log(`🧹 Anonymizer Service running at http://${app.server?.hostname}:${app.server?.port}`);

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  app.stop();
  await sql.end();
  process.exit(0);
});
