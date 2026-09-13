let currentFleet = [];
let currentSaleFleet = (typeof defaultSaleBikesData !== 'undefined') ? [...defaultSaleBikesData] : [];
let currentSaleDetailBike = null;
let cachedUserBookings = [];

// Local cache of registered users
let localUsersCache = {};
try {
  localUsersCache = JSON.parse(localStorage.getItem('maycar_registered_users') || '{}');
} catch (e) {
  localUsersCache = {};
}

function sanitizeEmailKey(email) {
  return (email || '').toLowerCase().trim().replace(/[.#$[\]]/g, '_');
}

document.addEventListener('DOMContentLoaded', () => {
  // 1. Listen to Fleet changes in real-time
  if (typeof db !== 'undefined' && db) {
    db.ref('maycar_fleet').on('value', (snapshot) => {
      const data = snapshot.val();
      currentFleet = data ? Object.values(data) : [];
      renderFeaturedCars();
      renderFleetGrid();
    });

    // Listen to Sale Fleet in real-time
    db.ref('maycar_sale_fleet').on('value', (snapshot) => {
      const data = snapshot.val();
      if (data) {
        currentSaleFleet = Object.values(data);
      } else if (typeof defaultSaleBikesData !== 'undefined' && defaultSaleBikesData.length > 0) {
        currentSaleFleet = [...defaultSaleBikesData];
        // Seed default sale bikes into Firebase once if empty
        defaultSaleBikesData.forEach(item => {
          db.ref('maycar_sale_fleet').child(item.id).set(item);
        });
      }
      renderFeaturedSaleCars();
      renderSaleFleet();
    });

    // Listen to Registered Users in real-time
    db.ref('maycar_users').on('value', (snapshot) => {
      const val = snapshot.val();
      if (val) {
        localUsersCache = { ...localUsersCache, ...val };
        localStorage.setItem('maycar_registered_users', JSON.stringify(localUsersCache));
      }
    });

    // Listen to Categories in real-time
    db.ref('maycar_categories').on('value', (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const cats = Object.values(data);
        categoryFilters = [
          { id: 'all', label: 'ทั้งหมด', icon: 'fa-table-cells' },
          ...cats.map(c => ({
            id: c.value,
            label: c.label,
            icon: c.icon ? (c.icon.startsWith('fa-') ? c.icon : 'fa-' + c.icon) : 'fa-car'
          }))
        ];
        initFleetFilters();
      }
    });
  }

  handleRouting();
  updateAuthUI();
  initFleetFilters();
  renderFeaturedSaleCars();
  renderSaleFleet();

  // 2. Global Event Listeners
  window.addEventListener('hashchange', () => handleRouting());
  window.addEventListener('scroll', handleScroll);
});

// Routing (unified — directly calls renderDashboard when needed)
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

  // View specific triggers
  if (hash === '#dashboard' && typeof renderDashboard === 'function') {
    renderDashboard();
  } else if (hash === '#sales') {
    renderSaleFleet();
  } else if (hash === '#home') {
    renderFeaturedCars();
    renderFeaturedSaleCars();
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

    db.ref('maycar_notifications').child(newNotif.id).set(newNotif).catch(e => {
      console.error('Firebase Notification Error:', e);
    });

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
            bPickup: newBooking.pickupDate, // Align with sendLineFlexMessage expectations
            bReturn: newBooking.returnDate,
            rentalDays: rentalDaysLabel,
            total: total // This is the formatted string from Step 2
          };

          sendLineFlexMessage(flexData, settings.lineAccessToken, settings.lineUserId)
            .then(result => {
              if (result.success) {
                console.log('LINE Notification sent successfully');
              } else {
                // If it fails on production, show alert to admin/user
                alert('การแจ้งเตือนแอดมินล้มเหลว (LINE API): ' + result.error);
              }
            });
        } else {
          console.warn('LINE Settings not found in Firebase. Notifications skipped.');
          alert('แจ้งเตือนแอดมินล้มเหลว: ไม่พบการตั้งค่า LINE ในระบบ (แอดมินต้องกดบันทึกการตั้งค่าในหน้าจอก่อน)');
        }
      }).catch(err => {
        alert('การแจ้งเตือนแอดมินล้มเหลว (Firebase Read Error): ' + err.message);
      });

      // Show Success Step
      document.getElementById('booking-modal-title').style.display = 'none';
      document.getElementById('booking-steps').style.display = 'none';
      document.getElementById('booking-step-2').style.display = 'none';
      document.getElementById('booking-step-3').style.display = 'block';
    }).catch(err => {
      alert('บันทึกการจองล้มเหลว (Firebase Write Error): ' + err.message);
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

// Auth Form Handlers - Verified Authentication
window.handleLogin = function (e) {
  if (e) e.preventDefault();
  const emailInput = document.getElementById('login-email');
  const passInput = document.getElementById('login-password');
  const email = (emailInput ? emailInput.value : '').toLowerCase().trim();
  const password = passInput ? passInput.value : '';

  if (!email || !password) {
    alert('กรุณากรอกอีเมลและรหัสผ่าน');
    return;
  }

  const userKey = sanitizeEmailKey(email);

  function executeLogin(userData) {
    if (!userData) {
      alert('ไม่พบบัญชีผู้ใช้นี้ในระบบ กรุณาสมัครสมาชิกก่อนเข้าสู่ระบบ');
      switchModal('loginModal', 'registerModal');
      const regEmail = document.getElementById('reg-email');
      if (regEmail) regEmail.value = email;
      return;
    }

    if (userData.password && userData.password !== password) {
      alert('รหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่อีกครั้ง');
      return;
    }

    // Success login
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('userName', userData.email || email);
    localStorage.setItem('userFullName', userData.fullName || '');
    localStorage.setItem('userPhone', userData.phone || '');
    localStorage.setItem('userIdCard', userData.idCard || '');
    localStorage.setItem('userPermanentAddress', userData.permanentAddress || '');

    updateAuthUI();
    toggleModal('loginModal');
    alert(`เข้าสู่ระบบสำเร็จ! ยินดีต้อนรับคุณ ${userData.fullName || email}`);

    if (window.location.hash === '#dashboard' && typeof renderDashboard === 'function') {
      renderDashboard();
    }
  }

  // Check local cache first for instant response
  if (localUsersCache && localUsersCache[userKey]) {
    executeLogin(localUsersCache[userKey]);
    return;
  }

  // Check Firebase Realtime DB
  if (typeof db !== 'undefined' && db) {
    db.ref('maycar_users').child(userKey).once('value').then(snapshot => {
      const val = snapshot.val();
      if (val) {
        localUsersCache[userKey] = val;
        localStorage.setItem('maycar_registered_users', JSON.stringify(localUsersCache));
        executeLogin(val);
      } else {
        executeLogin(null);
      }
    }).catch(err => {
      console.warn('Firebase login lookup error:', err);
      executeLogin(null);
    });
  } else {
    executeLogin(null);
  }
};

window.handleRegister = function (e) {
  if (e) e.preventDefault();
  const fullName = (document.getElementById('reg-name') ? document.getElementById('reg-name').value : '').trim();
  const email = (document.getElementById('reg-email') ? document.getElementById('reg-email').value : '').toLowerCase().trim();
  const password = document.getElementById('reg-password') ? document.getElementById('reg-password').value : '';
  const idCard = (document.getElementById('reg-id-card') ? document.getElementById('reg-id-card').value : '').trim();
  const phone = (document.getElementById('reg-phone') ? document.getElementById('reg-phone').value : '').trim();
  const permanentAddress = (document.getElementById('reg-permanent-address') ? document.getElementById('reg-permanent-address').value : '').trim();

  if (!fullName || !email || !password) {
    alert('กรุณากรอกชื่อ-นามสกุล, อีเมล และรหัสผ่านให้ครบถ้วน');
    return;
  }

  const userKey = sanitizeEmailKey(email);

  // Check if email already registered
  if (localUsersCache && localUsersCache[userKey]) {
    alert('อีเมลนี้เคยลงทะเบียนไว้แล้ว กรุณาเข้าสู่ระบบ');
    switchModal('registerModal', 'loginModal');
    const loginEmailInput = document.getElementById('login-email');
    if (loginEmailInput) loginEmailInput.value = email;
    return;
  }

  const newUser = {
    fullName: fullName,
    email: email,
    password: password,
    idCard: idCard,
    phone: phone,
    permanentAddress: permanentAddress,
    createdAt: Date.now()
  };

  // Save to Firebase
  if (typeof db !== 'undefined' && db) {
    db.ref('maycar_users').child(userKey).set(newUser).catch(err => {
      console.warn('Firebase register save error:', err);
    });
  }

  // Update local cache
  localUsersCache[userKey] = newUser;
  localStorage.setItem('maycar_registered_users', JSON.stringify(localUsersCache));

  // Set active session
  localStorage.setItem('isLoggedIn', 'true');
  localStorage.setItem('userName', email);
  localStorage.setItem('userFullName', fullName);
  localStorage.setItem('userPhone', phone);
  localStorage.setItem('userIdCard', idCard);
  localStorage.setItem('userPermanentAddress', permanentAddress);

  updateAuthUI();
  toggleModal('registerModal');
  alert(`สมัครสมาชิกสำเร็จ! ยินดีต้อนรับคุณ ${fullName}`);

  if (window.location.hash === '#dashboard' && typeof renderDashboard === 'function') {
    renderDashboard();
  }
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

  if (window.location.hash === '#dashboard' && typeof renderDashboard === 'function') {
    renderDashboard();
  }
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

let categoryFilters = [
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
  const userEmail = (localStorage.getItem('userName') || '').trim().toLowerCase();

  // Listen to bookings in real-time
  db.ref('maycar_bookings').on('value', (snapshot) => {
    const rawData = snapshot.val() || {};
    const allBookings = [];
    Object.keys(rawData).forEach(key => {
      const item = rawData[key];
      if (item && typeof item === 'object') {
        allBookings.push({
          ...item,
          id: item.id || key
        });
      }
    });

    cachedUserBookings = allBookings;

    // Filter user's bookings (case-insensitive email matching)
    let bookings = allBookings.filter(b => {
      if (!b.customerEmail || !userEmail) return false;
      return b.customerEmail.trim().toLowerCase() === userEmail;
    });

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
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
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

      const bookingsHTML = bookings.map(b => {
        const bId = b.id || 'BKG-00000';
        const carImg = b.carImage || 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fd?auto=format&fit=crop&q=80&w=800';
        const status = b.status || 'รอยืนยัน';
        const statusColor = getStatusColor(status);
        const rawAmt = parseInt(String(b.totalAmount || 0).replace(/,/g, '')) || 0;

        return `
          <div class="dashboard-card">
              <div class="card-img-wrapper">
                  <img src="${carImg}" alt="${b.carName || 'รถเช่า'}">
              </div>
              <div class="card-info">
                  <div style="display: flex; align-items: center; gap: 0.75rem;">
                      <span class="status-label" style="background: ${statusColor}15; color: ${statusColor}; border: 1px solid ${statusColor}30;">
                          ${status}
                      </span>
                      <span style="font-size: 0.8rem; color: #94a3b8; font-weight: 500;">รหัสการจอง: ${bId}</span>
                  </div>
                  <h3 style="margin: 0; font-size: 1.4rem; color: #1e293b;">${b.carName || 'รถเช่า GOTBIKE'}</h3>
                  <div class="card-meta">
                      <div><i class="fa-regular fa-calendar-check"></i> รับรถ: ${formatDisplayDate(b.pickupDate)}</div>
                      <div><i class="fa-regular fa-calendar-xmark"></i> คืนรถ: ${formatDisplayDate(b.returnDate)}</div>
                  </div>
              </div>
              <div class="card-price-col">
                  <span style="font-size: 0.875rem; color: #64748b; font-weight: 500;">ยอดรวมสุทธิ</span>
                  <span style="font-size: 1.75rem; font-weight: 800; color: var(--primary); margin-bottom: 0.5rem;">฿${rawAmt.toLocaleString()}</span>
                  <button class="btn btn-outline" style="border-radius: 8px; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem;" onclick="showReceipt('${bId}')">
                      <i class="fa-solid fa-receipt"></i> ดูใบเสร็จ
                  </button>
              </div>
          </div>
        `;
      }).join('');

      // Remove old cards
      Array.from(bookingsList.children).forEach(child => {
        if (child.id !== 'empty-bookings') child.remove();
      });

      // Insert new cards
      bookingsList.insertAdjacentHTML('afterbegin', bookingsHTML);
    }
  });
};

// Auth handlers refresh handled inside handleLogin/handleLogout directly

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

  const flexContents = {
    "type": "bubble",
    "hero": {
      "type": "image",
      "url": (data.carImage && data.carImage.startsWith('http')) ? data.carImage : "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=800",
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
                { "type": "text", "text": data.carName || "-", "wrap": true, "color": "#666666", "size": "xs", "flex": 5 }
              ]
            },
            {
              "type": "box", "layout": "baseline", "spacing": "sm",
              "contents": [
                { "type": "text", "text": "ลูกค้า", "color": "#aaaaaa", "size": "xs", "flex": 2 },
                { "type": "text", "text": data.customerName || "-", "wrap": true, "color": "#666666", "size": "xs", "flex": 5 }
              ]
            },
            {
              "type": "box", "layout": "baseline", "spacing": "sm",
              "contents": [
                { "type": "text", "text": "อีเมล", "color": "#aaaaaa", "size": "xs", "flex": 2 },
                { "type": "text", "text": data.customerEmail || "-", "wrap": true, "color": "#666666", "size": "xs", "flex": 5 }
              ]
            },
            {
              "type": "box", "layout": "baseline", "spacing": "sm",
              "contents": [
                { "type": "text", "text": "เบอร์โทร", "color": "#aaaaaa", "size": "xs", "flex": 2 },
                { "type": "text", "text": data.customerPhone || "-", "wrap": true, "color": "#666666", "size": "xs", "flex": 5 }
              ]
            },
            {
              "type": "box", "layout": "baseline", "spacing": "sm",
              "contents": [
                { "type": "text", "text": "บัตร ปชช.", "color": "#aaaaaa", "size": "xs", "flex": 2 },
                { "type": "text", "text": data.customerIdCard || "-", "wrap": true, "color": "#666666", "size": "xs", "flex": 5 }
              ]
            },
            {
              "type": "box", "layout": "baseline", "spacing": "sm",
              "contents": [
                { "type": "text", "text": "ระยะเวลา", "color": "#aaaaaa", "size": "xs", "flex": 2 },
                { "type": "text", "text": (data.rentalDays || "1") + " วัน", "wrap": true, "color": "#666666", "size": "xs", "flex": 5 }
              ]
            },
            {
              "type": "box", "layout": "baseline", "spacing": "sm",
              "contents": [
                { "type": "text", "text": "ยอดรวม", "color": "#aaaaaa", "size": "xs", "flex": 2 },
                { "type": "text", "text": "฿" + (data.total || "0"), "wrap": true, "color": "#ff5252", "size": "sm", "flex": 5, "weight": "bold" }
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
                { "type": "text", "text": data.bPickup || "-", "wrap": true, "color": "#666666", "size": "xs", "flex": 5 }
              ]
            },
            {
              "type": "box", "layout": "baseline", "spacing": "sm",
              "contents": [
                { "type": "text", "text": "📅 คืนรถ", "color": "#aaaaaa", "size": "xs", "flex": 2 },
                { "type": "text", "text": data.bReturn || "-", "wrap": true, "color": "#666666", "size": "xs", "flex": 5 }
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

  const lineMessages = [{
    "type": "flex",
    "altText": "🚗 มีการจองใหม่ - " + (data.carName || "รถเช่า"),
    "contents": flexContents
  }];

  // Method 1: Use Vercel Serverless Function (production)
  try {
    const response = await fetch('/api/line-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: token,
        to: userId,
        messages: lineMessages
      })
    });

    const result = await response.json();

    if (response.ok && result.success) {
      return { success: true };
    } else if (result.error) {
      return { success: false, error: result.error };
    }
    // If API route returns unexpected response, fall through to proxy fallback
  } catch (apiError) {
    console.warn('[LINE] API route /api/line-push failed, trying CORS proxy fallback:', apiError.message);
  }

  // Method 2: Fallback to CORS proxies (for local development)
  const proxies = [
    "https://corsproxy.io/?",
    "https://api.allorigins.win/raw?url=",
    "https://thingproxy.freeboard.io/fetch/"
  ];
  const apiUrl = "https://api.line.me/v2/bot/message/push";

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
          messages: lineMessages
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

  return {
    success: false,
    error: `ส่งข้อความไม่สำเร็จ: ${lastError}\n\nคำแนะนำ:\n1. ตรวจสอบว่า Token และ User ID ถูกต้อง\n2. ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต\n3. หากใช้ Group ID ต้องเชิญบอทเข้ากลุ่มก่อน`
  };
}

