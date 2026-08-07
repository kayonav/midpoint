import { MemoryCache } from "@midpoint/cache";
import { findPlaces } from "@midpoint/places";
import Fastify from "fastify";
import { type MeetRequest, planMeet, ValidationError } from "./meet.js";

export function buildServer() {
	const app = Fastify({ logger: true });
	const cache = new MemoryCache();

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
