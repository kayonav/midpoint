export interface TagFilter {
	key: string;
	value: string;
}

export interface Vibe {
	id: string;
	label: string;
	description: string;
	filters: readonly TagFilter[];
}

const tag = (key: string, value: string): TagFilter => ({ key, value });

/**
 * Maps a mood to OpenStreetMap tags.
 *
 * OSM has no single "fun stuff" key — a park is leisure=park, a viewpoint is
 * tourism=viewpoint, a cafe is amenity=cafe. Users should pick a vibe, not
 * learn a tagging schema, so the translation lives here.
 */
export const VIBES: readonly Vibe[] = [
	{
		id: "high_energy",
		label: "High energy",
		description: "Trampolines, laser tag, bowling, arcades, theme parks",
		filters: [
			tag("leisure", "trampoline_park"),
			tag("leisure", "bowling_alley"),
			tag("leisure", "amusement_arcade"),
			tag("leisure", "escape_game"),
			tag("leisure", "water_park"),
			tag("leisure", "sports_centre"),
			tag("leisure", "ice_rink"),
			tag("tourism", "theme_park"),
			tag("sport", "laser_tag"),
			tag("sport", "climbing"),
		],
	},
	{
		id: "chill_scenic",
		label: "Chill & scenic",
		description: "Parks, gardens, viewpoints, beaches, picnic spots",
		filters: [
			tag("leisure", "park"),
			tag("leisure", "garden"),
			tag("leisure", "nature_reserve"),
			tag("tourism", "viewpoint"),
			tag("tourism", "picnic_site"),
			tag("natural", "beach"),
		],
	},
	{
		id: "food_drink",
		label: "Food & drink",
		description: "Cafes, restaurants, ice cream, bubble tea",
		filters: [
			tag("amenity", "cafe"),
			tag("amenity", "restaurant"),
			tag("amenity", "fast_food"),
			tag("amenity", "ice_cream"),
			tag("shop", "bubble_tea"),
			tag("shop", "pastry"),
		],
	},
	{
		id: "culture_indoor",
		label: "Culture & indoor",
		description: "Museums, galleries, cinemas, theatres, bookshops",
		filters: [
			tag("tourism", "museum"),
			tag("tourism", "gallery"),
			tag("amenity", "cinema"),
			tag("amenity", "theatre"),
			tag("amenity", "library"),
			tag("shop", "books"),
		],
	},
];

export const DEFAULT_VIBE = "food_drink";

export function getVibe(id: string): Vibe {
	const vibe = VIBES.find((v) => v.id === id);
	if (!vibe) {
		throw new Error(`unknown vibe: ${id}`);
	}
	return vibe;
}

/**
 * Which filter an element matched, so results can be labelled "park" or
 * "viewpoint" rather than all sharing one generic category.
 */
export function matchFilter(
	tags: Record<string, string> | undefined,
	filters: readonly TagFilter[],
): TagFilter | undefined {
	if (!tags) return undefined;
	return filters.find((f) => tags[f.key] === f.value);
}
