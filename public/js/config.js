// @ts-check
/**
 * App configuration. Pages never change when DATA_MODE flips from "mock" to "http".
 */

/** @type {"mock" | "http"} */
export const DATA_MODE = "mock";

/** localStorage key of the mock database (one versioned key). */
export const STORE_KEY = "avivpms.v1";

/** Bump when the seed / data shape changes; store.migrate() upgrades older data. */
export const SCHEMA_VERSION = 4;

/** Simulated network delay for mock services, in milliseconds (min, max). */
export const MOCK_DELAY = Object.freeze({ min: 150, max: 400 });

/** Base URL of the future backend (used only when DATA_MODE === "http"). */
export const API_BASE_URL = "/api/v1";
