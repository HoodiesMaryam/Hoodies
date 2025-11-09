// Admin Panel - Backend Integration

// API Configuration - Smart detection for local/production
const API_BASE = (function() {
  const hostname = window.location.hostname;
  const port = window.location.port;
  
  // Check if running on localhost or 127.0.0.1
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('local')) {
    // Local development - use localhost
    const devPort = port || '3000';
    return `http://${hostname}:${devPort}/api`;
  }
  
  // Production - use Vercel URL
  return 'https://maryam-gold.vercel.app/api';
})();

let productsData = [];
let ordersData = [];
let categories = [];
let authToken = null;

// ========== AUTHENTICATION ==========

// Check login state on page load
document.addEventListener('DOMContentLoaded', function() {
  checkAdminLoginState();
  
  // Login form submission
  document.getElementById('loginForm').addEventListener('submit', handleAdminLogin);
  
  // Logout button
  document.getElementById('logoutBtn').addEventListener('click', handleAdminLogout);
  
  // Product form submission
  document.getElementById('productForm').addEventListener('submit', handleProductFormSubmit);
  
  // Clear form button
  document.getElementById('clearFormBtn').addEventListener('click', clearProductForm);
  
  // Image preview
  document.getElementById('productMainImage').addEventListener('input', handleImagePreview);
  
  // Search and filter
  document.getElementById('searchProducts')?.addEventListener('input', filterProducts);
  document.getElementById('filterCategory')?.addEventListener('change', filterProducts);

  // Add category button
  document.getElementById('addCategoryBtn')?.addEventListener('click', addNewCategory);

  // Delete category button
  document.getElementById('deleteCategoryBtn')?.addEventListener('click', deleteCategory);
});

// Check Admin Login State
function checkAdminLoginState() {
  authToken = localStorage.getItem('adminToken');

  if (authToken) {
    // Verify token with backend
    verifyToken(authToken).then(valid => {
      if (valid) {
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
        loadAllData();
      } else {
        clearAuthToken();
      }
    });
  } else {
    document.getElementById('loginSection').style.display = 'flex';
    document.getElementById('adminPanel').style.display = 'none';
  }
}