// ============================================
// Receipt System
// ============================================

window.showReceipt = function (bookingId) {
  try {
    console.log('[Receipt] showReceipt called with id:', bookingId);
    const modal = document.getElementById('receiptModal');
    if (!modal) {
      console.error('[Receipt] receiptModal element not found in DOM!');
      alert('ระบบใบเสร็จเกิดข้อผิดพลาด กรุณารีเฟรชหน้าเว็บแล้วลองใหม่');
      return;
    }

    // 1. Show modal immediately so user sees instant visual feedback
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    const safeBookingId = String(bookingId || '').trim();

    // 2. Set placeholder ID
    const idEl = document.getElementById('receipt-booking-id');
    if (idEl) idEl.innerText = safeBookingId || 'กำลังโหลด...';

    const populateReceiptUI = (b) => {
      if (!b) return;
      try {
        const formatDate = (dateStr) => {
          if (!dateStr) return '-';
          const d = new Date(dateStr);
          if (isNaN(d.getTime())) return dateStr;
          return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
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

        const statusColor = getStatusColor(b.status || 'รอยืนยัน');

        if (idEl) idEl.innerText = b.id || safeBookingId || 'BKG-00000';

        const imgEl = document.getElementById('receipt-car-img');
        if (imgEl) imgEl.src = b.carImage || 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fd?auto=format&fit=crop&q=80&w=800';

        const nameEl = document.getElementById('receipt-car-name');
        if (nameEl) nameEl.innerText = b.carName || 'รถเช่า GOTBIKE';

        const statusEl = document.getElementById('receipt-status');
        if (statusEl) {
          statusEl.innerText = b.status || 'รอยืนยัน';
          statusEl.style.background = statusColor + '15';
          statusEl.style.color = statusColor;
          statusEl.style.border = '1px solid ' + statusColor + '30';
        }

        const custName = document.getElementById('receipt-customer-name');
        if (custName) custName.innerText = b.customerName || localStorage.getItem('userFullName') || '-';

        const custEmail = document.getElementById('receipt-customer-email');
        if (custEmail) custEmail.innerText = b.customerEmail || localStorage.getItem('userName') || '-';

        const custPhone = document.getElementById('receipt-customer-phone');
        if (custPhone) custPhone.innerText = b.customerPhone || localStorage.getItem('userPhone') || '-';

        const pickupEl = document.getElementById('receipt-pickup');
        if (pickupEl) pickupEl.innerText = formatDate(b.pickupDate);

        const returnEl = document.getElementById('receipt-return');
        if (returnEl) returnEl.innerText = formatDate(b.returnDate);

        const totalEl = document.getElementById('receipt-total');
        if (totalEl) {
          const rawAmt = parseInt(String(b.totalAmount || 0).replace(/,/g, '')) || 0;
          totalEl.innerText = '฿' + rawAmt.toLocaleString();
        }

        console.log('[Receipt] UI populated for booking:', b.id || safeBookingId);
      } catch (err) {
        console.error('[Receipt] Error rendering receipt UI:', err);
      }
    };

    // 3. Populate from cache first if available (instant display)
    let localBooking = (cachedUserBookings || []).find(b => b.id === safeBookingId);
    if (!localBooking && cachedUserBookings && cachedUserBookings.length > 0) {
      localBooking = cachedUserBookings.find(b => String(b.id).includes(safeBookingId) || safeBookingId.includes(String(b.id)));
    }
    if (localBooking) {
      populateReceiptUI(localBooking);
    }

    // 4. Always fetch latest from Firebase
    if (typeof db !== 'undefined' && db && safeBookingId) {
      db.ref('maycar_bookings').child(safeBookingId).once('value').then((snapshot) => {
        const b = snapshot.val();
        if (b) {
          populateReceiptUI({ ...b, id: b.id || safeBookingId });
        } else {
          // If not found by direct key, search through all entries
          db.ref('maycar_bookings').once('value').then(allSnap => {
            const allVal = allSnap.val();
            if (allVal) {
              const match = Object.keys(allVal)
                .map(k => ({ ...allVal[k], id: allVal[k].id || k }))
                .find(item => item.id === safeBookingId);
              if (match) populateReceiptUI(match);
            }
          }).catch(console.warn);
        }
      }).catch((err) => {
        console.error('[Receipt] Firebase fetch error:', err);
      });
    }
  } catch (err) {
    console.error('[Receipt] Unexpected error in showReceipt:', err);
    alert('เกิดข้อผิดพลาดในการเปิดใบเสร็จ: ' + err.message);
  }
};

window.closeReceiptModal = function () {
  const modal = document.getElementById('receiptModal');
  if (modal) modal.classList.remove('active');
  document.body.style.overflow = '';
};

window.printReceipt = function () {
  window.print();
};

// Customer Direct Contact Form Handler
window.submitContactForm = function (e) {
  e.preventDefault();
  const name = (document.getElementById('cf-name') ? document.getElementById('cf-name').value : '').trim();
  const phone = (document.getElementById('cf-phone') ? document.getElementById('cf-phone').value : '').trim();
  const email = (document.getElementById('cf-email') ? document.getElementById('cf-email').value : '').trim();
  const subject = document.getElementById('cf-subject') ? document.getElementById('cf-subject').value : 'ติดต่อทั่วไป';
  const message = (document.getElementById('cf-message') ? document.getElementById('cf-message').value : '').trim();

  if (!name || !phone || !message) {
    alert('กรุณากรอกข้อมูลสำคัญให้ครบถ้วน (ชื่อ, เบอร์โทรศัพท์, และข้อความ)');
    return;
  }

  const newMsg = {
    id: 'msg_' + Date.now(),
    customerName: name,
    customerPhone: phone,
    customerEmail: email || '-',
    subject: subject,
    message: message,
    timestamp: Date.now(),
    isRead: false
  };

  // Push to Firebase Realtime DB
  if (typeof db !== 'undefined' && db) {
    db.ref('maycar_contact_messages').child(newMsg.id).set(newMsg).catch(console.error);

    // Create Notification for Admin
    const notif = {
      id: 'n' + Date.now(),
      title: 'มีข้อความติดต่อใหม่จากลูกค้า',
      message: `คุณ ${name} (${phone}) เรื่อง: ${subject}`,
      timestamp: Date.now(),
      isRead: false
    };
    db.ref('maycar_notifications').child(notif.id).set(notif).catch(console.error);
  }

  alert('ขอบคุณสำหรับการติดต่อ! ทีมงาน GOTBIKE ได้รับข้อความของคุณเรียบร้อยแล้ว และจะติดต่อกลับโดยเร็วที่สุด');
  e.target.reset();
};

// ============================================
// Chat System (Customer Side - Supports Both User & Guest)
// ============================================

let chatListener = null;
let chatWidgetOpen = false;

function getChatUserInfo() {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  if (isLoggedIn) {
    const email = localStorage.getItem('userName') || 'user@gotbike.com';
    const name = localStorage.getItem('userFullName') || email.split('@')[0];
    return {
      email: email,
      name: name,
      chatKey: email.replace(/[.#$[\]]/g, '_'),
      isGuest: false
    };
  }

  let guestId = localStorage.getItem('gotbike_guest_id');
  if (!guestId) {
    guestId = 'guest_' + Math.floor(100000 + Math.random() * 900000);
    localStorage.setItem('gotbike_guest_id', guestId);
  }
  let guestName = localStorage.getItem('gotbike_guest_name') || 'ลูกค้า (Guest #' + guestId.slice(-4) + ')';
  return {
    email: guestId + '@guest.gotbike',
    name: guestName,
    chatKey: guestId,
    isGuest: true
  };
}

window.toggleChatWidget = function () {
  const widget = document.getElementById('chat-widget');
  const fab = document.getElementById('chat-fab');
  chatWidgetOpen = !chatWidgetOpen;

  if (chatWidgetOpen) {
    if (widget) widget.classList.add('active');
    if (fab) fab.style.display = 'none';
    initChatWidget();
  } else {
    if (widget) widget.classList.remove('active');
    if (fab) fab.style.display = 'flex';
  }
};

function initChatWidget() {
  const userInfo = getChatUserInfo();
  const loginRequired = document.getElementById('chat-login-required');
  const inputForm = document.getElementById('chat-input-form');

  if (inputForm) inputForm.style.display = 'flex';

  if (loginRequired) {
    if (userInfo.isGuest) {
      loginRequired.style.display = 'block';
      loginRequired.innerHTML = '<p style="margin:0; font-size:0.75rem;">สนทนาในฐานะผู้เยี่ยมชม | <a href="#" onclick="toggleModal(\'loginModal\'); toggleChatWidget();">เข้าสู่ระบบ</a> เพื่อเก็บประวัติ</p>';
    } else {
      loginRequired.style.display = 'none';
    }
  }

  loadChatMessages();
}

function loadChatMessages() {
  const userInfo = getChatUserInfo();
  const chatKey = userInfo.chatKey;
  const messagesContainer = document.getElementById('chat-messages');
  if (!messagesContainer) return;

  if (chatListener) {
    db.ref('maycar_chats/' + chatKey + '/messages').off('value', chatListener);
  }

  chatListener = db.ref('maycar_chats/' + chatKey + '/messages').on('value', (snapshot) => {
    const messages = snapshot.val() ? Object.values(snapshot.val()) : [];
    messages.sort((a, b) => a.timestamp - b.timestamp);

    if (messages.length === 0) {
      messagesContainer.innerHTML = `
        <div class="chat-welcome-msg">
          <div class="chat-avatar-lg"><i class="fa-solid fa-robot"></i></div>
          <p>สวัสดีครับ! 👋<br>มีข้อสงสัยหรือต้องการสอบถามข้อมูลรถเช่า พิมพ์ข้อความหาแอดมินได้เลยครับ</p>
        </div>
      `;
      return;
    }

    messagesContainer.innerHTML = messages.map(msg => `
      <div class="chat-bubble ${msg.sender === 'admin' ? 'admin' : 'user'}">
        ${escapeHtml(msg.text)}
        <div class="chat-bubble-time">${formatChatTime(msg.timestamp)}</div>
      </div>
    `).join('');

    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    messages.forEach(msg => {
      if (msg.sender === 'admin' && !msg.readByUser) {
        db.ref('maycar_chats/' + chatKey + '/messages/' + msg.id).update({ readByUser: true });
      }
    });
  });
}

window.sendChatMessage = function (e) {
  if (e) e.preventDefault();
  const input = document.getElementById('chat-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;

  const userInfo = getChatUserInfo();
  const chatKey = userInfo.chatKey;
  const msgId = 'msg_' + Date.now();

  const message = {
    id: msgId,
    text: text,
    sender: 'user',
    senderName: userInfo.name,
    senderEmail: userInfo.email,
    timestamp: Date.now(),
    readByAdmin: false,
    readByUser: true
  };

  db.ref('maycar_chats/' + chatKey + '/messages/' + msgId).set(message);

  db.ref('maycar_chats/' + chatKey + '/info').set({
    userEmail: userInfo.email,
    userName: userInfo.name,
    lastMessage: text,
    lastTimestamp: Date.now(),
    hasUnreadAdmin: true
  });

  input.value = '';
  input.focus();
};

function formatChatTime(timestamp) {
  const d = new Date(timestamp);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'เมื่อสักครู่';
  if (diffMins < 60) return diffMins + ' นาทีที่แล้ว';

  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  }

  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) + ' ' +
    d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

// Listen for unread admin messages to show badge on FAB
(function initChatBadgeListener() {
  const checkBadge = () => {
    const userInfo = getChatUserInfo();
    const chatKey = userInfo.chatKey;

    db.ref('maycar_chats/' + chatKey + '/messages').on('value', (snapshot) => {
      const messages = snapshot.val() ? Object.values(snapshot.val()) : [];
      const unread = messages.filter(m => m.sender === 'admin' && !m.readByUser);
      const badge = document.getElementById('chat-fab-badge');
      if (badge) {
        if (unread.length > 0 && !chatWidgetOpen) {
          badge.style.display = 'flex';
          badge.innerText = unread.length > 9 ? '9+' : unread.length;
        } else {
          badge.style.display = 'none';
        }
      }
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkBadge);
  } else {
    checkBadge();
  }
})();

// ============================================
// Sale Bikes Management & Presentation Logic
// ============================================

function renderFeaturedSaleCars() {
  const grid = document.getElementById('featured-sales-grid');
  if (!grid) return;

  const featured = currentSaleFleet.filter(b => b.isFeatured !== false);
  const displayItems = (featured.length > 0 ? featured : currentSaleFleet).slice(0, 3);

  if (displayItems.length === 0) {
    grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-secondary);">ยังไม่มีรายการรถขายแนะนำในขณะนี้</div>`;
    return;
  }

  grid.innerHTML = displayItems.map(bike => createSaleCardHTML(bike)).join('');
}

function renderSaleFleet() {
  const grid = document.getElementById('sale-cars-grid');
  const countEl = document.getElementById('sale-count-num');
  if (!grid) return;

  if (countEl) countEl.textContent = currentSaleFleet.length;

  if (currentSaleFleet.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 4rem 2rem; background: var(--bg-white); border-radius: 16px; border: 2px dashed #e2e8f0;">
        <i class="fa-solid fa-motorcycle fa-3x" style="color: #cbd5e1; margin-bottom: 1rem;"></i>
        <h3 style="color: var(--text-primary); margin-bottom: 0.5rem;">ยังไม่มีรายการรถขายในขณะนี้</h3>
        <p style="color: var(--text-secondary); margin: 0;">กรุณากลับมาตรวจสอบใหม่อีกครั้ง หรือติดต่อสอบถามแอดมิน</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = currentSaleFleet.map(bike => createSaleCardHTML(bike)).join('');
}

function createSaleCardHTML(bike) {
  const images = (bike.images && Array.isArray(bike.images) && bike.images.length > 0)
    ? bike.images
    : [bike.image || 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&q=80&w=800'];
  const mainImg = images[0];
  const cashPrice = parseInt(bike.priceCash || 0).toLocaleString();
  const downPayment = parseInt(bike.downPayment || 0).toLocaleString();
  const downText = parseInt(bike.downPayment || 0) === 0 ? 'ฟรีดาวน์' : `ดาวน์ ฿${downPayment}`;
  const detailsSnippet = (bike.details || '').length > 75 ? (bike.details.substring(0, 75) + '...') : (bike.details || '');

  return `
    <div class="sale-card" onclick="openSaleDetailModal('${bike.id}')">
      <div class="sale-img-wrapper">
        <span class="sale-badge"><i class="fa-solid fa-circle-check"></i> พร้อมส่งมอบ</span>
        <img src="${mainImg}" alt="${escapeHtml(bike.name)}" class="sale-img" onerror="this.src='https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&q=80&w=800'">
        ${images.length > 1 ? `<span class="sale-img-count"><i class="fa-solid fa-images"></i> ${images.length} รูป</span>` : ''}
      </div>
      <div class="sale-info">
        <h3 class="sale-name">${escapeHtml(bike.name)}</h3>
        <div class="sale-pricing">
          <div class="sale-price-cash">
            <span class="price-label">สด</span>
            <span class="price-val">฿${cashPrice}</span>
          </div>
          <div class="sale-price-installment">
            <span class="down-badge">${downText}</span>
            <span class="inst-val"><i class="fa-solid fa-clock-rotate-left" style="font-size: 0.7rem;"></i> ${escapeHtml(bike.installment || 'ผ่อนสบายๆ')}</span>
          </div>
        </div>
        <div class="sale-details-snippet">${escapeHtml(detailsSnippet)}</div>
        <button class="btn btn-primary sale-btn" onclick="event.stopPropagation(); openSaleDetailModal('${bike.id}')">
          <i class="fa-solid fa-magnifying-glass-plus"></i> ดูรายละเอียดรถ
        </button>
      </div>
    </div>
  `;
}

window.openSaleDetailModal = function(saleId) {
  const bike = currentSaleFleet.find(b => String(b.id) === String(saleId));
  if (!bike) return;

  currentSaleDetailBike = bike;

  const images = (bike.images && Array.isArray(bike.images) && bike.images.length > 0)
    ? bike.images
    : [bike.image || 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&q=80&w=800'];

  const mainImgEl = document.getElementById('sale-modal-main-img');
  const counterEl = document.getElementById('sale-modal-img-counter');
  const thumbsContainer = document.getElementById('sale-modal-thumbs');
  const titleEl = document.getElementById('sale-modal-title');
  const cashEl = document.getElementById('sale-modal-price-cash');
  const downEl = document.getElementById('sale-modal-down-payment');
  const instEl = document.getElementById('sale-modal-installment');
  const detailsEl = document.getElementById('sale-modal-details');

  if (mainImgEl) mainImgEl.src = images[0];
  if (counterEl) counterEl.textContent = `1 / ${images.length}`;
  if (titleEl) titleEl.textContent = bike.name;
  if (cashEl) cashEl.textContent = `฿${parseInt(bike.priceCash || 0).toLocaleString()}`;
  if (downEl) downEl.textContent = parseInt(bike.downPayment || 0) === 0 ? 'ฟรีดาวน์ (0 บาท)' : `฿${parseInt(bike.downPayment || 0).toLocaleString()}`;
  if (instEl) instEl.textContent = bike.installment || '-';
  if (detailsEl) detailsEl.textContent = bike.details || 'ไม่มีรายละเอียดเพิ่มเติม';

  // Render Thumbnails
  if (thumbsContainer) {
    if (images.length > 1) {
      thumbsContainer.style.display = 'flex';
      thumbsContainer.innerHTML = images.map((img, idx) => `
        <img src="${img}" class="sale-thumb ${idx === 0 ? 'active' : ''}" 
             onclick="selectSaleImage('${img}', this, ${idx + 1}, ${images.length})"
             alt="Thumbnail ${idx + 1}"
             onerror="this.src='https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&q=80&w=800'">
      `).join('');
    } else {
      thumbsContainer.style.display = 'none';
      thumbsContainer.innerHTML = '';
    }
  }

  toggleModal('saleDetailModal');
};

window.selectSaleImage = function(imgUrl, thumbEl, currentIdx, total) {
  const mainImgEl = document.getElementById('sale-modal-main-img');
  const counterEl = document.getElementById('sale-modal-img-counter');
  if (mainImgEl) {
    mainImgEl.style.opacity = '0.3';
    setTimeout(() => {
      mainImgEl.src = imgUrl;
      mainImgEl.style.opacity = '1';
    }, 150);
  }
  if (counterEl) counterEl.textContent = `${currentIdx} / ${total}`;

  document.querySelectorAll('.sale-thumb').forEach(t => t.classList.remove('active'));
  if (thumbEl) thumbEl.classList.add('active');
};

window.contactAdminAboutSaleBike = function() {
  if (!currentSaleDetailBike) return;
  toggleModal('saleDetailModal');
  
  // Open live chat with pre-filled message
  toggleChatWidget();
  const inputEl = document.getElementById('chat-input');
  if (inputEl) {
    inputEl.value = `สวัสดีครับ สนใจสอบถามรถขายรุ่น: ${currentSaleDetailBike.name} (ราคาสด ฿${parseInt(currentSaleDetailBike.priceCash || 0).toLocaleString()})`;
    inputEl.focus();
  }
};

