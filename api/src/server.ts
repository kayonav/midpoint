import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MemoryCache, RedisCache } from "@midpoint/cache";
import { findPlaces, VIBES } from "@midpoint/places";
import Fastify from "fastify";
import Redis from "ioredis";
import { type MeetRequest, planMeet, ValidationError } from "./meet.js";

const page = readFileSync(
	join(import.meta.dirname, "../public/index.html"),
	"utf8",
);

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

	app.get("/", async (_request, reply) => reply.type("text/html").send(page));

	app.get("/health", async () => ({ ok: true }));

	// The UI builds its picker from this, so vibes are defined in one place.
	app.get("/vibes", async () =>
		VIBES.map((v) => ({
			id: v.id,
			label: v.label,
			description: v.description,
		})),
	);

	app.post("/meet", async (request, reply) => {
		try {
			return await planMeet(request.body as MeetRequest, (q) =>
				findPlaces(q, { cache, endpoint: process.env.OVERPASS_URL }),
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
