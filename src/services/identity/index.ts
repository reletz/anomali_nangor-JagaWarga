import { Elysia } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { sql, testConnection } from '../shared/db';
import { getNatsConnection } from '../shared/nats';
import client from 'prom-client';

const PORT = process.env.IDENTITY_PORT || process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-in-production';

const register = new client.Registry();
register.setDefaultLabels({ service: 'identity' });
client.collectDefaultMetrics({ register });

const httpRequests = new client.Counter({
  name: 'identity_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
});

const httpDuration = new client.Histogram({
  name: 'identity_http_request_duration_seconds',
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
  .use(
    jwt({
      name: 'jwt',
      secret: JWT_SECRET,
    })
  )
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
        service: 'identity',
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
        service: 'identity',
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
  // Mock JWT validation endpoint for authorities
  .post('/validate', async ({ body, jwt, set }) => {
    const end = httpDuration.startTimer({ method: 'POST', route: '/validate' });
    try {
      const { token } = body as { token: string };

      if (!token) {
        set.status = 400;
        httpRequests.inc({ method: 'POST', route: '/validate', status: '400' });
        end();
        return { error: 'Token is required' };
      }

      // Verify JWT
      const payload = await jwt.verify(token);

      if (!payload) {
        set.status = 401;
        return { error: 'Invalid or expired token' };
      }

      let userRow: any[] = [];
      if (payload.role === 'authority') {
        userRow = await sql`
          SELECT id, email, name, department
          FROM authorities
          WHERE id = ${payload.sub}
        `;
      } else {
        userRow = await sql`
          SELECT id, nik, name
          FROM users
          WHERE id = ${payload.sub}
        `;
      }

      if (userRow.length === 0) {
        set.status = 401;
        httpRequests.inc({ method: 'POST', route: '/validate', status: '401' });
        end();
        return { error: 'User not found' };
      }

      httpRequests.inc({ method: 'POST', route: '/validate', status: '200' });
      end();
      return {
        valid: true,
        user: {
          role: payload.role || 'citizen',
          id: userRow[0].id,
          nik: userRow[0].nik,
          name: userRow[0].name,
          email: userRow[0].email,
          department: userRow[0].department,
        },
      };
    } catch (error) {
      console.error('Validation error:', error);
      set.status = 500;
      httpRequests.inc({ method: 'POST', route: '/validate', status: '500' });
      end();
      return { error: 'Internal server error', details: String(error) };
    }
  })
  // Register endpoint: creates a user (nik + name). Email/password ignored; password hardcoded on login.
  .post('/register', async ({ body, set }) => {
    const end = httpDuration.startTimer({ method: 'POST', route: '/register' });
    try {
      const { name, nik } = body as { name: string; nik: string };

      if (!name || !nik) {
        set.status = 400;
        httpRequests.inc({ method: 'POST', route: '/register', status: '400' });
        end();
        return { error: 'name and nik are required' };
      }

      const user = await withRetry(async () => {
        const inserted = await sql`
          INSERT INTO users (nik, name)
          VALUES (${nik}, ${name})
          ON CONFLICT (nik) DO UPDATE SET name = EXCLUDED.name
          RETURNING id, nik, name
        `;
        return inserted[0];
      });

      httpRequests.inc({ method: 'POST', route: '/register', status: '200' });
      end();
      return { success: true, user };
    } catch (error) {
      console.error('Register error:', error);
      set.status = 500;
      httpRequests.inc({ method: 'POST', route: '/register', status: '500' });
      end();
      return { error: 'Internal server error', details: String(error) };
    }
  })
  // Login via NIK + hardcoded password
  .post('/login', async ({ body, jwt, set }) => {
    const end = httpDuration.startTimer({ method: 'POST', route: '/login' });
    try {
      const { nik, password } = body as { nik: string; password: string };

      if (!nik || !password) {
        set.status = 400;
        httpRequests.inc({ method: 'POST', route: '/login', status: '400' });
        end();
        return { error: 'NIK and password are required' };
      }

      // Check credentials with retry
      const user = await withRetry(async () =>
        await sql`
          SELECT id, nik, name
          FROM users
          WHERE nik = ${nik}
        `
      );

      if (user.length === 0) {
        set.status = 401;
        console.warn(`Login failed: user not found for NIK ${nik}`);
        httpRequests.inc({ method: 'POST', route: '/login', status: '401' });
        end();
        return { error: 'Invalid credentials' };
      }

      // Hardcoded password check
      if (password !== 'password123') {
        set.status = 401;
        httpRequests.inc({ method: 'POST', route: '/login', status: '401' });
        end();
        return { error: 'Invalid credentials' };
      }

      // Generate JWT
      const token = await jwt.sign({
        sub: user[0].id,
        nik: user[0].nik,
        name: user[0].name,
        role: 'citizen',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600 * 24, // 24 hours
      });

      console.log(`✅ Login successful for NIK ${nik}`);
      httpRequests.inc({ method: 'POST', route: '/login', status: '200' });
      end();

      return {
        token,
        user: {
          id: user[0].id,
          nik: user[0].nik,
          name: user[0].name,
        },
      };
    } catch (error) {
      console.error('Login error:', error);
      set.status = 500;
      httpRequests.inc({ method: 'POST', route: '/login', status: '500' });
      end();
      return { error: 'Internal server error', details: String(error) };
    }
  })
  // Authority login via email + hardcoded password
  .post('/login/authority', async ({ body, jwt, set }) => {
    const end = httpDuration.startTimer({ method: 'POST', route: '/login/authority' });
    try {
      const { email, password } = body as { email: string; password: string };

      if (!email || !password) {
        set.status = 400;
        httpRequests.inc({ method: 'POST', route: '/login/authority', status: '400' });
        end();
        return { error: 'Email and password are required' };
      }

      const user = await withRetry(async () =>
        await sql`
          SELECT id, email, name, department
          FROM authorities
          WHERE email = ${email}
        `
      );

      if (user.length === 0) {
        set.status = 401;
        httpRequests.inc({ method: 'POST', route: '/login/authority', status: '401' });
        end();
        return { error: 'Invalid credentials' };
      }

      if (password !== 'password123') {
        set.status = 401;
        httpRequests.inc({ method: 'POST', route: '/login/authority', status: '401' });
        end();
        return { error: 'Invalid credentials' };
      }

      const token = await jwt.sign({
        sub: user[0].id,
        email: user[0].email,
        name: user[0].name,
        department: user[0].department,
        role: 'authority',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600 * 24, // 24 hours
      });

      console.log(`✅ Authority login successful for ${email}`);
      httpRequests.inc({ method: 'POST', route: '/login/authority', status: '200' });
      end();

      return {
        token,
        user: {
          id: user[0].id,
          email: user[0].email,
          name: user[0].name,
          department: user[0].department,
          role: 'authority',
        },
      };
    } catch (error) {
      console.error('Authority login error:', error);
      set.status = 500;
      httpRequests.inc({ method: 'POST', route: '/login/authority', status: '500' });
      end();
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
