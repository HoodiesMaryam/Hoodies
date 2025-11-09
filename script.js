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

// Products Data - Will be loaded from API
let productsData = [];

// Load categories from localStorage (fallback) or will be loaded from API
let categories = JSON.parse(localStorage.getItem('categories')) || ['hoodies', 'sweatpants', 'sets', 'jackets'];

// Function to fetch products from API
async function loadProductsFromAPI() {
  try {
    console.log('Fetching products from:', `${API_BASE}/products`);
    const response = await fetch(`${API_BASE}/products`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('API response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Failed to fetch products: ${response.status} - ${errorData.error || response.statusText}`);
    }
    
    const data = await response.json();
    
    // Transform API response to match frontend format
    productsData = data.map(product => ({
      id: product.id,
      name: product.name,
      price: product.price,
      description: product.description,
      category: product.category,
      sizes: product.sizes || [],
      colors: product.colors || [],
      mainImage: product.main_image,
      images: product.images || [],
      colorImages: product.color_images || {},
      quantity: product.quantity,
      available: product.available
    }));
    
    console.log('✓ Products loaded from API:', productsData.length, 'products');
  } catch (error) {
    console.error('✗ Error loading products from API:', error);
    // Fallback to empty array if API fails
    productsData = [];
  }
}

// Global Variables
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
let cartCount = cart.length;
let wishlistCount = wishlist.length;
let currentProduct = null;
let selectedSize = null;
let selectedColor = null;
let currentImageIndex = 0;
let previousScrollPosition = 0;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async function() {
  // Load products from API first
  await loadProductsFromAPI();
  
  renderProducts();
  updateCartDisplay();
  updateWishlistDisplay();
  updateWishlistPage();
  initFilterButtons();
  initAddToCartListeners();
  initWishlistItems();
  initIntersectionObserver();
  initSearchFunction();

  // Reload products when page becomes visible (e.g., when switching tabs)
  window.addEventListener('focus', async function() {
    await loadProductsFromAPI();
    categories = JSON.parse(localStorage.getItem('categories')) || ['hoodies', 'sweatpants', 'sets', 'jackets'];
    initFilterButtons();
    renderProducts();
  });

  // Cart button
  document.getElementById('cartBtn').addEventListener('click', function() {
    const cartModal = document.getElementById('cartModal');
    cartModal.classList.remove('hidden');
    setTimeout(() => {
      cartModal.classList.remove('scale-95', 'opacity-0');
      cartModal.classList.add('scale-100', 'opacity-100');
    }, 10);
    previousScrollPosition = window.scrollY;
    history.pushState({ modal: 'cart', scrollY: previousScrollPosition }, '', '#cart');
  });
  
  // Close cart button
  document.getElementById('closeCartBtn').addEventListener('click', function() {
    const cartModal = document.getElementById('cartModal');
    cartModal.classList.remove('scale-100', 'opacity-100');
    cartModal.classList.add('scale-95', 'opacity-0');
    cartModal.addEventListener('transitionend', function handler() {
      cartModal.classList.add('hidden');
      cartModal.removeEventListener('transitionend', handler);
    }, { once: true });
    if (history.state && history.state.modal === 'cart') {
      history.back();
    }
  });
  
  // Proceed to checkout button
  document.getElementById('proceedToCheckoutBtn').addEventListener('click', function() {
    if (cart.length === 0) {
      showNotification('Cart is empty!', false, true);
      return;
    }
    document.getElementById('cartModal').classList.add('hidden');
    showPage('checkoutPage');
    populateCheckoutSummary();
    history.pushState({ page: 'checkoutPage' }, '', '#checkout');
  });
  
  // Add to cart from modal
  document.getElementById('modalAddToCartBtn').addEventListener('click', function() {
    if (!currentProduct) return;
    
    const requiresSizeSelection = currentProduct.sizes.length > 0 && currentProduct.sizes[0] !== 'One Size';
    const requiresColorSelection = currentProduct.colors.length > 0 && currentProduct.colors[0] !== 'Multi';
    
    if (requiresSizeSelection && !selectedSize) {
      showNotification('Please select size first', false, true);
      return;
    }

    if (requiresColorSelection && !selectedColor) {
      showNotification('Please select color first', false, true);
      return;
    }
    
    const colorImage = selectedColor && currentProduct.colorImages && currentProduct.colorImages[selectedColor] 
      ? currentProduct.colorImages[selectedColor] 
      : null;
    
    const product = {
      name: currentProduct.name,
      price: currentProduct.price,
      image: currentProduct.mainImage || (currentProduct.images && currentProduct.images.length > 0 ? currentProduct.images[0] : ''),
      description: currentProduct.description,
      size: selectedSize || 'One Size',
      color: selectedColor || 'Multi',
      colorImage: colorImage,
      id: Date.now()
    };
    
    cart.push(product);
    cartCount++;
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartDisplay();
    
    showNotification('The product has been added to the cart successfully!', true);
    closeProductDetailModal();
  });
  
  // Checkout form submission
  document.getElementById('checkoutForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const fullName = document.getElementById('fullName').value;
    const phone1 = document.getElementById('phone1').value;
    const phone2 = document.getElementById('phone2').value;
    const address = document.getElementById('address').value;
    
    if (!fullName || !phone1 || !address) {
      showNotification('Please fill all required fields', false, true);
      return;
    }

    if (phone1.length !== 11 || isNaN(phone1)) {
      showNotification('Phone number 1 must be 11 digits', false, true);
      return;
    }

    if (phone2 && (phone2.length !== 11 || isNaN(phone2))) {
      showNotification('Phone number 2 must be 11 digits', false, true);
      return;
    }
    
    let orderDetails = `✅ *طلب جديد من متجر مريام* ✅\n\n`;
    orderDetails += `*Customer Data:*\n`;
    orderDetails += `Name: ${fullName}\n`;
    orderDetails += `Phone 1: ${phone1}\n`;
    if (phone2) orderDetails += `Phone 2: ${phone2}\n`;
    orderDetails += `Address: ${address}\n\n`;
    orderDetails += `*Requested Products:*\n`;

    let totalOrderPrice = 0;
    cart.forEach((item, index) => {
    orderDetails += `${index + 1}. ${item.name} (${item.price} EGP)\n`;
      if (item.size && item.size !== 'One Size') orderDetails += `   Size: ${item.size}\n`;
      if (item.color && item.color !== 'Multi') orderDetails += `   Color: ${item.color}\n`;
      totalOrderPrice += item.price;
    });
    orderDetails += `\n*Total: ${totalOrderPrice} EGP*\n\n`;
    orderDetails += `_Ordered at: ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Cairo' })}_`;
    
    // Create order object
    const order = {
      customerName: fullName,
      phone1: phone1,
      phone2: phone2,
      address: address,
      items: cart.map(item => ({
        name: item.name,
        price: item.price,
        size: item.size,
        color: item.color
      })),
      total: totalOrderPrice
    };
    
    try {
      console.log('Sending order to API:', `${API_BASE}/orders`);
      
      // Send order to backend API
      const response = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(order)
      });
      
      console.log('Order API response status:', response.status);
      
      if (response.ok) {
        const savedOrder = await response.json();
        console.log('✓ Order saved successfully:', savedOrder);
        
        // Also save to localStorage as backup
        let ordersData = JSON.parse(localStorage.getItem('ordersData')) || [];
        ordersData.push({...order, date: new Date().toISOString()});
        localStorage.setItem('ordersData', JSON.stringify(ordersData));
        
        showNotification('Your order has been confirmed successfully! We will contact you soon.', true);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Order API error:', response.status, errorData);
        
        // Fallback: Save to localStorage only
        let ordersData = JSON.parse(localStorage.getItem('ordersData')) || [];
        ordersData.push({...order, date: new Date().toISOString()});
        localStorage.setItem('ordersData', JSON.stringify(ordersData));
        
        showNotification('Your order has been saved (offline)! We will contact you soon.', true);
      }
    } catch (error) {
      console.error('Error sending order to API:', error);
      
      // Fallback: Save to localStorage
      let ordersData = JSON.parse(localStorage.getItem('ordersData')) || [];
      ordersData.push({...order, date: new Date().toISOString()});
      localStorage.setItem('ordersData', JSON.stringify(ordersData));
      
      showNotification('Your order has been saved! We will contact you soon.', true);
    }
    
    // Clear cart
    cart = [];
    cartCount = 0;
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartDisplay();
    showPage('home');
    document.getElementById('checkoutForm').reset();
    history.replaceState({ page: 'home' }, '', '#home');
  });
  
  // Wishlist button
  document.getElementById('wishlistBtn').addEventListener('click', function() {
    showPage('wishlist');
    history.pushState({ page: 'wishlist' }, '', '#wishlist');
  });
  
  // Image gallery controls
  document.getElementById('prevImageBtn').addEventListener('click', showPrevImage);
  document.getElementById('nextImageBtn').addEventListener('click', showNextImage);
  
  // Side Menu
  document.getElementById('hamburgerBtn').addEventListener('click', openSideMenu);
  document.getElementById('closeSideMenu').addEventListener('click', closeSideMenu);
  document.getElementById('sideMenuOverlay').addEventListener('click', closeSideMenu);
  
  // Activate "All Products" button
  const allProductsButton = document.querySelector('.filter-button[data-category="all"]');
  if (allProductsButton) {
    allProductsButton.click();
  }
  
  // Handle browser back/forward
  window.addEventListener('popstate', function(event) {
    const productDetailModal = document.getElementById('productDetailModal');
    const cartModal = document.getElementById('cartModal');
    const checkoutPage = document.getElementById('checkoutPage');
    
    if (!productDetailModal.classList.contains('hidden')) {
      closeProductDetailModal();
      if (event.state && event.state.scrollY !== undefined) {
        window.scrollTo(0, event.state.scrollY);
      }
    } else if (!cartModal.classList.contains('hidden')) {
      cartModal.classList.remove('scale-100', 'opacity-100');
      cartModal.classList.add('scale-95', 'opacity-0');
      cartModal.addEventListener('transitionend', function handler() {
        cartModal.classList.add('hidden');
        cartModal.removeEventListener('transitionend', handler);
      }, { once: true });
      if (event.state && event.state.scrollY !== undefined) {
        window.scrollTo(0, event.state.scrollY);
      }
    } else if (checkoutPage.classList.contains('active')) {
      showPage('home');
      const cartModal = document.getElementById('cartModal');
      cartModal.classList.remove('hidden');
      setTimeout(() => {
        cartModal.classList.remove('scale-95', 'opacity-0');
        cartModal.classList.add('scale-100', 'opacity-100');
      }, 10);
      history.pushState({ modal: 'cart', scrollY: previousScrollPosition }, '', '#cart');
    } else if (event.state && event.state.page) {
      showPage(event.state.page);
      if (event.state.page === 'home') {
        initIntersectionObserver();
      }
      if (event.state.scrollY !== undefined) {
        window.scrollTo(0, event.state.scrollY);
      }
    } else {
      showPage('home');
      initIntersectionObserver();
      history.replaceState({ page: 'home' }, '', '#home');
    }
  });
  
  // Initial page load
  const initialHash = window.location.hash.substring(1);
  if (initialHash && document.getElementById(initialHash)) {
    showPage(initialHash);
    if (initialHash === 'home') {
      initIntersectionObserver();
    }
    history.replaceState({ page: initialHash }, '', '#' + initialHash);
  } else {
    showPage('home');
    initIntersectionObserver();
    history.replaceState({ page: 'home' }, '', '#home');
  }
});

