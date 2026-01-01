import { Elysia } from 'elysia';
import { sql, testConnection } from '../shared/db';
import { getNatsConnection, publishEvent } from '../shared/nats';
import { scrubPII, containsPII } from './pii-scrubber';

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
  // Submit anonymous report (with PII scrubbing and NATS publish)
  .post('/reports', async ({ body, set }) => {
    try {
      const { content, category, location } = body as {
        content: string;
        category: string;
        location?: string;
      };

      if (!content || !category) {
        set.status = 400;
        return { error: 'Content and category are required' };
      }

      // Scrub PII from all text fields
      const scrubbedContent = scrubPII(content);
      const scrubbedLocation = location ? scrubPII(location) : null;

      // Calculate total PII detected
      const totalPII = 
        scrubbedContent.detectedPII.length +
        (scrubbedLocation?.detectedPII.length || 0);

      // Insert into database - matching init.sql schema
      const result = await sql`
        INSERT INTO reports (
          privacy_level,
          category,
          content,
          location,
          status
        ) VALUES (
          'anonymous',
          ${category},
          ${scrubbedContent.scrubbed},
          ${scrubbedLocation?.scrubbed || null},
          'submitted'
        )
        RETURNING id, category, status, created_at
      `;

      const report = result[0];

      // Publish to NATS for async processing
      await publishEvent('report.created', {
        report_id: report.id,
        category: report.category,
        status: report.status,
        pii_scrubbed: totalPII > 0,
        timestamp: report.created_at,
      });

      console.log(`📝 Report created: ${report.id} (${totalPII} PII items scrubbed)`);

      return {
        success: true,
        report: {
          id: report.id,
          category: report.category,
          status: report.status,
          created_at: report.created_at,
        },
        scrubbing: {
          pii_detected: totalPII,
          items_scrubbed: [
            ...scrubbedContent.detectedPII,
            ...(scrubbedLocation?.detectedPII || []),
          ],
        },
      };
    } catch (error) {
      console.error('Report submission error:', error);
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
