-- Create products table
CREATE TABLE products (
    id VARCHAR(255) PRIMARY KEY,
    handle VARCHAR(255) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    description_html TEXT,
    created_at TIMESTAMP NOT NULL,
    product_type VARCHAR(100),
    tags TEXT[],
    color_metafield JSONB,
    min_variant_price DECIMAL(10, 2)
);

-- Create product variants table
CREATE TABLE product_variants (
    id VARCHAR(255) PRIMARY KEY,
    product_id VARCHAR(255) REFERENCES products(id),
    title VARCHAR(255),
    price DECIMAL(10, 2) NOT NULL,
    available_for_sale BOOLEAN DEFAULT TRUE,
    selected_options JSONB,
    color_metafield JSONB,
    sku VARCHAR(255)
);

-- Create product images table
CREATE TABLE product_images (
    id SERIAL PRIMARY KEY,
    product_id VARCHAR(255) REFERENCES products(id),
    url TEXT NOT NULL,
    alt_text VARCHAR(255),
    position INTEGER
);

-- Create product options table
CREATE TABLE product_options (
    id SERIAL PRIMARY KEY,
    product_id VARCHAR(255) REFERENCES products(id),
    name VARCHAR(100) NOT NULL,
    values TEXT[]
);

-- Create indexes for performance
CREATE INDEX idx_products_handle ON products(handle);
CREATE INDEX idx_products_type ON products(product_type);
CREATE INDEX idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX idx_product_images_product_id ON product_images(product_id);