// Render Products
function renderProducts() {
  const productsGrid = document.getElementById('productsGrid');
  productsGrid.innerHTML = '';
  
  productsData.forEach(product => {
    const productCard = document.createElement('div');
    productCard.className = 'bg-white rounded-xl shadow-lg overflow-hidden card-hover product-card animate-on-scroll';
    productCard.dataset.id = product.id;
    productCard.dataset.category = product.category;
    productCard.dataset.sizes = product.sizes.join(',');
    productCard.dataset.colors = product.colors.join(',');
    productCard.dataset.available = product.available;
    productCard.dataset.quantity = product.quantity;
    productCard.dataset.mainImage = product.mainImage;
    productCard.dataset.images = JSON.stringify(product.images);
    productCard.dataset.colorImages = JSON.stringify(product.colorImages);
    
    productCard.innerHTML = `
      <div class="relative" onclick="openProductDetailModal(this.closest('.product-card'))">
        <img src="${product.mainImage}" alt="${product.name}" class="w-full h-64 object-cover product-image" />
        <button class="absolute top-4 right-4 p-2 bg-white rounded-full heart-icon" onclick="event.stopPropagation(); toggleWishlist(this)">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
          </svg>
        </button>
      </div>
      <div class="p-6">
        <h3 class="text-lg font-semibold mb-2">${product.name}</h3>
        <p class="product-description">${product.description}</p>
        <div class="flex justify-between items-center">
          <span class="text-xl font-bold">${product.price} EGP</span>
          <button class="bg-blue-300 text-white px-2 py-1 md:px-4 md:py-3 rounded-full hover:bg-blue-400 transition-colors add-to-cart animated-button flex items-center gap-1 justify-center text-xs md:text-base">
            <svg class="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
            </svg>
            View Details
          </button>
        </div>
      </div>
    `;
    
    productsGrid.appendChild(productCard);
  });
  
  initAddToCartListeners();
  initWishlistItems();
}