// Verify Token
async function verifyToken(token) {
  try {
    const response = await fetch(`${API_BASE}/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    return response.ok;
  } catch (error) {
    console.error('Token verification failed:', error);
    return false;
  }
}

// Handle Admin Login
async function handleAdminLogin(event) {
  event.preventDefault();
  
  const username = document.getElementById('adminUsername').value.trim();
  const password = document.getElementById('adminPassword').value;
  
  if (!username || !password) {
    showNotification('الرجاء إدخال اسم المستخدم وكلمة المرور', false, true);
    return;
  }

  try {
    console.log('Attempting login with:', { username });
    
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    console.log('Login response status:', response.status);
    const data = await response.json();
    console.log('Login response data:', data);

    if (response.ok && data.token) {
      localStorage.setItem('adminToken', data.token);
      authToken = data.token;
      showNotification('تم تسجيل الدخول بنجاح!', true);
      document.getElementById('loginForm').reset();
      setTimeout(() => checkAdminLoginState(), 500);
    } else if (data.error) {
      showNotification(data.error || 'فشل تسجيل الدخول', false, true);
    } else {
      showNotification('اسم المستخدم أو كلمة المرور غير صحيحة', false, true);
    }
  } catch (error) {
    console.error('Login error:', error);
    showNotification('خطأ في الاتصال بالخادم: ' + error.message, false, true);
  }
}

// Handle Admin Logout
function handleAdminLogout() {
  clearAuthToken();
  showNotification('تم تسجيل الخروج بنجاح', false);
  setTimeout(() => {
    window.location.href = 'admin.html';
  }, 1000);
}

// Clear Auth Token
function clearAuthToken() {
  authToken = null;
  localStorage.removeItem('adminToken');
  document.getElementById('loginSection').style.display = 'flex';
  document.getElementById('adminPanel').style.display = 'none';
}

// ========== DATA LOADING ==========

// Load all data from API
async function loadAllData() {
  await loadProducts();
  await loadCategories();
  await loadOrders();
}

// Load Products from API
async function loadProducts() {
  try {
    const url = `${API_BASE}/products`;
    console.log('🔄 Loading products from:', url);
    console.log('📌 API_BASE value:', API_BASE);
    console.log('📌 Auth token present:', !!authToken);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('Products response status:', response.status);
    
    if (response.ok) {
      productsData = await response.json();
      console.log('✅ Products loaded:', productsData.length, 'items');
      updateCategorySelects();
      updateStatistics();
      renderAdminProducts();
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Products API error:', response.status, errorData);
      const errorMsg = `خطأ في تحميل المنتجات (${response.status}): ${errorData.error || response.statusText}`;
      showNotification(errorMsg, false, true);
    }
  } catch (error) {
    console.error('❌ Error loading products:', error);
    console.error('Error type:', error.name);
    console.error('Error message:', error.message);
    showNotification('خطأ في تحميل المنتجات: ' + error.message, false, true);
  }
}

// Load Categories from API
async function loadCategories() {
  try {
    const url = `${API_BASE}/categories`;
    console.log('🔄 Loading categories from:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log('Categories response status:', response.status);
    
    if (response.ok) {
      const categoriesData = await response.json();
      categories = categoriesData.map(cat => ({
        id: cat.id,
        name: cat.name
      }));
      console.log('✅ Categories loaded:', categories.length, 'items');
      updateCategorySelects();
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Categories API error:', response.status, errorData);
      const errorMsg = `خطأ في تحميل الفئات (${response.status}): ${errorData.error || response.statusText}`;
      showNotification(errorMsg, false, true);
    }
  } catch (error) {
    console.error('❌ Error loading categories:', error);
    console.error('Error type:', error.name);
    console.error('Error message:', error.message);
    showNotification('خطأ في تحميل الفئات: ' + error.message, false, true);
  }
}

// Load Orders from API
async function loadOrders() {
  try {
    const url = `${API_BASE}/orders`;
    console.log('🔄 Loading orders from:', url);
    console.log('📌 Auth token present:', !!authToken);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('Orders response status:', response.status);
    
    if (response.ok) {
      ordersData = await response.json();
      console.log('✅ Orders loaded:', ordersData.length, 'items');
      renderOrders();
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Orders API error:', response.status, errorData);
      const errorMsg = `خطأ في تحميل الطلبات (${response.status}): ${errorData.error || response.statusText}`;
      showNotification(errorMsg, false, true);
    }
  } catch (error) {
    console.error('❌ Error loading orders:', error);
    console.error('Error type:', error.name);
    console.error('Error message:', error.message);
    showNotification('خطأ في تحميل الطلبات: ' + error.message, false, true);
  }
}

// ========== PRODUCTS MANAGEMENT ==========

// Render Admin Products Table
function renderAdminProducts(filteredProducts = null) {
  const tableBody = document.getElementById('adminProductsTableBody');
  tableBody.innerHTML = '';
  
  const products = filteredProducts || productsData;
  
  if (products.length === 0) {
    const row = tableBody.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 8;
    cell.textContent = filteredProducts ? 'لا توجد نتائج' : 'لا توجد منتجات';
    cell.style.textAlign = 'center';
    cell.style.padding = '20px';
    return;
  }
  
  products.forEach(product => {
    const row = tableBody.insertRow();
    const categoryName = getCategoryName(product.category);
    
    row.innerHTML = `
      <td>
        <img src="${product.main_image}" alt="${product.name}" class="w-16 h-16 object-cover rounded-lg">
      </td>
      <td>${product.id}</td>
      <td>${product.name}</td>
      <td>${product.price} جنيه</td>
      <td>${categoryName}</td>
      <td>
        <span class="${product.quantity < 10 ? 'text-red-600 font-bold' : ''}">${product.quantity}</span>
      </td>
      <td>
        <span class="px-2 py-1 rounded-full text-xs ${product.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
          ${product.available ? 'نعم' : 'لا'}
        </span>
      </td>
      <td>
        <div class="flex gap-2">
          <button onclick="editProduct(${product.id})" class="admin-btn text-sm py-1 px-3 flex items-center gap-1">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
            </svg>
            تعديل
          </button>
          <button onclick="deleteProduct(${product.id})" class="admin-btn admin-btn-danger text-sm py-1 px-3 flex items-center gap-1">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
            حذف
          </button>
        </div>
      </td>
    `;
  });
}

// Get Category Name
function getCategoryName(categoryId) {
  if (!categoryId) return 'بدون فئة';
  const category = categories.find(c => c.id === categoryId);
  return category ? category.name : 'بدون فئة';
}

// Update Category Selects
function updateCategorySelects() {
  const productCategorySelect = document.getElementById('productCategory');
  const filterCategorySelect = document.getElementById('filterCategory');
  const deleteCategorySelect = document.getElementById('deleteCategorySelect');

  // Clear existing options except the first one
  while (productCategorySelect.options.length > 1) {
    productCategorySelect.remove(1);
  }
  while (filterCategorySelect.options.length > 1) {
    filterCategorySelect.remove(1);
  }
  while (deleteCategorySelect.options.length > 1) {
    deleteCategorySelect.remove(1);
  }

  // Add categories
  categories.forEach(category => {
    const option1 = new Option(category.name, category.id);
    const option2 = new Option(category.name, category.id);
    const option3 = new Option(category.name, category.id);
    productCategorySelect.add(option1);
    filterCategorySelect.add(option2);
    deleteCategorySelect.add(option3);
  });
}

// Handle Product Form Submit
async function handleProductFormSubmit(event) {
  event.preventDefault();
  
  const productId = document.getElementById('productId').value;
  const name = document.getElementById('productName').value.trim();
  const price = parseFloat(document.getElementById('productPrice').value);
  const description = document.getElementById('productDescription').value.trim();
  const category = document.getElementById('productCategory').value;
  const mainImage = document.getElementById('productMainImage').value.trim();
  
  // Validate required fields
  if (!name || !price || !mainImage || !description) {
    showNotification('الرجاء ملء جميع الحقول المطلوبة', false, true);
    return;
  }
  
  // Validate price
  if (isNaN(price) || price <= 0) {
    showNotification('السعر يجب أن يكون رقماً موجباً', false, true);
    return;
  }
  
  // Validate main image URL
  try {
    new URL(mainImage);
  } catch (e) {
    showNotification('رابط الصورة الرئيسية غير صحيح', false, true);
    return;
  }
  
  // Get selected sizes
  const sizes = Array.from(document.querySelectorAll('.size-checkbox:checked')).map(cb => cb.value);
  
  // Get selected colors
  const colors = Array.from(document.querySelectorAll('.color-checkbox:checked')).map(cb => cb.value);
  
  let images = [];
  try {
    const imagesInput = document.getElementById('productImages').value.trim();
    if (imagesInput) {
      images = imagesInput.split(',').map(img => img.trim()).filter(img => img !== '');
      // Validate that each image is a valid URL
      images = images.filter(img => {
        try {
          new URL(img);
          return true;
        } catch (e) {
          console.warn('Invalid image URL:', img);
          return true; // Still allow it, just log the warning
        }
      });
    }
  } catch (e) {
    console.error('Images parsing error:', e);
    // Don't show error, just continue with empty images array
  }
  
  const quantity = parseInt(document.getElementById('productQuantity').value);
  const available = document.getElementById('productAvailable').checked;
  
  let colorImages = {};
  try {
    const colorImagesInput = document.getElementById('productColorImages').value.trim();
    if (colorImagesInput) {
      try {
        colorImages = JSON.parse(colorImagesInput);
      } catch (parseError) {
        console.error('JSON parsing error:', parseError);
        showNotification('صيغة صور الألوان غير صحيحة. تأكد من صيغة JSON:\n{"أسود": "url", "أبيض": "url"}', false, true);
        return;
      }
    }
  } catch (e) {
    console.error('Color images error:', e);
  }
  
  const productData = {
    name,
    price,
    description,
    category: category ? parseInt(category) : null,
    sizes,
    colors,
    mainImage,
    images,
    colorImages,
    quantity,
    available
  };

  try {
    let response;
    
    if (productId) {
      // Edit product - Use query parameter for ID
      response = await fetch(`${API_BASE}/products?id=${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(productData)
      });
      
      if (response.ok) {
        showNotification('تم تعديل المنتج بنجاح!', true);
        await loadProducts();
        clearProductForm();
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Edit product error:', errorData);
        showNotification(errorData.error || 'خطأ في تعديل المنتج', false, true);
      }
    } else {
      // Add new product
      response = await fetch(`${API_BASE}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(productData)
      });
      
      if (response.ok) {
        showNotification('تم إضافة المنتج بنجاح!', true);
        await loadProducts();
        clearProductForm();
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Add product error:', errorData);
        showNotification(errorData.error || 'خطأ في إضافة المنتج', false, true);
      }
    }
  } catch (error) {
    console.error('Error submitting product:', error);
    showNotification('خطأ في الاتصال بالخادم', false, true);
  }
}

// Edit Product
function editProduct(id) {
  const product = productsData.find(p => p.id === id);
  if (product) {
    document.getElementById('productId').value = product.id;
    document.getElementById('productName').value = product.name;
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productDescription').value = product.description;
    document.getElementById('productCategory').value = product.category || '';
    
    // Set size checkboxes
    document.querySelectorAll('.size-checkbox').forEach(cb => {
      cb.checked = product.sizes && product.sizes.includes(cb.value);
    });
    
    // Set color checkboxes
    document.querySelectorAll('.color-checkbox').forEach(cb => {
      cb.checked = product.colors && product.colors.includes(cb.value);
    });
    
    document.getElementById('productMainImage').value = product.main_image || '';
    document.getElementById('productImages').value = (product.images || []).join(',');
    document.getElementById('productColorImages').value = JSON.stringify(product.color_images || {});
    document.getElementById('productQuantity').value = product.quantity;
    document.getElementById('productAvailable').checked = product.available;
    
    // Show image preview
    handleImagePreview();
    
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showNotification('تم تحميل بيانات المنتج للتعديل', false);
  } else {
    showNotification('المنتج غير موجود', false, true);
  }
}

// Delete Product
async function deleteProduct(id) {
  if (confirm('هل أنت متأكد أنك تريد حذف هذا المنتج؟')) {
    try {
      const response = await fetch(`${API_BASE}/products?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.ok) {
        showNotification('تم حذف المنتج بنجاح!', true);
        await loadProducts();
      } else {
        showNotification('خطأ في حذف المنتج', false, true);
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      showNotification('خطأ في الاتصال بالخادم', false, true);
    }
  }
}

