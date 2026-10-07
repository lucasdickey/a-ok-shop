/**
 * MPP (Machine Payments Protocol) Types
 *
 * Type definitions for MPP catalog and payment flows.
 */

export interface MPPProduct {
  id: string;
  handle: string;
  title: string;
  description: string;
  descriptionHtml?: string;
  productType?: string;
  vendor?: string;
  tags?: string[];
  priceRange: {
    minVariantPrice: {
      amount: string;
      currencyCode: string;
    };
    maxVariantPrice?: {
      amount: string;
      currencyCode: string;
    };
  };
  variants: MPPVariant[];
  images: Array<{
    url: string;
    altText: string;
  }>;
  options?: Array<{
    name: string;
    values: string[];
  }>;
}

export interface MPPVariant {
  id: string;
  title: string;
  price: string;
  compareAtPrice?: string;
  stripePriceId?: string;
  available: boolean;
  options: Array<{
    name: string;
    value: string;
  }>;
}

export interface MPPCatalogResponse {
  products: MPPProduct[];
  total: number;
}

export interface MPPItem {
  handle: string;
  variantId: string;
  quantity: number;
  /** Required for tees and hoodies: one of CLOTHING_SIZES. */
  size?: string;
}

/** Where a physical order ships. Same shape as Stripe's PaymentIntent `shipping`. */
export interface MPPShipping {
  name: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    /** US or CA: the only countries the store ships to. */
    country: string;
  };
}

export interface MPPPurchaseRequest {
  items: MPPItem[];
  agentId?: string;
  email?: string;
  /** Required when any item ships (everything except digital goods). */
  shipping?: MPPShipping;
}

export interface MPPPaymentChallenge {
  id: string; // Payment ID for tracking
  request: string; // base64url-encoded request details
  amount: number;
  currency: string;
  description: string;
  paymentMethods: {
    stripe?: {
      method: 'stripe';
      intent: 'charge';
      methodDetails?: {
        networkId: string; // Used by link-cli mpp decode
      };
    };
    tempo?: {
      amount: string;
      currency: 'USDC';
      recipient: string;
    };
  };
}

export interface MPPOrderConfirmation {
  orderId: string;
  status: 'completed' | 'pending' | 'failed';
  amount: number;
  currency: string;
  paymentMethod: 'stripe-link' | 'stripe-spt' | 'tempo';
  paymentId: string;
  items: MPPItem[];
  message: string;
}

export interface PaymentVerificationResult {
  verified: boolean;
  paymentId: string;
  amount: number;
  currency: string;
  method: 'stripe-link' | 'tempo';
  timestamp: number;
  error?: string;
}

export interface MPPOrder {
  orderId: string;
  paymentIntentId: string;
  agentId: string;
  email?: string;
  items: MPPItem[];
  shipping?: MPPShipping;
  amount: number; // in cents
  currency: string;
  paymentMethod: 'stripe-spt' | 'tempo';
  status: 'pending' | 'completed' | 'failed' | 'fulfilled';
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, string>;
}