// Show Page
function showPage(pageId) {
  document.querySelectorAll('.page-section').forEach(section => {
    section.classList.remove('active');
  });
  
  const page = document.getElementById(pageId);
  if (page) {
    page.classList.add('active');
  }
}

// Scroll to products
function scrollToProducts() {
  const productsSection = document.getElementById('productsSection');
  if (productsSection) {
    productsSection.scrollIntoView({ behavior: 'smooth' });
  }
}

// Initialize Intersection Observer
function initIntersectionObserver() {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
      }
    });
  }, observerOptions);
  
  document.querySelectorAll('.animate-on-scroll').forEach(el => {
    observer.observe(el);
  });
}

// Initialize Add to Cart Listeners
function initAddToCartListeners() {
  document.querySelectorAll('.product-card').forEach(card => {
    const addToCartButton = card.querySelector('.add-to-cart');
    if (addToCartButton) {
      addToCartButton.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const productCard = this.closest('.product-card');
        const productAvailable = productCard.dataset.available === 'true';
        
        if (!productAvailable) {
          showNotification('This product is not available currently');
          return;
        }
        
        // Always open product detail modal to allow size/color selection
        openProductDetailModal(productCard);
      });
    }
  });
}

// Add Product to Cart Directly
function addProductToCartDirectly(productCard) {
  const productId = parseInt(productCard.dataset.id);
  const productData = productsData.find(p => p.id === productId);
  
  if (!productData) {
    showNotification('Product not found', false, true);
    return;
  }
  
  const product = {
    name: productData.name,
    price: productData.price,
    image: productData.mainImage || (productData.images && productData.images.length > 0 ? productData.images[0] : ''),
    description: productData.description,
    size: 'One Size',
    color: 'Multi',
    colorImage: null,
    id: Date.now()
  };
  
  cart.push(product);
  cartCount++;
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartDisplay();
  
  const button = productCard.querySelector('.add-to-cart');
  button.classList.add('cart-badge');
  setTimeout(() => {
    button.classList.remove('cart-badge');
  }, 500);

  showNotification('Product added to cart successfully!', true);
}

