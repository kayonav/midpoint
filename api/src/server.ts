import { MemoryCache, RedisCache } from "@midpoint/cache";
import { findPlaces } from "@midpoint/places";
import Fastify from "fastify";
import Redis from "ioredis";
import { type MeetRequest, planMeet, ValidationError } from "./meet.js";

export function buildServer() {
	const app = Fastify({ logger: true });

	const redisUrl = process.env.REDIS_URL;
	const cache = redisUrl
		? new RedisCache(new Redis(redisUrl))
		: new MemoryCache();

	app.log.info(
		redisUrl
			? "cache: redis"
			: "cache: in-memory (set REDIS_URL to persist across restarts)",
	);

	app.get("/health", async () => ({ ok: true }));

	app.post("/meet", async (request, reply) => {
		try {
			return await planMeet(request.body as MeetRequest, (q) =>
				findPlaces(q, { cache }),
			);
		} catch (err) {
			if (err instanceof ValidationError) {
				return reply.status(400).send({ error: err.message });
			}
			throw err;
		}
	});

	return app;
}
