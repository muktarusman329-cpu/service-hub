/**
 * Generate a unique idempotency key for API requests.
 * Uses crypto.randomUUID() which is available in modern browsers and Node.js.
 */
export const generateIdempotencyKey = () => crypto.randomUUID();