// Open Product Detail Modal
function openProductDetailModal(productCardElement) {
  const productId = parseInt(productCardElement.dataset.id);
  const product = productsData.find(p => p.id === productId);
  
  if (!product) {
    showNotification('Product details not found', false, true);
    return;
  }
  
  currentProduct = product;
  selectedSize = null;
  selectedColor = null;
  currentImageIndex = 0;
  
  document.getElementById('modalProductName').textContent = currentProduct.name;
  document.getElementById('modalProductDescription').textContent = currentProduct.description;
  document.getElementById('modalProductPrice').textContent = `${currentProduct.price} EGP`;
  
  const availabilityText = currentProduct.available && currentProduct.quantity > 0 ? 'Available' : 'Not Available';
  const availabilityColor = currentProduct.available && currentProduct.quantity > 0 ? 'text-green-500' : 'text-red-500';
  document.getElementById('modalProductAvailability').textContent = availabilityText;
  document.getElementById('modalProductAvailability').className = `text-lg font-bold ${availabilityColor}`;
  
  // Populate sizes
  const sizesContainer = document.getElementById('sizesContainer');
  sizesContainer.innerHTML = '';
  const requiresSizeSelection = currentProduct.sizes.length > 0 && currentProduct.sizes[0] !== 'One Size';
  if (requiresSizeSelection) {
    document.getElementById('modalProductSizes').style.display = 'block';
    currentProduct.sizes.forEach(size => {
      const sizeBtn = document.createElement('button');
      sizeBtn.textContent = size;
      sizeBtn.className = 'px-6 py-3 border border-blue-200 rounded-full text-base text-blue-400 hover:bg-blue-100 transition-colors';
      sizeBtn.addEventListener('click', () => {
        sizesContainer.querySelectorAll('button').forEach(btn => btn.classList.remove('option-selected'));
        sizeBtn.classList.add('option-selected');
        selectedSize = size;
        updateProductDetailModalButtons();
      });
      sizesContainer.appendChild(sizeBtn);
    });
  } else {
    document.getElementById('modalProductSizes').style.display = 'none';
  }
  
  // Populate colors
  const colorsContainer = document.getElementById('colorsContainer');
  colorsContainer.innerHTML = '';
  const requiresColorSelection = currentProduct.colors.length > 0 && currentProduct.colors[0] !== 'Multi';
  if (requiresColorSelection) {
    document.getElementById('modalProductColors').style.display = 'block';
    currentProduct.colors.forEach(color => {
      const colorBtn = document.createElement('button');
      colorBtn.textContent = color;
      colorBtn.className = 'color-option-btn transition-all duration-300 ease-in-out';
      colorBtn.dataset.color = color;
      
          const colorMap = {
            "Black": "#000",
            "Gray": "#808080",
            "Blue": "#0000FF",
            "White": "#FFFFFF",
            "Navy": "#000080",
            "Beige": "#F5F5DC",
            "Green": "#008000",
            "Brown": "#A52A2A",
            "Olive": "#6B8E23",
            "Multi": "#ccc",
            "أسود": "#000000",
            "أبيض": "#FFFFFF",
            "رمادي": "#808080",
            "أزرق": "#0000FF",
            "كحلي": "#000080",
            "بيج": "#F5F5DC",
            "أخضر": "#008000",
            "بني": "#A52A2A",
            "زيتي": "#6B8E23",
            "متعدد": "#ccc",
            "أحمر": "#FF0000"
          };
      colorBtn.style.backgroundColor = colorMap[color] || '#ccc';
      
      if (color === 'White' || color === 'Beige' || color === 'Multi') {
        colorBtn.style.color = '#333';
        colorBtn.style.borderColor = '#ccc';
      }
      
      colorBtn.addEventListener('click', () => {
        colorsContainer.querySelectorAll('button').forEach(btn => btn.classList.remove('option-selected'));
        colorBtn.classList.add('option-selected');
        selectedColor = color;
        
        if (currentProduct.colorImages && currentProduct.colorImages[selectedColor]) {
          document.getElementById('modalProductImage').src = currentProduct.colorImages[selectedColor];
          currentImageIndex = -1;
          updateImageGalleryDisplay();
        } else {
          currentImageIndex = 0;
          updateImageGalleryDisplay();
        }
        updateProductDetailModalButtons();
      });
      colorsContainer.appendChild(colorBtn);
    });
  } else {
    document.getElementById('modalProductColors').style.display = 'none';
  }
  
  updateImageGalleryDisplay();
  populateThumbnails();
  updateProductDetailModalButtons();
  document.getElementById('productDetailModal').classList.remove('hidden');
  previousScrollPosition = window.scrollY;
  history.pushState({ modal: 'productDetail', scrollY: previousScrollPosition }, '', '#productDetail');
}

