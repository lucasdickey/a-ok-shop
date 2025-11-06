// Legacy webhook endpoint - redirects to unified /api/stripe/webhook
// Kept for backward compatibility if already configured in Stripe Dashboard
// You can safely delete this file and update your Stripe webhook to use /api/stripe/webhook instead

import { POST as unifiedWebhookHandler } from "../../stripe/webhook/route";

export { unifiedWebhookHandler as POST };