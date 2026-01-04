import { Elysia } from 'elysia';
import { sql, testConnection } from '../shared/db';
import { getNatsConnection } from '../shared/nats';
import { scrubPII } from './pii-scrubber';
import client from 'prom-client';

const PORT = process.env.ANONYMIZER_PORT || process.env.PORT || 3002;

const register = new client.Registry();
register.setDefaultLabels({ service: 'anonymizer' });
client.collectDefaultMetrics({ register });

const httpRequests = new client.Counter({
  name: 'anonymizer_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
});

const httpDuration = new client.Histogram({
  name: 'anonymizer_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.05, 0.1, 0.3, 0.5, 1, 2, 5],
});

register.registerMetric(httpRequests);
register.registerMetric(httpDuration);

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
  .get('/health', async ({ set }) => {
    const end = httpDuration.startTimer({ method: 'GET', route: '/health' });
    try {
      const dbOk = await testConnection();
      const natsConnection = await getNatsConnection();
      const natsOk = !natsConnection.isClosed();

      httpRequests.inc({ method: 'GET', route: '/health', status: '200' });
      end();

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
      httpRequests.inc({ method: 'GET', route: '/health', status: '500' });
      set.status = 500;
      end();
      return {
        status: 'unhealthy',
        service: 'anonymizer',
        timestamp: new Date().toISOString(),
        error: String(error),
      };
    }
  })
  .get('/metrics', async () =>
    new Response(await register.metrics(), {
      status: 200,
      headers: { 'Content-Type': register.contentType },
    })
  )
  // PII Scrubbing endpoint
  .post('/scrub', async ({ body, set }) => {
    const end = httpDuration.startTimer({ method: 'POST', route: '/scrub' });
    try {
      const { text } = body as { text: string };

      if (!text) {
        set.status = 400;
        httpRequests.inc({ method: 'POST', route: '/scrub', status: '400' });
        end();
        return { error: 'Text is required' };
      }

      const result = scrubPII(text);
      console.log(`PII scrubbing: detected ${result.detectedPII.length} items`);

      httpRequests.inc({ method: 'POST', route: '/scrub', status: '200' });
      end();

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
      httpRequests.inc({ method: 'POST', route: '/scrub', status: '500' });
      end();
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
