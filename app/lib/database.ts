import { Pool } from 'pg';

// Database types matching our schema
export type Product = {
  id: string;
  handle: string;
  title: string;
  description: string;
  descriptionHtml?: string;
  productType: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
};

export type ProductVariant = {
  id: string;
  productId: string;
  title: string;
  price: number;
  size?: string;
  color?: string;
  available: boolean;
  sku: string;
};

export type ProductImage = {
  id: string;
  productId: string;
  url: string;
  altText?: string;
  position: number;
};

export type Order = {
  id: number;
  orderNumber: string;
  email: string;
  total: number;
  subtotal: number;
  tax: number;
  shipping: number;
  discountAmount: number;
  discountCode?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  shippingAddress?: any;
  billingAddress?: any;
  customerNote?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type OrderItem = {
  id: number;
  orderId: number;
  productId: string;
  variantId: string;
  quantity: number;
  price: number;
  title: string;
  variantTitle?: string;
  imageUrl?: string;
};

// Create a connection pool for better performance
let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL || 
      'postgresql://postgres:password@localhost:5432/aok_shop';
    
    pool = new Pool({
      connectionString,
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
    
    // Handle pool errors
    pool.on('error', (err) => {
      console.error('Unexpected error on idle database client', err);
    });
  }
  
  return pool;
}

// Product queries
export async function getAllProducts(): Promise<Product[]> {
  const pool = getPool();
  const query = `
    SELECT 
      id, handle, title, description, 
      description_html as "descriptionHtml",
      product_type as "productType", 
      tags, created_at as "createdAt", 
      updated_at as "updatedAt"
    FROM products
    ORDER BY created_at DESC
  `;
  
  const result = await pool.query(query);
  return result.rows;
}

export async function getProductByHandle(handle: string): Promise<Product | null> {
  const pool = getPool();
  const query = `
    SELECT 
      id, handle, title, description, 
      description_html as "descriptionHtml",
      product_type as "productType", 
      tags, created_at as "createdAt", 
      updated_at as "updatedAt"
    FROM products
    WHERE handle = $1
  `;
  
  const result = await pool.query(query, [handle]);
  return result.rows[0] || null;
}

export async function getProductVariants(productId: string): Promise<ProductVariant[]> {
  const pool = getPool();
  const query = `
    SELECT 
      id, product_id as "productId", title, price, 
      size, color, available, sku
    FROM product_variants
    WHERE product_id = $1
    ORDER BY price ASC
  `;
  
  const result = await pool.query(query, [productId]);
  return result.rows;
}

export async function getProductImages(productId: string): Promise<ProductImage[]> {
  const pool = getPool();
  const query = `
    SELECT 
      id, product_id as "productId", url, 
      alt_text as "altText", position
    FROM product_images
    WHERE product_id = $1
    ORDER BY position ASC
  `;
  
  const result = await pool.query(query, [productId]);
  return result.rows;
}

// Get full product with variants and images
export async function getFullProduct(handle: string) {
  const product = await getProductByHandle(handle);
  if (!product) return null;
  
  const [variants, images] = await Promise.all([
    getProductVariants(product.id),
    getProductImages(product.id),
  ]);
  
  return {
    ...product,
    variants,
    images,
  };
}

// Get products for catalog/homepage
export async function getCatalogProducts() {
  const pool = getPool();
  const query = `
    SELECT 
      p.id, p.handle, p.title, p.description,
      p.product_type as "productType", p.tags,
      MIN(pv.price) as "minPrice",
      MAX(pv.price) as "maxPrice",
      COALESCE(
        json_agg(
          DISTINCT jsonb_build_object(
            'url', pi.url,
            'altText', pi.alt_text,
            'position', pi.position
          ) ORDER BY pi.position
        ) FILTER (WHERE pi.id IS NOT NULL), 
        '[]'::json
      ) as images
    FROM products p
    LEFT JOIN product_variants pv ON p.id = pv.product_id
    LEFT JOIN product_images pi ON p.id = pi.product_id
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `;
  
  const result = await pool.query(query);
  return result.rows;
}

// Order management
export async function createOrder(orderData: {
  email: string;
  items: Array<{
    productId: string;
    variantId: string;
    quantity: number;
    price: number;
    title: string;
    variantTitle?: string;
    imageUrl?: string;
  }>;
  subtotal: number;
  tax?: number;
  shipping?: number;
  discountCode?: string;
  discountAmount?: number;
  shippingAddress?: any;
  billingAddress?: any;
  customerNote?: string;
}): Promise<Order> {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Generate order number
    const orderNumber = `AOK-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const total = orderData.subtotal + (orderData.tax || 0) + (orderData.shipping || 0) - (orderData.discountAmount || 0);
    
    // Create order
    const orderQuery = `
      INSERT INTO orders (
        order_number, email, total, subtotal, tax, shipping, 
        discount_amount, discount_code, status, 
        shipping_address, billing_address, customer_note
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;
    
    const orderResult = await client.query(orderQuery, [
      orderNumber,
      orderData.email,
      total,
      orderData.subtotal,
      orderData.tax || 0,
      orderData.shipping || 0,
      orderData.discountAmount || 0,
      orderData.discountCode || null,
      'pending',
      orderData.shippingAddress || null,
      orderData.billingAddress || null,
      orderData.customerNote || null,
    ]);
    
    const order = orderResult.rows[0];
    
    // Create order items
    for (const item of orderData.items) {
      await client.query(
        `INSERT INTO order_items (
          order_id, product_id, variant_id, quantity, 
          price, title, variant_title, image_url
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          order.id,
          item.productId,
          item.variantId,
          item.quantity,
          item.price,
          item.title,
          item.variantTitle || null,
          item.imageUrl || null,
        ]
      );
    }
    
    await client.query('COMMIT');
    return order;
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function updateOrderStatus(
  orderId: number, 
  status: Order['status'],
  stripePaymentIntentId?: string,
  stripeChargeId?: string
): Promise<Order> {
  const pool = getPool();
  const query = `
    UPDATE orders 
    SET status = $2, 
        stripe_payment_intent_id = COALESCE($3, stripe_payment_intent_id),
        stripe_charge_id = COALESCE($4, stripe_charge_id),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
  `;
  
  const result = await pool.query(query, [orderId, status, stripePaymentIntentId, stripeChargeId]);
  return result.rows[0];
}

export async function getOrderById(orderId: number): Promise<Order | null> {
  const pool = getPool();
  const query = `SELECT * FROM orders WHERE id = $1`;
  const result = await pool.query(query, [orderId]);
  return result.rows[0] || null;
}

export async function getOrderByNumber(orderNumber: string): Promise<Order | null> {
  const pool = getPool();
  const query = `SELECT * FROM orders WHERE order_number = $1`;
  const result = await pool.query(query, [orderNumber]);
  return result.rows[0] || null;
}

// Discount code validation
export async function validateDiscountCode(code: string): Promise<{
  valid: boolean;
  discountPercentage?: number;
  discountAmount?: number;
  message?: string;
}> {
  const pool = getPool();
  const query = `
    SELECT * FROM discount_codes 
    WHERE UPPER(code) = UPPER($1) 
      AND active = true 
      AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
      AND (usage_limit IS NULL OR usage_count < usage_limit)
  `;
  
  const result = await pool.query(query, [code]);
  const discount = result.rows[0];
  
  if (!discount) {
    return { valid: false, message: 'Invalid or expired discount code' };
  }
  
  // Increment usage count
  await pool.query(
    'UPDATE discount_codes SET usage_count = usage_count + 1 WHERE id = $1',
    [discount.id]
  );
  
  return {
    valid: true,
    discountPercentage: discount.discount_percentage,
    discountAmount: discount.discount_amount,
  };
}