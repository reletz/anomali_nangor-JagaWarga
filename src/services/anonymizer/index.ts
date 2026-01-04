import { Elysia } from 'elysia';
import { sql, testConnection } from '../shared/db';
import { getNatsConnection, publishEvent, closeNatsConnection } from '../shared/nats';
import { scrubPII } from './pii-scrubber';
import client from 'prom-client';

const PORT = process.env.ANONYMIZER_PORT || process.env.PORT || 3002;

const nc = await getNatsConnection();

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

const piiDetected = new client.Counter({
  name: 'anonymizer_pii_detected_total',
  help: 'Total PII instances detected and scrubbed',
  labelNames: ['type'],
});

register.registerMetric(httpRequests);
register.registerMetric(httpDuration);
register.registerMetric(piiDetected);

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
      const natsOk = nc && !nc.isClosed();

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
      const payload = body as any;

      if (!payload) {
        set.status = 400;
        httpRequests.inc({ method: 'POST', route: '/scrub', status: '400' });
        end();
        return { success: false, error: 'Request body is required' };
      }

      const requiredFields = ['category', 'content', 'authority_department'];
      const missingFields = requiredFields.filter(field => !payload[field]);
      
      if (missingFields.length > 0) {
        set.status = 400;
        httpRequests.inc({ method: 'POST', route: '/scrub', status: '400' });
        end();
        return { 
          success: false,
          error: `Missing required fields: ${missingFields.join(', ')}` 
        };
      }

      const scrubResult = scrubPII(payload.content);

      if (scrubResult.detectedPII.length > 0) {
        scrubResult.detectedPII.forEach(pii => {
          const type = pii.split(':')[0];
          piiDetected.inc({ type });
        });
      }

      const reportPayload = {
        report: {
          category: payload.category,
          content: scrubResult.scrubbed,
          authority_department: payload.authority_department,
          privacy_level: payload.privacy_level || 'anonymous',
          status: 'submitted'
        }
      };

      const response  = await withRetry(async () => {
        const res = await fetch('http://report-service:4000/api/reports', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Accept-Encoding': 'identity',
            'X-Forwarded-By': 'anonymizer-service'
          },
          body: JSON.stringify(reportPayload)
        });

        if (!res.ok) {
          const error = await res.text();
          throw new Error(`Report service returned ${res.status}: ${error}`);
        }

        return res;
      });

      const report = await response.json();
      const reportId = report.data?.id || report.id;

      await withRetry(async () => {
        await publishEvent('report.created', {
          report_id: reportId,
          category: reportPayload.report.category,
          department: reportPayload.report.authority_department,
          privacy_level: reportPayload.report.privacy_level,
          pii_scrubbed: scrubResult.detectedPII.length > 0,
          timestamp: new Date().toISOString()
        });
      });

      httpRequests.inc({ method: 'POST', route: '/scrub', status: '200' });
      end();

      return { 
        success: true, 
        report_id: reportId,
        pii_scrubbed: scrubResult.detectedPII.length,
        confidence: scrubResult.confidence
      };

    } catch (error) {
      console.error('Scrubbing error:', error);
      set.status = 500;
      httpRequests.inc({ method: 'POST', route: '/scrub', status: '500' });
      end();
      return { 
        success: false,
        error: 'Failed to process report',
        details: error instanceof Error ? error.message : String(error)
      };
    }
  })
  .listen({
    port: Number(PORT),
    hostname: '0.0.0.0'
  });

console.log(`Anonymizer Service running at http://${app.server?.hostname}:${app.server?.port}`);

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
