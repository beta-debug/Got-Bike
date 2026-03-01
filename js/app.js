let currentFleet = [];

document.addEventListener('DOMContentLoaded', () => {
  // 1. Listen to Fleet changes in real-time
  db.ref('maycar_fleet').on('value', (snapshot) => {
    const data = snapshot.val();
    currentFleet = data ? Object.values(data) : [];
    renderFeaturedCars();
    renderFleetGrid();
  });

  handleRouting();
  updateAuthUI();
  initFleetFilters();

  // 2. Global Event Listeners
  window.addEventListener('hashchange', handleRouting);
  window.addEventListener('scroll', handleScroll);
});

// Routing
function handleRouting() {
  const hash = window.location.hash || '#home';
  const views = document.querySelectorAll('.view');
  const navLinks = document.querySelectorAll('.nav-links a');

  // Hide all views, remove active from nav
  views.forEach(view => view.classList.remove('active'));
  navLinks.forEach(link => link.classList.remove('active'));

  // Show target view
  const targetView = document.querySelector(hash);
  if (targetView) {
    targetView.classList.add('active');
  }

  // Highlight active nav link (if exists)
  const activeLink = document.querySelector(`.nav-links a[href="${hash}"]`);
  if (activeLink) {
    activeLink.classList.add('active');
  }
}

// Scroll Effect for Header
function handleScroll() {
  const header = document.getElementById('header');
  if (window.scrollY > 50) {
    header.classList.add('scrolled');
  } else {
    header.classList.remove('scrolled');
  }
}

// Render Featured Cars
function renderFeaturedCars() {
  const grid = document.getElementById('featured-cars-grid');
  if (!grid) return;

  // Take the first 3 cars as featured
  const featuredCars = currentFleet.slice(0, 3);

  grid.innerHTML = featuredCars.map(car => createVehicleCardHTML(car)).join('');
}

// Reusable Vehicle Card Component
function createVehicleCardHTML(car) {
  return `
    <div class="vehicle-card">
      <div class="vehicle-img-wrapper">
        <span class="vehicle-category">${car.categoryLabel}</span>
        <img src="${car.image}" alt="${car.name}" class="vehicle-img">
      </div>
      <div class="vehicle-info">
        <h3 class="vehicle-name">${car.name}</h3>
        <div class="vehicle-specs">
          <div class="vehicle-spec"><i class="fa-solid fa-user-group"></i> ${car.seats} ที่นั่ง</div>
          <div class="vehicle-spec"><i class="fa-solid fa-gears"></i> ${car.transmission}</div>
        </div>
        <div class="vehicle-footer">
          <div class="vehicle-price">฿${car.pricePerDay.toLocaleString()}<span>/วัน</span></div>
          <button class="btn btn-primary" style="padding: 0.5rem 1rem;" onclick="startBooking('${car.id}')">จองรถ</button>
        </div>
      </div>
    </div>
  `;
}

// Global function for booking action
window.startBooking = function (carId) {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

  if (!isLoggedIn) {
    toggleModal('loginModal');
    return;
  }

  // Find car data from current fleet
  const car = currentFleet.find(c => c.id === carId);
  if (!car) return;

  // Reset Modal State
  document.getElementById('booking-step-1').style.display = 'block';
  document.getElementById('booking-step-2').style.display = 'none';
  document.getElementById('booking-step-3').style.display = 'none';

  document.getElementById('step-1-indicator').className = 'step-indicator active';
  document.getElementById('step-2-indicator').className = 'step-indicator';
  document.getElementById('step-2-indicator').style.color = 'var(--text-secondary)';

  document.getElementById('booking-modal-title').innerText = 'ยืนยันการจองรถ';

  // Populate Data
  document.getElementById('booking-car-id').value = car.id;
  document.getElementById('booking-car-img').src = car.image;
  document.getElementById('booking-car-name').innerText = car.name;
  document.getElementById('booking-car-price').innerText = car.pricePerDay.toLocaleString();

  // Set default dates (Today to Tomorrow)
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Format for datetime-local: YYYY-MM-DDThh:mm
  const formatDate = (date) => {
    return date.getFullYear() + '-' +
      String(date.getMonth() + 1).padStart(2, '0') + '-' +
      String(date.getDate()).padStart(2, '0') + 'T' +
      String(date.getHours()).padStart(2, '0') + ':' +
      String(date.getMinutes()).padStart(2, '0');
  };

  document.getElementById('b-pickup').value = formatDate(now);
  document.getElementById('b-return').value = formatDate(tomorrow);
  document.getElementById('b-delivery').value = 'store';

  // Pre-fill user data if logged in
  if (isLoggedIn) {
    document.getElementById('b-phone').value = localStorage.getItem('userPhone') || '';
    document.getElementById('b-id-card').value = localStorage.getItem('userIdCard') || '';
    document.getElementById('b-permanent-address').value = localStorage.getItem('userPermanentAddress') || '';
  }

  toggleAddressField();
  calculateBookingTotal();

  toggleModal('bookingModal');
};