// Clear Product Form
function clearProductForm() {
  document.getElementById('productId').value = '';
  document.getElementById('productForm').reset();
  document.getElementById('productAvailable').checked = true;
  document.getElementById('mainImagePreview').style.display = 'none';
  
  // Uncheck all size and color checkboxes
  document.querySelectorAll('.size-checkbox, .color-checkbox').forEach(cb => {
    cb.checked = false;
  });
  
  showNotification('تم مسح النموذج', false);
}

// Handle Image Preview
function handleImagePreview() {
  const imageUrl = document.getElementById('productMainImage').value;
  const previewDiv = document.getElementById('mainImagePreview');
  const previewImg = previewDiv.querySelector('img');
  
  if (imageUrl && imageUrl.startsWith('http')) {
    previewImg.src = imageUrl;
    previewDiv.style.display = 'block';
  } else {
    previewDiv.style.display = 'none';
  }
}

// Filter Products
function filterProducts() {
  const searchTerm = document.getElementById('searchProducts')?.value.toLowerCase() || '';
  const categoryFilter = document.getElementById('filterCategory')?.value || 'all';
  
  let filtered = productsData;
  
  if (searchTerm) {
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(searchTerm) ||
      p.description.toLowerCase().includes(searchTerm) ||
      p.id.toString().includes(searchTerm)
    );
  }
  
  if (categoryFilter !== 'all') {
    filtered = filtered.filter(p => p.category === parseInt(categoryFilter));
  }
  
  renderAdminProducts(filtered);
}