// Close Product Detail Modal
function closeProductDetailModal() {
  document.getElementById('productDetailModal').classList.add('hidden');
  selectedSize = null;
  selectedColor = null;
  document.querySelectorAll('#sizesContainer button').forEach(btn => btn.classList.remove('option-selected'));
  document.querySelectorAll('#colorsContainer button').forEach(btn => btn.classList.remove('option-selected'));
  
  if (history.state && history.state.modal === 'productDetail') {
    history.back();
  }
}

// Update Image Gallery Display
function updateImageGalleryDisplay() {
  const mainImage = document.getElementById('modalProductImage');
  const imageCounter = document.getElementById('imageCounter');
  const galleryControls = document.querySelector('.product-gallery .gallery-controls');
  const thumbnailsContainer = document.getElementById('galleryThumbnails');
  
  if (!currentProduct) return;
  
  if (selectedColor && currentProduct.colorImages && currentProduct.colorImages[selectedColor]) {
    mainImage.src = currentProduct.colorImages[selectedColor];
    imageCounter.textContent = '';
    galleryControls.style.display = 'none';
    thumbnailsContainer.style.display = 'none';
  } else if (currentProduct.images && currentProduct.images.length > 0) {
    mainImage.src = currentProduct.images[currentImageIndex];
    imageCounter.textContent = `${currentImageIndex + 1} / ${currentProduct.images.length}`;
    
    if (currentProduct.images.length > 1) {
      galleryControls.style.display = 'flex';
      thumbnailsContainer.style.display = 'flex';
    } else {
      galleryControls.style.display = 'none';
      thumbnailsContainer.style.display = 'none';
    }
  } else if (currentProduct.mainImage) {
    // Use the main image if there are no images in the gallery
    mainImage.src = currentProduct.mainImage;
    imageCounter.textContent = '';
    galleryControls.style.display = 'none';
    thumbnailsContainer.style.display = 'none';
  } else {
    mainImage.src = '';
    imageCounter.textContent = '';
    galleryControls.style.display = 'none';
    thumbnailsContainer.style.display = 'none';
  }
  
  thumbnailsContainer.querySelectorAll('.thumbnail').forEach((thumb) => {
    thumb.classList.remove('active');
    if (currentImageIndex !== -1 && thumb.dataset.index === currentImageIndex.toString()) {
      thumb.classList.add('active');
    }
  });
}

// Populate Thumbnails
function populateThumbnails() {
  const thumbnailsContainer = document.getElementById('galleryThumbnails');
  thumbnailsContainer.innerHTML = '';
  
  if (!currentProduct || !currentProduct.images || currentProduct.images.length === 0) {
    thumbnailsContainer.style.display = 'none';
    return;
  }
  
  if (currentProduct.images.length > 1) {
    thumbnailsContainer.style.display = 'flex';
    currentProduct.images.forEach((imageSrc, index) => {
      const thumbnail = document.createElement('img');
      thumbnail.src = imageSrc;
      thumbnail.className = 'thumbnail';
      thumbnail.alt = `Thumbnail ${index + 1}`;
      thumbnail.dataset.index = index;
      thumbnail.addEventListener('click', () => {
        currentImageIndex = index;
        selectedColor = null;
        document.getElementById('colorsContainer').querySelectorAll('button').forEach(btn => btn.classList.remove('option-selected'));
        updateImageGalleryDisplay();
      });
      thumbnailsContainer.appendChild(thumbnail);
    });
  } else {
    thumbnailsContainer.style.display = 'none';
  }
  updateImageGalleryDisplay();
}

