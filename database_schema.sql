-- ============================================
-- MARIAM STORE - DATABASE SCHEMA
-- Run these commands in Supabase SQL Editor
-- ============================================

-- Create admin users table
CREATE TABLE IF NOT EXISTS admin_users (
  id BIGSERIAL PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  description TEXT,
  category BIGINT REFERENCES categories(id) ON DELETE SET NULL,
  sizes JSONB,
  colors JSONB,
  main_image VARCHAR(500),
  images JSONB,
  color_images JSONB,
  quantity INTEGER DEFAULT 0,
  available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id BIGSERIAL PRIMARY KEY,
  customer_name VARCHAR(255) NOT NULL,
  phone1 VARCHAR(20) NOT NULL,
  phone2 VARCHAR(20),
  address TEXT NOT NULL,
  items JSONB NOT NULL,
  total DECIMAL(10, 2),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_available ON products(available);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_customer_name ON orders(customer_name);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- ============================================
-- SAMPLE DATA (Optional - uncomment to use)
-- ============================================

-- Insert initial admin user (password will be stored hashed in production)
-- Default: username: admin, password: admin123 (change in production!)
-- INSERT INTO admin_users (username, password, role, is_active) VALUES 
--   ('admin', 'admin123', 'admin', true);

-- Insert sample categories
-- INSERT INTO categories (name) VALUES 
--   ('Dresses'),
--   ('Tops'),
--   ('Bottoms'),
--   ('Accessories');

-- Insert sample product
-- INSERT INTO products (name, price, description, category, quantity, available) VALUES 
--   ('Blue Dress', 299.99, 'Beautiful blue dress', 1, 10, TRUE);