// ========== CATEGORIES MANAGEMENT ==========

// Add New Category
async function addNewCategory() {
  const newCategoryName = document.getElementById('newCategoryName').value.trim();

  if (!newCategoryName) {
    showNotification('يرجى إدخال اسم الفئة', false, true);
    return;
  }

  if (categories.some(c => c.name === newCategoryName)) {
    showNotification('هذه الفئة موجودة بالفعل', false, true);
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ name: newCategoryName })
    });

    if (response.ok) {
      showNotification('تم إضافة الفئة الجديدة بنجاح!', true);
      document.getElementById('newCategoryName').value = '';
      await loadCategories();
    } else {
      showNotification('خطأ في إضافة الفئة', false, true);
    }
  } catch (error) {
    console.error('Error adding category:', error);
    showNotification('خطأ في الاتصال بالخادم', false, true);
  }
}

// Delete Category
async function deleteCategory() {
  const categoryToDelete = document.getElementById('deleteCategorySelect').value;

  if (!categoryToDelete) {
    showNotification('يرجى اختيار فئة لحذفها', false, true);
    return;
  }

  const categoryName = categories.find(c => c.id === parseInt(categoryToDelete))?.name;
  
  if (!confirm(`هل أنت متأكد من حذف الفئة "${categoryName}"؟ سيتم حذف جميع المنتجات المرتبطة بها.`)) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/categories?id=${categoryToDelete}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (response.ok) {
      showNotification('تم حذف الفئة وجميع منتجاتها بنجاح!', true);
      await loadCategories();
      await loadProducts();
    } else {
      showNotification('خطأ في حذف الفئة', false, true);
    }
  } catch (error) {
    console.error('Error deleting category:', error);
    showNotification('خطأ في الاتصال بالخادم', false, true);
  }
}