// Show Next Image
function showNextImage() {
  if (!currentProduct || !currentProduct.images || currentProduct.images.length === 0) return;
  currentImageIndex = (currentImageIndex + 1) % currentProduct.images.length;
  selectedColor = null;
  document.getElementById('colorsContainer').querySelectorAll('button').forEach(btn => btn.classList.remove('option-selected'));
  updateImageGalleryDisplay();
  updateProductDetailModalButtons();
}

// Show Previous Image
function showPrevImage() {
  if (!currentProduct || !currentProduct.images || currentProduct.images.length === 0) return;
  currentImageIndex = (currentImageIndex - 1 + currentProduct.images.length) % currentProduct.images.length;
  selectedColor = null;
  document.getElementById('colorsContainer').querySelectorAll('button').forEach(btn => btn.classList.remove('option-selected'));
  updateImageGalleryDisplay();
  updateProductDetailModalButtons();
}

// Update Product Detail Modal Buttons
function updateProductDetailModalButtons() {
  const addToCartBtn = document.getElementById('modalAddToCartBtn');
  const requestOrderBtn = document.getElementById('modalRequestOrderBtn');
  
  if (currentProduct.available && currentProduct.quantity > 0) {
    let disableAddToCart = false;
    let buttonText = 'Add to Cart';

    const requiresSizeSelection = currentProduct.sizes.length > 0 && currentProduct.sizes[0] !== 'One Size';
    const requiresColorSelection = currentProduct.colors.length > 0 && currentProduct.colors[0] !== 'Multi';

    if (requiresSizeSelection && !selectedSize) {
      disableAddToCart = true;
      buttonText = 'Select size first';
    } else if (requiresColorSelection && !selectedColor) {
      disableAddToCart = true;
      buttonText = 'Select color first';
    }
    
    addToCartBtn.disabled = disableAddToCart;
    addToCartBtn.textContent = buttonText;
    if (disableAddToCart) {
      addToCartBtn.classList.add('bg-gray-400', 'cursor-not-allowed');
      addToCartBtn.classList.remove('bg-blue-300', 'hover:bg-blue-400');
    } else {
      addToCartBtn.classList.remove('bg-gray-400', 'cursor-not-allowed');
      addToCartBtn.classList.add('bg-blue-300', 'hover:bg-blue-400');
    }
    requestOrderBtn.style.display = 'none';
  } else {
    addToCartBtn.disabled = true;
    addToCartBtn.classList.add('bg-gray-400', 'cursor-not-allowed');
    addToCartBtn.classList.remove('bg-blue-300', 'hover:bg-blue-400');
    addToCartBtn.textContent = 'Not Available';
    requestOrderBtn.style.display = 'block';
  }
}

