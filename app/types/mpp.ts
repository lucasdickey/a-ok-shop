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
  amount: number;
  currency: string;
  description: string;
  paymentMethods: {
    stripe?: {
      clientSecret: string;
      publishableKey: string;
      method: 'link';
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
  paymentMethod: 'stripe-link' | 'tempo';
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