// ========== ORDERS MANAGEMENT ==========

// Render Orders
function renderOrders() {
  const tableBody = document.getElementById('ordersTableBody');
  tableBody.innerHTML = '';
  
  if (ordersData.length === 0) {
    const row = tableBody.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 8;
    cell.textContent = 'لا توجد طلبات حتى الآن';
    cell.style.textAlign = 'center';
    cell.style.padding = '20px';
    cell.className = 'text-gray-500';
    return;
  }
  
  ordersData.reverse().forEach((order, index) => {
    const row = tableBody.insertRow();
    const orderNumber = ordersData.length - index;
    
    // Products summary
    const productsSummary = (order.items || []).map(item => 
      `${item.name} (${item.size !== 'مقاس واحد' ? item.size : ''} ${item.color !== 'متعدد' ? item.color : ''})`
    ).join(', ');
    
    row.innerHTML = `
      <td>${orderNumber}</td>
      <td>${order.customer_name}</td>
      <td>
        <div>${order.phone1}</div>
        ${order.phone2 ? `<div class="text-xs text-gray-500">${order.phone2}</div>` : ''}
      </td>
      <td class="max-w-xs truncate" title="${order.address}">${order.address}</td>
      <td class="max-w-md">
        <div class="text-sm">${productsSummary}</div>
        <div class="text-xs text-gray-500">${(order.items || []).length} منتج</div>
      </td>
      <td class="font-bold text-green-600">${order.total} جنيه</td>
      <td class="text-xs">${new Date(order.created_at).toLocaleString('ar-EG')}</td>
      <td>
        <select onchange="updateOrderStatus(${order.id}, this.value)" class="admin-form-select text-xs">
          <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>قيد الانتظار</option>
          <option value="confirmed" ${order.status === 'confirmed' ? 'selected' : ''}>مؤكد</option>
          <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>مرسل</option>
          <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>تم التسليم</option>
          <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>ملغى</option>
        </select>
        <button onclick="deleteOrder(${order.id})" class="admin-btn admin-btn-danger text-xs py-1 px-2 mt-2">
          <svg class="w-3 h-3 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
          </svg>
          حذف
        </button>
      </td>
    `;
  });
}