// Form interactions
window.toggleAddressField = function () {
  const method = document.getElementById('b-delivery').value;
  const addrGroup = document.getElementById('address-group');
  const bAddress = document.getElementById('b-address');

  if (method === 'delivery') {
    addrGroup.style.display = 'block';
    bAddress.required = true;
  } else {
    addrGroup.style.display = 'none';
    bAddress.required = false;
    bAddress.value = '';
  }
};

window.calculateBookingTotal = function () {
  const pickup = new Date(document.getElementById('b-pickup').value);
  const dropoff = new Date(document.getElementById('b-return').value);
  const carPriceText = document.getElementById('booking-car-price').innerText.replace(/,/g, '');
  const pricePerDay = parseFloat(carPriceText);

  // Default to at least 1 day if dates are invalid or same day
  let diffDays = 1;
  if (!isNaN(pickup.getTime()) && !isNaN(dropoff.getTime())) {
    const diffTime = Math.abs(dropoff - pickup);
    diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) diffDays = 1;
  }

  const deliveryMethod = document.getElementById('b-delivery').value;
  const deliveryFee = deliveryMethod === 'delivery' ? 500 : 0;

  const carTotal = diffDays * pricePerDay;
  const grandTotal = carTotal + deliveryFee;

  // Update UI
  document.getElementById('summary-days').innerText = diffDays;
  document.getElementById('summary-car-total').innerText = carTotal.toLocaleString();

  const deliveryRow = document.getElementById('summary-delivery-row');
  if (deliveryFee > 0) {
    deliveryRow.style.display = 'flex';
    document.getElementById('summary-delivery-fee').innerText = deliveryFee.toLocaleString();
  } else {
    deliveryRow.style.display = 'none';
  }

  document.getElementById('summary-total').innerText = grandTotal.toLocaleString();
  document.getElementById('payment-total').innerText = grandTotal.toLocaleString();
};

window.goToPaymentStep = function (e) {
  e.preventDefault();

  // Load payment settings from Firebase
  db.ref('maycar_payment_settings').once('value').then((snapshot) => {
    const settings = snapshot.val();
    if (settings) {
      document.getElementById('qr-payment-img').src = settings.qrUrl || '';
      document.getElementById('bank-acc-info').innerHTML = `
                <strong>${settings.bankName || ''}</strong><br>
                ชื่อบัญชี: ${settings.accountName || ''}<br>
                เลขที่: ${settings.accountNumber || ''}
            `;
    } else {
      document.getElementById('bank-acc-info').innerHTML = 'ไม่พบข้อมูลบัญชี กรุณาติดต่อแอดมิน';
    }
  });

  const step1 = document.getElementById('booking-step-1');
  if (step1) step1.style.display = 'none';
  const step2 = document.getElementById('booking-step-2');
  if (step2) step2.style.display = 'block';

  // Update indicators if they exist
  const ind1 = document.getElementById('step-1-indicator');
  if (ind1) {
    ind1.className = 'step-indicator';
    ind1.style.color = 'var(--text-secondary)';
  }

  const ind2 = document.getElementById('step-2-indicator');
  if (ind2) {
    ind2.className = 'step-indicator active';
    ind2.style.color = 'var(--text-primary)';
  }
};

window.goToDetailsStep = function () {
  document.getElementById('booking-step-2').style.display = 'none';
  document.getElementById('booking-step-1').style.display = 'block';

  document.getElementById('step-2-indicator').className = 'step-indicator';
  document.getElementById('step-2-indicator').style.color = 'var(--text-secondary)';

  const step1 = document.getElementById('step-1-indicator');
  step1.className = 'step-indicator active';
  step1.style.color = 'var(--text-primary)';
};

