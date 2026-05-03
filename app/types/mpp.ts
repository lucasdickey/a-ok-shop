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

export interface MPPPurchaseRequest {
  items: Array<{
    handle: string;
    variantId: string;
    quantity: number;
  }>;
  agentId?: string;
  email?: string;
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
  items: Array<{
    handle: string;
    variantId: string;
    quantity: number;
  }>;
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
  items: Array<{
    handle: string;
    variantId: string;
    quantity: number;
  }>;
  amount: number; // in cents
  currency: string;
  paymentMethod: 'stripe-spt' | 'tempo';
  status: 'pending' | 'completed' | 'failed' | 'fulfilled';
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, string>;
}
