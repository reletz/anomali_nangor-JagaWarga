import { connect, NatsConnection, StringCodec } from 'nats';

let nc: NatsConnection | null = null;
const sc = StringCodec();

export async function getNatsConnection(): Promise<NatsConnection> {
  if (nc && !nc.isClosed()) {
    return nc;
  }

  try {
    nc = await connect({
      servers: process.env.NATS_URL || 'nats://localhost:4222',
      reconnect: true,
      maxReconnectAttempts: 10,
      reconnectTimeWait: 1000,
    });

    console.log('✅ NATS connected:', nc.getServer());

    // Handle connection events
    (async () => {
      for await (const s of nc!.status()) {
        console.log(`NATS status: ${s.type}: ${JSON.stringify(s.data)}`);
      }
    })().catch((err) => {
      console.error('NATS status error:', err);
    });

    return nc;
  } catch (error) {
    console.error('❌ NATS connection failed:', error);
    throw error;
  }
}

export async function publishEvent(subject: string, data: any) {
  try {
    const connection = await getNatsConnection();
    connection.publish(subject, sc.encode(JSON.stringify(data)));
    console.log(`📤 Published to ${subject}:`, data);
  } catch (error) {
    console.error(`Failed to publish to ${subject}:`, error);
    throw error;
  }
}

export async function closeNatsConnection() {
  if (nc && !nc.isClosed()) {
    await nc.drain();
    console.log('NATS connection closed');
  }
}