import Redis from "ioredis";

const REDIS_HOST = process.env.REDIS_HOST ?? "use-gyroscopic-lithe-89201.db.redis.io";
const REDIS_PORT = parseInt(process.env.REDIS_PORT ?? "17329", 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined; // treat empty string as no password

declare global {
  // eslint-disable-next-line no-var
  var _redis: Redis | undefined;
}

function createRedisClient(): Redis {
  const client = new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT,
    ...(REDIS_PASSWORD ? { password: REDIS_PASSWORD } : {}),
    maxRetriesPerRequest: 1,
    connectTimeout: 5000,
    commandTimeout: 3000,
    retryStrategy: (times) => (times > 2 ? null : 500),
  });

  client.on("error", (err) => {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[Redis] connection error:", err.message);
    }
  });

  return client;
}

export function getRedis(): Redis {
  if (!global._redis) {
    global._redis = createRedisClient();
  }
  return global._redis;
}
