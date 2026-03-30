// Shared memory cache for the prototype
// In Next.js, this will persist between requests in the same process
export const paymentCache = new Map<string, any>();