// Get Category Display Name
function getCategoryName(category) {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

// Initialize Filter Buttons
function initFilterButtons() {
  const filterContainer = document.querySelector('.filter-buttons');
  if (filterContainer) {
    filterContainer.innerHTML = '';

    // Add "All Products" button
    const allButton = document.createElement('button');
    allButton.className = 'filter-button px-6 py-3 rounded-full border active animated-button';
    allButton.dataset.category = 'all';
    allButton.textContent = 'All Products';
    filterContainer.appendChild(allButton);

    // Add category buttons
    categories.forEach(category => {
      const button = document.createElement('button');
      button.className = 'filter-button px-6 py-3 rounded-full border animated-button';
      button.dataset.category = category;
      button.textContent = getCategoryName(category);
      filterContainer.appendChild(button);
    });
  }

  document.querySelectorAll('.filter-button').forEach(button => {
    button.addEventListener('click', function() {
      document.querySelectorAll('.filter-button').forEach(btn => {
        btn.classList.remove('active');
      });
      this.classList.add('active');

      const category = this.dataset.category;
      const products = document.querySelectorAll('.product-card');

      products.forEach(product => {
        if (category === 'all' || product.dataset.category === category) {
          product.style.display = 'block';
        } else {
          product.style.display = 'none';
        }
      });
    });
  });
}

// Toggle Wishlist
function toggleWishlist(heartIcon) {
  const productCard = heartIcon.closest('.product-card');
  const productId = parseInt(productCard.dataset.id);
  const productData = productsData.find(p => p.id === productId);
  
  if (!productData) {
    showNotification('Product not found', false, true);
    return;
  }
  
  const product = {
    name: productData.name,
    price: productData.price,
    image: productData.mainImage || (productData.images && productData.images.length > 0 ? productData.images[0] : ''),
    description: productData.description,
    id: productData.id
  };
  
  const existingIndex = wishlist.findIndex(item => item.id === product.id);
  
  if (existingIndex > -1) {
    wishlist.splice(existingIndex, 1);
    heartIcon.classList.remove('liked');
    showNotification('Product removed from wishlist', false, true);
  } else {
    wishlist.push(product);
    heartIcon.classList.add('liked');
    showNotification('Product added to wishlist!', true);
  }
  
  localStorage.setItem('wishlist', JSON.stringify(wishlist));
  wishlistCount = wishlist.length;
  updateWishlistDisplay();
  updateWishlistPage();
}

// Initialize Wishlist Items
function initWishlistItems() {
  document.querySelectorAll('.heart-icon').forEach(heart => {
    const productCard = heart.closest('.product-card');
    const productId = parseInt(productCard.dataset.id);
    
    if (wishlist.some(item => item.id === productId)) {
      heart.classList.add('liked');
    } else {
      heart.classList.remove('liked');
    }
  });
}

// Update Cart Display
function updateCartDisplay() {
  document.getElementById('cartCount').textContent = cartCount;
  updateCartModal();
}

// Update Wishlist Display
function updateWishlistDisplay() {
  document.getElementById('wishlistCount').textContent = wishlistCount;
}

// Update Cart Modal
function updateCartModal() {
  const cartItemsContainer = document.getElementById('cartItems');
  const cartTotal = document.getElementById('cartTotal');
  
  if (cart.length === 0) {
    cartItemsContainer.innerHTML = '<p class="text-blue-300 text-center">Cart is empty</p>';
    cartTotal.textContent = '0 EGP';
    document.getElementById('proceedToCheckoutBtn').disabled = true;
    document.getElementById('proceedToCheckoutBtn').classList.add('bg-gray-400', 'cursor-not-allowed');
    document.getElementById('proceedToCheckoutBtn').classList.remove('bg-blue-300', 'hover:bg-blue-400');
    return;
  }
  
  cartItemsContainer.innerHTML = '';
  let total = 0;
  
  cart.forEach(item => {
    total += item.price;
    
    const cartItem = document.createElement('div');
    cartItem.className = 'flex items-center justify-between p-4 border border-blue-100 rounded-lg';
    cartItem.innerHTML = `
      <div class="flex items-center space-x-4 space-x-reverse">
        <img src="${item.colorImage || item.image}" alt="${item.name}" class="w-12 h-12 object-cover rounded" />
        <div>
          <h4 class="font-semibold">${item.name}</h4>
          <p>${item.price} EGP</p>
          ${item.size && item.size !== 'One Size' ? `<p class="text-xs">Size: ${item.size}</p>` : ''}
          ${item.color && item.color !== 'Multi' ? `<p class="text-xs">Color: ${item.color}</p>` : ''}
        </div>
      </div>
      <button onclick="removeFromCart(${item.id})" class="text-blue-300 hover:text-blue-400">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
        </svg>
      </button>
    `;
    cartItemsContainer.appendChild(cartItem);
  });
  
  cartTotal.textContent = `${total} EGP`;
  document.getElementById('proceedToCheckoutBtn').disabled = false;
  document.getElementById('proceedToCheckoutBtn').classList.remove('bg-gray-400', 'cursor-not-allowed');
  document.getElementById('proceedToCheckoutBtn').classList.add('bg-blue-300', 'hover:bg-blue-400');
}

// Update Wishlist Page
function updateWishlistPage() {
  const wishlistGrid = document.getElementById('wishlistGrid');
  const emptyWishlist = document.getElementById('emptyWishlist');
  
  if (wishlist.length === 0) {
    wishlistGrid.style.display = 'none';
    emptyWishlist.style.display = 'block';
    return;
  }
  
  wishlistGrid.style.display = 'grid';
  emptyWishlist.style.display = 'none';
  wishlistGrid.innerHTML = '';
  
  wishlist.forEach(item => {
    const wishlistItem = document.createElement('div');
    wishlistItem.className = 'bg-white rounded-xl shadow-lg overflow-hidden card-hover';
    wishlistItem.innerHTML = `
      <div class="relative">
        <img src="${item.image}" alt="${item.description}" class="w-full h-64 object-cover product-image" />
        <button class="absolute top-4 right-4 p-2 bg-white rounded-full heart-icon liked" onclick="removeFromWishlist('${item.id}')">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
          </svg>
        </button>
      </div>
      <div class="p-6">
        <h3 class="text-lg font-semibold text-blue-400 mb-2">${item.name}</h3>
        <p class="product-description">${item.description}</p>
        <div class="flex justify-between items-center">
          <span class="text-xl font-bold text-blue-400">${item.price} EGP</span>
          <button onclick="addToCartFromWishlist('${item.id}')" class="bg-blue-300 text-white px-4 py-2 rounded-full hover:bg-blue-400 transition-colors animated-button">
            Add to Cart
          </button>
        </div>
      </div>
    `;
    wishlistGrid.appendChild(wishlistItem);
  });
}

// Remove from Cart
function removeFromCart(id) {
  cart = cart.filter(item => item.id !== id);
  cartCount = cart.length;
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartDisplay();
  populateCheckoutSummary();
  showNotification('Product removed from cart', false, true);
}

// Remove from Wishlist
function removeFromWishlist(id) {
  wishlist = wishlist.filter(item => item.id !== parseInt(id));
  wishlistCount = wishlist.length;
  localStorage.setItem('wishlist', JSON.stringify(wishlist));
  updateWishlistDisplay();
  updateWishlistPage();
  initWishlistItems();
  showNotification('Product removed from wishlist', false, true);
}

// Add to Cart from Wishlist
function addToCartFromWishlist(id) {
  const item = wishlist.find(item => item.id === parseInt(id));
  
  if (item) {
    const cartItem = {
      ...item,
      id: Date.now()
    };
    
    cart.push(cartItem);
    cartCount++;
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartDisplay();
    showNotification('Product added to cart successfully!', true);
  }
}

// Populate Checkout Summary
function populateCheckoutSummary() {
  const summaryContainer = document.getElementById('checkoutOrderSummary');
  const totalElement = document.getElementById('checkoutTotal').querySelector('span:last-child');
  let total = 0;
  
  summaryContainer.innerHTML = '';
  
  if (cart.length === 0) {
    summaryContainer.innerHTML = '<p class="text-blue-300 text-center">No products in cart</p>';
    totalElement.textContent = '0 EGP';
    return;
  }
  
  cart.forEach(item => {
    total += item.price;
    const itemDiv = document.createElement('div');
    itemDiv.className = 'order-summary-item';
    itemDiv.innerHTML = `
      <img src="${item.colorImage || item.image}" alt="${item.name}" class="w-12 h-12 object-cover rounded" />
      <div class="order-summary-item-details">
        <h4>${item.name}</h4>
        <p>${item.price} EGP</p>
        ${item.size && item.size !== 'One Size' ? `<p class="text-xs">Size: ${item.size}</p>` : ''}
        ${item.color && item.color !== 'Multi' ? `<p class="text-xs">Color: ${item.color}</p>` : ''}
      </div>
      <button onclick="removeFromCart(${item.id})" class="text-blue-300 hover:text-blue-400">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
        </svg>
      </button>
    `;
    summaryContainer.appendChild(itemDiv);
  });
  
  totalElement.textContent = `${total} EGP`;
}

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
      <div class="sub-message">Thank you for shopping with us!</div>
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
  
  const duration = (message === 'Product added to wishlist!' ||
                    message === 'Product removed from wishlist' ||
                    message === 'Product removed from cart' ||
                    message === 'Product added to cart successfully!' ||
                    message === 'Your order has been confirmed successfully! We will contact you soon.') ? 1000 : 4000;
  
  setTimeout(() => {
    notificationItem.classList.remove('show');
    notificationItem.classList.add('hide');
    notificationItem.addEventListener('transitionend', () => {
      notificationItem.remove();
    }, { once: true });
  }, duration);
}