window.confirmPayment = function (e) {
  e.preventDefault();

  const carId = document.getElementById('booking-car-id').value;
  const carName = document.getElementById('booking-car-name').innerText;
  const total = document.getElementById('summary-total').innerText;
  const customerName = localStorage.getItem('userName') || 'User';
  const slipFile = document.getElementById('b-slip').files[0];

  const proceedWithBooking = (slipDataUrl) => {
    // 1. Create Notification for Admin (Firebase)
    const newNotif = {
      id: 'n' + Date.now(),
      title: 'มีการจองและชำระเงินใหม่',
      message: `คุณ ${customerName} ได้จองและอัปโหลดสลิปชำระเงิน ${carName} ยอด ${total} บาท`,
      timestamp: Date.now(),
      isRead: false
    };

    db.ref('maycar_notifications').child(newNotif.id).set(newNotif);

    // 2. Save Booking for User Dashboard (Firebase)
    const bPickup = document.getElementById('b-pickup').value;
    const bReturn = document.getElementById('b-return').value;
    const carImg = document.getElementById('booking-car-img').src;

    const idCard = document.getElementById('b-id-card').value;
    const phone = document.getElementById('b-phone').value;
    const permAddr = document.getElementById('b-permanent-address').value;
    const deliveryAddr = document.getElementById('b-address').value;
    const mapLink = document.getElementById('b-map-link').value;
    const rentalDaysLabel = document.getElementById('summary-days') ? document.getElementById('summary-days').innerText : '1';
    const email = localStorage.getItem('userName') || '';
    const fullName = localStorage.getItem('userFullName') || customerName;

    const newBooking = {
      id: 'BKG-' + Math.floor(10000 + Math.random() * 90000),
      carId: carId,
      carName: carName,
      carImage: carImg,
      pickupDate: bPickup,
      returnDate: bReturn,
      customerName: fullName,
      customerEmail: email,
      customerPhone: phone,
      customerIdCard: idCard,
      customerPermAddr: permAddr,
      deliveryAddr: deliveryAddr,
      mapLink: mapLink,
      totalAmount: total.replace(/,/g, ''),
      status: 'รอยืนยัน',
      paymentSlip: slipDataUrl, // Store Base64 string
      bookingDate: new Date().toISOString()
    };

    // Save to Firebase
    db.ref('maycar_bookings').child(newBooking.id).set(newBooking).then(() => {
      // 3. Send LINE Messaging API (Flex Message) using settings from Firebase
      db.ref('maycar_payment_settings').once('value').then((snapshot) => {
        const settings = snapshot.val();
        if (settings && settings.lineAccessToken && settings.lineUserId) {
          const flexData = {
            ...newBooking,
            rentalDays: rentalDaysLabel,
            total: total
          };
          sendLineFlexMessage(flexData, settings.lineAccessToken, settings.lineUserId);
        }
      });

      // Show Success Step
      document.getElementById('booking-modal-title').style.display = 'none';
      document.getElementById('booking-steps').style.display = 'none';
      document.getElementById('booking-step-2').style.display = 'none';
      document.getElementById('booking-step-3').style.display = 'block';
    });
  };

  if (slipFile) {
    const reader = new FileReader();
    reader.onload = function (event) {
      proceedWithBooking(event.target.result);
    };
    reader.readAsDataURL(slipFile);
  } else {
    proceedWithBooking(null);
  }
};

// Modal Logic
window.toggleModal = function (modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.toggle('active');
  }
};

window.switchModal = function (closeId, openId) {
  const closeEl = document.getElementById(closeId);
  const openEl = document.getElementById(openId);

  if (closeEl) closeEl.classList.remove('active');
  if (openEl) openEl.classList.add('active');
};

// Auth Form Handlers
window.handleLogin = function (e) {
  e.preventDefault();
  // Mock login success
  localStorage.setItem('isLoggedIn', 'true');
  localStorage.setItem('userName', document.getElementById('login-email').value);

  updateAuthUI();
  toggleModal('loginModal');
  alert('เข้าสู่ระบบสำเร็จ!');
};

window.handleRegister = function (e) {
  e.preventDefault();
  const fullName = document.getElementById('reg-name').value;
  const email = document.getElementById('reg-email').value;

  // Mock register success and auto login
  localStorage.setItem('isLoggedIn', 'true');
  localStorage.setItem('userName', email);
  localStorage.setItem('userFullName', fullName);
  localStorage.setItem('userPhone', document.getElementById('reg-phone').value);
  localStorage.setItem('userIdCard', document.getElementById('reg-id-card').value);
  localStorage.setItem('userPermanentAddress', document.getElementById('reg-permanent-address').value);

  updateAuthUI();
  toggleModal('registerModal');
  alert('สมัครสมาชิกสำเร็จ!');
};