// Update Order Status
async function updateOrderStatus(id, status) {
  try {
    const response = await fetch(`${API_BASE}/orders?id=${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ status })
    });

    if (response.ok) {
      showNotification('تم تحديث حالة الطلب بنجاح!', true);
      await loadOrders();
    } else {
      showNotification('خطأ في تحديث الطلب', false, true);
    }
  } catch (error) {
    console.error('Error updating order:', error);
    showNotification('خطأ في الاتصال بالخادم', false, true);
  }
}

// Delete Order
async function deleteOrder(id) {
  if (confirm('هل أنت متأكد من حذف هذا الطلب؟')) {
    try {
      const response = await fetch(`${API_BASE}/orders?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.ok) {
        showNotification('تم حذف الطلب بنجاح', true);
        await loadOrders();
      } else {
        showNotification('خطأ في حذف الطلب', false, true);
      }
    } catch (error) {
      console.error('Error deleting order:', error);
      showNotification('خطأ في الاتصال بالخادم', false, true);
    }
  }
}

// Clear All Orders
async function clearAllOrders() {
  if (confirm('هل أنت متأكد من حذف جميع الطلبات؟')) {
    try {
      // Delete all orders
      const deletePromises = ordersData.map(order =>
        fetch(`${API_BASE}/orders?id=${order.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        })
      );

      await Promise.all(deletePromises);
      showNotification('تم حذف جميع الطلبات', true);
      await loadOrders();
    } catch (error) {
      console.error('Error clearing orders:', error);
      showNotification('خطأ في الاتصال بالخادم', false, true);
    }
  }
}

// ========== STATISTICS ==========

// Update Statistics
function updateStatistics() {
  const total = productsData.length;
  const available = productsData.filter(p => p.available).length;
  const unavailable = total - available;
  const totalQuantity = productsData.reduce((sum, p) => sum + (p.quantity || 0), 0);
  
  document.getElementById('totalProducts').textContent = total;
  document.getElementById('availableProducts').textContent = available;
  document.getElementById('unavailableProducts').textContent = unavailable;
  document.getElementById('totalQuantity').textContent = totalQuantity;
}

// ========== NOTIFICATIONS ==========

// Show Notification
function showNotification(message, isSuccess = false, isError = false) {
  const notificationContainer = document.querySelector('.notification-container') || (() => {
    const div = document.createElement('div');
    div.className = 'notification-container';
    document.body.appendChild(div);
    return div;
  })();
  
  const notificationItem = document.createElement('div');
  notificationItem.className = 'notification-item';
  
  if (isSuccess) {
    notificationItem.innerHTML = `
      <div class="main-message">${message}</div>
      <div class="sub-message">تمت العملية بنجاح</div>
    `;
    notificationItem.style.backgroundColor = '#28a745';
  } else if (isError) {
    notificationItem.classList.add('error');
    notificationItem.textContent = message;
    notificationItem.style.backgroundColor = '#dc3545';
  } else {
    notificationItem.classList.add('regular');
    notificationItem.textContent = message;
    notificationItem.style.backgroundColor = '#333333';
  }
  
  notificationContainer.appendChild(notificationItem);
  
  setTimeout(() => {
    notificationItem.classList.add('show');
  }, 10);
  
  setTimeout(() => {
    notificationItem.classList.remove('show');
    notificationItem.classList.add('hide');
    notificationItem.addEventListener('transitionend', () => {
      notificationItem.remove();
    }, { once: true });
  }, 3000);
}