// Side Menu Functions
function openSideMenu() {
  document.getElementById('sideMenu').classList.add('open');
  document.getElementById('sideMenuOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeSideMenu() {
  document.getElementById('sideMenu').classList.remove('open');
  document.getElementById('sideMenuOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

// Scroll to Top Function
function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

// Show/Hide Scroll to Top Button
window.addEventListener('scroll', function() {
  const scrollToTopBtn = document.getElementById('scrollToTopBtn');
  if (window.scrollY > 300) {
    scrollToTopBtn.classList.add('show');
  } else {
    scrollToTopBtn.classList.remove('show');
  }
});

// Initialize Search Function
function initSearchFunction() {
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      const searchTerm = this.value.toLowerCase().trim();
      const products = document.querySelectorAll('.product-card');
      let visibleCount = 0;
      
      products.forEach(product => {
        const productId = product.dataset.id;
        const productData = productsData.find(p => p.id === parseInt(productId));
        
        if (productData) {
          const nameMatch = productData.name.toLowerCase().includes(searchTerm);
          const descMatch = productData.description.toLowerCase().includes(searchTerm);
          const priceMatch = productData.price.toString().includes(searchTerm);
          
          if (searchTerm === '' || nameMatch || descMatch || priceMatch) {
            product.style.display = 'block';
            visibleCount++;
          } else {
            product.style.display = 'none';
          }
        }
      });
      
      // Show message if no results
      const productsGrid = document.getElementById('productsGrid');
      let noResultsMsg = productsGrid.querySelector('.no-results-message');
      
      if (visibleCount === 0 && searchTerm !== '') {
        if (!noResultsMsg) {
          noResultsMsg = document.createElement('div');
          noResultsMsg.className = 'no-results-message col-span-full text-center py-12';
          noResultsMsg.innerHTML = `
            <svg class="w-24 h-24 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <p class="text-xl text-gray-500">No results for search "${searchTerm}"</p>
            <p class="text-gray-400 mt-2">Try other search terms</p>
          `;
          productsGrid.appendChild(noResultsMsg);
        }
      } else if (noResultsMsg) {
        noResultsMsg.remove();
      }
    });
  }
}