window.handleLogout = function () {
  localStorage.removeItem('isLoggedIn');
  localStorage.removeItem('userName');
  localStorage.removeItem('userFullName');
  localStorage.removeItem('userPhone');
  localStorage.removeItem('userIdCard');
  localStorage.removeItem('userPermanentAddress');
  updateAuthUI();
  alert('ออกจากระบบสำเร็จ');
};

function updateAuthUI() {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  const navActionsContainer = document.querySelector('.nav-actions');

  if (isLoggedIn) {
    const fullName = localStorage.getItem('userFullName');
    const email = localStorage.getItem('userName');
    const displayName = fullName || email.split('@')[0];

    navActionsContainer.innerHTML = `
      <div style="display: flex; align-items: center; gap: 1rem;">
        <span style="color: var(--text-primary); font-weight: 500;"><i class="fa-solid fa-circle-user" style="color: var(--primary); margin-right: 0.5rem;"></i>${displayName}</span>
        <button onclick="navigate('dashboard'); closeMobileMenu();" class="btn btn-outline" style="padding: 0.5rem 1rem; font-size: 0.875rem; border-color: var(--primary); color: var(--primary);">
          ข้อมูลส่วนตัว
        </button>
        <button onclick="handleLogout()" class="btn btn-outline" style="padding: 0.5rem 1rem; font-size: 0.875rem; border-color: #ff5252; color: #ff5252;">
          ออกจากระบบ
        </button>
      </div>
    `;
  } else {
    navActionsContainer.innerHTML = `
      <button onclick="toggleModal('loginModal')" class="btn btn-outline" id="nav-login-btn" style="padding: 0.5rem 1rem; font-size: 0.875rem;">
        <i class="fa-regular fa-user" style="margin-right: 0.5rem;"></i> เข้าสู่ระบบ
      </button>
    `;
  }
}

// Initialization of UI happens in the main DOMContentLoaded listener at top

// ============================================
// Fleet Selection Logic
// ============================================

const categoryFilters = [
  { id: 'all', label: 'ทั้งหมด', icon: 'fa-table-cells' },
  { id: 'airport', label: 'รถรับส่งสนามบิน', icon: 'fa-plane-departure' },
  { id: 'van', label: 'รถตู้นำเที่ยว VIP', icon: 'fa-van-shuttle' },
  { id: 'car', label: 'รถยนต์', icon: 'fa-car' },
  { id: 'ev', label: 'รถไฟฟ้า (EV)', icon: 'fa-charging-station' },
  { id: 'motorcycle', label: 'รถจักรยานยนต์', icon: 'fa-motorcycle' }
];

let currentCategory = 'all';

// Setup Fleet Filters
function initFleetFilters() {
  const filterList = document.getElementById('fleet-filter-list');
  if (!filterList) return;

  filterList.innerHTML = categoryFilters.map(filter => `
        <li>
            <button class="filter-btn ${currentCategory === filter.id ? 'active' : ''}" 
                    onclick="filterFleet('${filter.id}')" 
                    id="filter-btn-${filter.id}">
                <i class="fa-solid ${filter.icon} filter-icon" style="color: ${currentCategory === filter.id ? 'var(--primary)' : 'var(--text-secondary)'}"></i>
                ${filter.label}
            </button>
        </li>
    `).join('');
}

// Global Filter function
window.filterFleet = function (categoryId) {
  currentCategory = categoryId;

  // Update active visual state for buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active');
    // Reset icon color
    const icon = btn.querySelector('.filter-icon');
    if (icon) icon.style.color = 'var(--text-secondary)';
  });

  const activeBtn = document.getElementById(`filter-btn-${categoryId}`);
  if (activeBtn) {
    activeBtn.classList.add('active');
    const icon = activeBtn.querySelector('.filter-icon');
    if (icon) icon.style.color = 'var(--primary)';
  }

  renderFleetGrid();
};

