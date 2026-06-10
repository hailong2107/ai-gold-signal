import Redis from "ioredis";

const REDIS_HOST = process.env.REDIS_HOST ?? "use-gyroscopic-lithe-89201.db.redis.io";
const REDIS_PORT = parseInt(process.env.REDIS_PORT ?? "17329", 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

declare global {
  // eslint-disable-next-line no-var
  var _redis: Redis | undefined;
}

function createRedisClient(): Redis {
  const client = new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD,
    tls: {},
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    connectTimeout: 3000,
    commandTimeout: 2000,
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
