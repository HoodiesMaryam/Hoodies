// Vercel & Supabase Configuration
// This is the updated config for your deployed application

// API Base URL - Change this to your Vercel deployment URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 
                     (typeof window !== 'undefined' && window.location.hostname === 'localhost' 
                      ? 'http://localhost:3000'
                      : 'https://your-vercel-domain.vercel.app');

// Supabase Configuration (if using client-side Supabase)
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Admin Configuration
const ADMIN_USERNAME = 'admin'; // Can be any username, configure on server
const ADMIN_PASSWORD = 'admin123'; // Change this to something secure

// ============================================
// API Helper Functions
// ============================================

// Fetch all products
async function getProducts(category = null) {
  try {
    const url = new URL(`${API_BASE_URL}/api/products`);
    if (category && category !== 'all') {
      url.searchParams.append('category', category);
    }
    const response = await fetch(url.toString());
    if (!response.ok) throw new Error('Failed to fetch products');
    return await response.json();
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

// Fetch single product
async function getProduct(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/products/${id}`);
    if (!response.ok) throw new Error('Failed to fetch product');
    return await response.json();
  } catch (error) {
    console.error('Error fetching product:', error);
    return null;
  }
}

// Search products
async function searchProducts(query) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/products/search/${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error('Failed to search products');
    return await response.json();
  } catch (error) {
    console.error('Error searching products:', error);
    return [];
  }
}

// Create order
async function createOrder(orderData) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderData)
    });
    if (!response.ok) throw new Error('Failed to create order');
    return await response.json();
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
}

// Get all orders (admin)
async function getOrders(token) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/orders`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) throw new Error('Failed to fetch orders');
    return await response.json();
  } catch (error) {
    console.error('Error fetching orders:', error);
    return [];
  }
}

// Get all categories
async function getCategories() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/categories`);
    if (!response.ok) throw new Error('Failed to fetch categories');
    return await response.json();
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

// Admin login
async function adminLogin(username, password) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });
    if (!response.ok) throw new Error('Invalid credentials');
    return await response.json();
  } catch (error) {
    console.error('Error logging in:', error);
    throw error;
  }
}

// ============================================
// Notes for Migration
// ============================================

/*
MIGRATION CHECKLIST:

1. ✅ Created API endpoints in /api directory
2. ✅ Set up Supabase database tables
3. ✅ Created package.json with dependencies
4. ✅ Set up environment variables
5. ⬜ Update script.js to use API calls instead of localStorage
6. ⬜ Update admin.js to use API calls
7. ⬜ Test locally with: npm run dev
8. ⬜ Deploy to Vercel
9. ⬜ Update API_BASE_URL to your Vercel domain
10. ⬜ Keep localStorage for cart/wishlist (client-side only)

IMPORTANT:
- Store cart and wishlist in localStorage (still client-side)
- Use API for products, orders, and categories (server-side)
- Admin authentication token can be stored in localStorage
- Before deploying, update ADMIN_PASSWORD to something secure
*/

export {
  API_BASE_URL,
  SUPABASE_URL,
  SUPABASE_KEY,
  ADMIN_USERNAME,
  ADMIN_PASSWORD,
  getProducts,
  getProduct,
  searchProducts,
  createOrder,
  getOrders,
  getCategories,
  adminLogin
};