// Render the Fleet Grid based on active filter
function renderFleetGrid() {
  const grid = document.getElementById('fleet-cars-grid');
  const countDisplay = document.getElementById('fleet-count');
  if (!grid) return;

  // Filter logic using currentFleet from Firebase
  const filteredCars = currentCategory === 'all'
    ? currentFleet
    : currentFleet.filter(car => car.category === currentCategory);

  // Update Count
  if (countDisplay) {
    countDisplay.innerText = `พบรถ ${filteredCars.length} คัน`;
  }

  // Render HTML
  if (filteredCars.length > 0) {
    grid.innerHTML = filteredCars.map(car => createVehicleCardHTML(car)).join('');
  } else {
    grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 4rem; background: var(--bg-white); border-radius: 12px; border: 1px dashed var(--surface-border);">
                <i class="fa-solid fa-car-side fa-3x" style="color: #cbd5e1; margin-bottom: 1rem;"></i>
                <h3 style="color: var(--text-secondary); margin-top: 1rem;">ขออภัย ไม่พบรถในหมวดหมู่นี้</h3>
            </div>
        `;
  }
}

// Helper function to navigate to a section programmatically
window.navigate = function (hash) {
  if (!hash.startsWith('#')) hash = '#' + hash;
  window.location.hash = hash;
};

// ============================================
// User Dashboard Logic
// ============================================

let currentDashboardFilter = 'all';

window.filterBookings = function (filter, btn) {
  currentDashboardFilter = filter;

  // Update UI tabs
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');

  renderDashboard();
};

window.renderDashboard = function () {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  const guestState = document.getElementById('dashboard-guest-state');
  const userState = document.getElementById('dashboard-user-state');

  if (!guestState || !userState) return;

  if (!isLoggedIn) {
    guestState.style.display = 'block';
    userState.style.display = 'none';
    return;
  }

  guestState.style.display = 'none';
  userState.style.display = 'block';

  const bookingsList = document.getElementById('user-bookings-list');
  const emptyState = document.getElementById('empty-bookings');
  const userEmail = localStorage.getItem('userName');

  // Listen to bookings in real-time or just once? Let's use real-time for dashboard
  db.ref('maycar_bookings').on('value', (snapshot) => {
    const allBookings = snapshot.val() ? Object.values(snapshot.val()) : [];
    let bookings = allBookings.filter(b => b.customerEmail === userEmail);

    // Apply filtering
    if (currentDashboardFilter === 'pending') {
      bookings = bookings.filter(b => b.status === 'รอยืนยัน' || b.status === 'ยืนยันแล้ว' || b.status === 'กำลังใช้งาน');
    } else if (currentDashboardFilter === 'history') {
      bookings = bookings.filter(b => b.status === 'เสร็จสิ้น' || b.status === 'ยกเลิก');
    }

    if (bookings.length === 0) {
      emptyState.style.display = 'block';
      // Clear any existing booking cards except the empty state
      Array.from(bookingsList.children).forEach(child => {
        if (child.id !== 'empty-bookings') child.remove();
      });
    } else {
      emptyState.style.display = 'none';

      const formatDisplayDate = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      };

      const getStatusColor = (status) => {
        switch (status) {
          case 'รอยืนยัน': return '#f59e0b'; // Amber
          case 'ยืนยันแล้ว': return '#10b981'; // Green
          case 'กำลังใช้งาน': return '#3b82f6'; // Blue
          case 'เสร็จสิ้น': return '#6b7280'; // Gray
          case 'ยกเลิก': return '#ef4444'; // Red
          default: return '#6b7280';
        }
      };

      const bookingsHTML = bookings.map(b => `
            <div class="dashboard-card">
                <div class="card-img-wrapper">
                    <img src="${b.carImage}" alt="${b.carName}">
                </div>
                <div class="card-info">
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <span class="status-label" style="background: ${getStatusColor(b.status)}15; color: ${getStatusColor(b.status)}; border: 1px solid ${getStatusColor(b.status)}30;">
                            ${b.status}
                        </span>
                        <span style="font-size: 0.8rem; color: #94a3b8; font-weight: 500;">คิวอาร์เมอร์: ${b.id}</span>
                    </div>
                    <h3 style="margin: 0; font-size: 1.4rem; color: #1e293b;">${b.carName}</h3>
                    <div class="card-meta">
                        <div><i class="fa-regular fa-calendar-check"></i> รับรถ: ${formatDisplayDate(b.pickupDate)}</div>
                        <div><i class="fa-regular fa-calendar-xmark"></i> คืนรถ: ${formatDisplayDate(b.returnDate)}</div>
                    </div>
                </div>
                <div class="card-price-col">
                    <span style="font-size: 0.875rem; color: #64748b; font-weight: 500;">ยอดรวมสุทธิ</span>
                    <span style="font-size: 1.75rem; font-weight: 800; color: var(--primary); margin-bottom: 0.5rem;">฿${parseInt(b.totalAmount).toLocaleString()}</span>
                    <button class="btn btn-outline" style="border-radius: 8px; font-weight: 600;">ดูใบเสร็จ</button>
                </div>
            </div>
        `).join('');

      // Remove old cards
      Array.from(bookingsList.children).forEach(child => {
        if (child.id !== 'empty-bookings') child.remove();
      });

      // Insert new cards
      bookingsList.insertAdjacentHTML('afterbegin', bookingsHTML);
    }
  });
};

// Update handleRouting to trigger Dashboard render
const originalHandleRouting = handleRouting;
window.handleRouting = function () {
  originalHandleRouting();
  const hash = window.location.hash || '#home';
  if (hash === '#dashboard') {
    renderDashboard();
  }
};

// Update auth handlers to refresh dashboard
const originalHandleLogin = window.handleLogin;
window.handleLogin = function (e) {
  originalHandleLogin(e);
  if (window.location.hash === '#dashboard') renderDashboard();
};

const originalHandleLogout = window.handleLogout;
window.handleLogout = function () {
  originalHandleLogout();
  if (window.location.hash === '#dashboard') renderDashboard();
};

// Mobile Menu Logic
window.toggleMobileMenu = function () {
  const navContent = document.getElementById('nav-content');
  const menuBtn = document.getElementById('mobile-menu-btn');
  const icon = menuBtn.querySelector('i');

  navContent.classList.toggle('active');

  if (navContent.classList.contains('active')) {
    icon.classList.replace('fa-bars', 'fa-xmark');
    document.body.style.overflow = 'hidden'; // Prevent scrolling
  } else {
    icon.classList.replace('fa-xmark', 'fa-bars');
    document.body.style.overflow = 'auto';
  }
};

window.closeMobileMenu = function () {
  const navContent = document.getElementById('nav-content');
  const menuBtn = document.getElementById('mobile-menu-btn');
  const icon = menuBtn.querySelector('i');

  if (navContent.classList.contains('active')) {
    navContent.classList.remove('active');
    icon.classList.replace('fa-xmark', 'fa-bars');
    document.body.style.overflow = 'auto';
  }
};

// Utility: LINE Messaging API
async function sendLineFlexMessage(data, token, userId) {
  const proxies = [
    "https://corsproxy.io/?",
    "https://api.allorigins.win/raw?url=",
    "https://thingproxy.freeboard.io/fetch/"
  ];
  const apiUrl = "https://api.line.me/v2/bot/message/push";

  const flexContents = {
    "type": "bubble",
    "hero": {
      "type": "image",
      "url": data.carImage.startsWith('http') ? data.carImage : "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=800",
      "size": "full",
      "aspectRatio": "20:13",
      "aspectMode": "cover"
    },
    "body": {
      "type": "box",
      "layout": "vertical",
      "contents": [
        { "type": "text", "text": "🔔 มีการจองรถใหม่!", "weight": "bold", "size": "md", "color": "#06C755" },
        {
          "type": "box", "layout": "vertical", "margin": "lg", "spacing": "sm",
          "contents": [
            {
              "type": "box", "layout": "baseline", "spacing": "sm",
              "contents": [
                { "type": "text", "text": "รถยนต์", "color": "#aaaaaa", "size": "xs", "flex": 2 },
                { "type": "text", "text": data.carName, "wrap": true, "color": "#666666", "size": "xs", "flex": 5 }
              ]
            },
            {
              "type": "box", "layout": "baseline", "spacing": "sm",
              "contents": [
                { "type": "text", "text": "ลูกค้า", "color": "#aaaaaa", "size": "xs", "flex": 2 },
                { "type": "text", "text": data.customerName, "wrap": true, "color": "#666666", "size": "xs", "flex": 5 }
              ]
            },
            {
              "type": "box", "layout": "baseline", "spacing": "sm",
              "contents": [
                { "type": "text", "text": "อีเมล", "color": "#aaaaaa", "size": "xs", "flex": 2 },
                { "type": "text", "text": data.customerEmail, "wrap": true, "color": "#666666", "size": "xs", "flex": 5 }
              ]
            },
            {
              "type": "box", "layout": "baseline", "spacing": "sm",
              "contents": [
                { "type": "text", "text": "เบอร์โทร", "color": "#aaaaaa", "size": "xs", "flex": 2 },
                { "type": "text", "text": data.customerPhone, "wrap": true, "color": "#666666", "size": "xs", "flex": 5 }
              ]
            },
            {
              "type": "box", "layout": "baseline", "spacing": "sm",
              "contents": [
                { "type": "text", "text": "บัตร ปชช.", "color": "#aaaaaa", "size": "xs", "flex": 2 },
                { "type": "text", "text": data.customerIdCard, "wrap": true, "color": "#666666", "size": "xs", "flex": 5 }
              ]
            },
            {
              "type": "box", "layout": "baseline", "spacing": "sm",
              "contents": [
                { "type": "text", "text": "ระยะเวลา", "color": "#aaaaaa", "size": "xs", "flex": 2 },
                { "type": "text", "text": data.rentalDays + " วัน", "wrap": true, "color": "#666666", "size": "xs", "flex": 5 }
              ]
            },
            {
              "type": "box", "layout": "baseline", "spacing": "sm",
              "contents": [
                { "type": "text", "text": "ยอดรวม", "color": "#aaaaaa", "size": "xs", "flex": 2 },
                { "type": "text", "text": "฿" + data.total, "wrap": true, "color": "#ff5252", "size": "sm", "flex": 5, "weight": "bold" }
              ]
            }
          ]
        },
        { "type": "separator", "margin": "lg" },
        {
          "type": "box", "layout": "vertical", "margin": "lg", "spacing": "sm",
          "contents": [
            {
              "type": "box", "layout": "baseline", "spacing": "sm",
              "contents": [
                { "type": "text", "text": "📅 รับรถ", "color": "#aaaaaa", "size": "xs", "flex": 2 },
                { "type": "text", "text": data.bPickup, "wrap": true, "color": "#666666", "size": "xs", "flex": 5 }
              ]
            },
            {
              "type": "box", "layout": "baseline", "spacing": "sm",
              "contents": [
                { "type": "text", "text": "📅 คืนรถ", "color": "#aaaaaa", "size": "xs", "flex": 2 },
                { "type": "text", "text": data.bReturn, "wrap": true, "color": "#666666", "size": "xs", "flex": 5 }
              ]
            },
            {
              "type": "box", "layout": "vertical", "margin": "sm",
              "contents": [
                { "type": "text", "text": "ที่อยู่จัดส่งรถ:", "color": "#aaaaaa", "size": "xs", "margin": "md" },
                { "type": "text", "text": data.deliveryAddr || "รับที่สาขา", "wrap": true, "color": "#666666", "size": "xs" }
              ]
            }
          ]
        }
      ]
    },
    "footer": {
      "type": "box",
      "layout": "vertical",
      "spacing": "sm",
      "contents": [
        data.mapLink ? {
          "type": "button",
          "style": "link",
          "height": "sm",
          "action": {
            "type": "uri",
            "label": "เปิด Google Maps",
            "uri": data.mapLink
          }
        } : { "type": "spacer", "size": "xs" }
      ]
    }
  };

  let lastError = "";

  for (const proxy of proxies) {
    try {
      const response = await fetch(proxy + encodeURIComponent(apiUrl), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          to: userId,
          messages: [{
            "type": "flex",
            "altText": "🚗 มีการจองใหม่ - " + data.carName,
            "contents": flexContents
          }]
        })
      });

      if (response.ok) {
        return { success: true };
      } else {
        const errData = await response.json();
        return { success: false, error: `LINE Error: ${errData.message || JSON.stringify(errData)}` };
      }
    } catch (error) {
      console.error(`[DEBUG] Proxy ${proxy} failed:`, error);
      lastError = error.message;
    }
  }

  console.error('[DEBUG] All proxies failed. Last error:', lastError);

  return {
    success: false,
    error: `Network/Proxy Error: ${lastError}\n\nคำแนะนำ:\n1. กรุณาลอง "ปิดโปรแกรมบล็อกโฆษณา (AdBlocker)"\n2. ลองใช้ "อินเทอร์เน็ตจากมือถือ (Hotspot)" แทน WiFi พื้นฐาน\n3. กดปุ่ม F12 บนคีย์บอร์ด แล้วถ่ายรูปหน้าจอที่มีตัวหนังสือสีแดงมาให้ผมดูครับ`
  };
}
