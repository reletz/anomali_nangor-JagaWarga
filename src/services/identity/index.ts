import { Elysia } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { sql, testConnection } from '../shared/db';
import { getNatsConnection } from '../shared/nats';

const PORT = process.env.IDENTITY_PORT || process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-in-production';

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
  .use(
    jwt({
      name: 'jwt',
      secret: JWT_SECRET,
    })
  )
  // Health check endpoint
  .get('/health', async () => {
    try {
      const dbOk = await testConnection();
      const natsConnection = await getNatsConnection();
      const natsOk = !natsConnection.isClosed();

      return {
        status: dbOk && natsOk ? 'healthy' : 'degraded',
        service: 'identity',
        timestamp: new Date().toISOString(),
        checks: {
          database: dbOk ? 'ok' : 'failed',
          nats: natsOk ? 'ok' : 'failed',
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        service: 'identity',
        timestamp: new Date().toISOString(),
        error: String(error),
      };
    }
  })
  // Mock JWT validation endpoint for authorities
  .post('/validate', async ({ body, jwt, set }) => {
    try {
      const { token } = body as { token: string };

      if (!token) {
        set.status = 400;
        return { error: 'Token is required' };
      }

      // Verify JWT
      const payload = await jwt.verify(token);

      if (!payload) {
        set.status = 401;
        return { error: 'Invalid or expired token' };
      }

      // Check if user exists in database
      const user = await sql`
        SELECT id, email, department, name
        FROM authorities
        WHERE id = ${payload.sub}
      `;

      if (user.length === 0) {
        set.status = 401;
        return { error: 'User not found' };
      }

      return {
        valid: true,
        user: {
          id: user[0].id,
          email: user[0].email,
          role: user[0].role,
          department: user[0].department,
        },
      };
    } catch (error) {
      console.error('Validation error:', error);
      set.status = 500;
      return { error: 'Internal server error', details: String(error) };
    }
  })
  // Mock login endpoint for testing (generates JWT)
  .post('/login', async ({ body, jwt, set }) => {
    try {
      const { email, password } = body as { email: string; password: string };

      if (!email || !password) {
        set.status = 400;
        return { error: 'Email and password are required' };
      }

      // Check credentials with retry
      const user = await withRetry(async () =>
        await sql`
          SELECT id, email, department, name
          FROM authorities
          WHERE email = ${email}
        `
      );

      if (user.length === 0) {
        set.status = 401;
        console.warn(`Login failed: user not found for ${email}`);
        return { error: 'Invalid credentials' };
      }

      // In a real app, verify password hash
      if (password !== 'demo123') {
        set.status = 401;
        return { error: 'Invalid credentials' };
      }

      // Generate JWT
      const token = await jwt.sign({
        sub: user[0].id,
        email: user[0].email,
        name: user[0].name,
        department: user[0].department,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600 * 24, // 24 hours
      });

      console.log(`✅ Login successful for ${email}`);

      return {
        token,
        user: {
          id: user[0].id,
          email: user[0].email,
            name: user[0].name,
          department: user[0].department,
        },
      };
    } catch (error) {
      console.error('Login error:', error);
      set.status = 500;
      return { error: 'Internal server error', details: String(error) };
    }
  })
  .listen({
    port: Number(PORT),
    hostname: '0.0.0.0'
  });

console.log(`Identity Service running at http://${app.server?.hostname}:${app.server?.port}`);

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
