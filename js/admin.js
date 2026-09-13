// Initialize Admin Dashboard
document.addEventListener('DOMContentLoaded', () => {
    checkAdminAuth();
});

// Admin Authentication
function handleAdminLogin(e) {
    if (e) e.preventDefault();
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;

    // Hardcoded credentials for Demo
    if (email === 'admin@maycar.com' && password === 'admin123') {
        localStorage.setItem('isAdminLoggedIn', 'true');
        checkAdminAuth();
    } else {
        alert('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }
}

function handleAdminLogout() {
    localStorage.removeItem('isAdminLoggedIn');
    checkAdminAuth();
}

function checkAdminAuth() {
    const isAdminLoggedIn = localStorage.getItem('isAdminLoggedIn') === 'true';
    const loginScreen = document.getElementById('admin-login-screen');
    const appScreen = document.getElementById('admin-app');

    if (isAdminLoggedIn) {
        loginScreen.classList.remove('active');
        appScreen.style.display = 'block';
        initAdminData();
    } else {
        loginScreen.classList.add('active');
        appScreen.style.display = 'none';
    }
}

// Navigation View Switching
window.switchAdminView = function (viewId, clickedElement) {
    // Hide all views
    document.querySelectorAll('.admin-view').forEach(view => {
        view.classList.remove('active');
    });

    // Show target view
    const target = document.getElementById(viewId);
    if (target) target.classList.add('active');

    // Update Sidebar Active state
    document.querySelectorAll('.side-link').forEach(link => {
        link.classList.remove('active');
    });
    if (clickedElement && clickedElement.classList.contains('side-link')) {
        clickedElement.classList.add('active');
    } else {
        const matchingSide = document.querySelector(`.side-link[onclick*="${viewId}"]`);
        if (matchingSide) matchingSide.classList.add('active');
    }

    // Update Top Nav Active state
    document.querySelectorAll('.admin-top-nav .nav-item').forEach(item => {
        item.classList.remove('active');
    });
    const matchingTop = document.querySelector(`.admin-top-nav .nav-item[onclick*="${viewId}"]`);
    if (matchingTop) {
        matchingTop.classList.add('active');
    }

    // Refresh view specific data
    if (viewId === 'dashboard-view') {
        renderDashboardStats();
    } else if (viewId === 'categories-view') {
        renderCategories();
    } else if (viewId === 'sales-view') {
        renderAdminSalesTable();
    } else if (viewId === 'contact-messages-view') {
        renderAdminContactMessages();
    }
};

window.updateTopNav = function (clickedElement) {
    if (!clickedElement) return;
    document.querySelectorAll('.admin-top-nav .nav-item').forEach(item => {
        item.classList.remove('active');
    });
    clickedElement.classList.add('active');
};

// Data Initialization / Firebase Sync
const defaultCategoriesList = [
    { id: 'cat_airport', value: 'airport', label: 'รถรับส่งสนามบิน', icon: 'fa-plane-departure' },
    { id: 'cat_van', value: 'van', label: 'รถตู้นำเที่ยว VIP', icon: 'fa-van-shuttle' },
    { id: 'cat_car', value: 'car', label: 'รถยนต์เช่า', icon: 'fa-car' },
    { id: 'cat_ev', value: 'ev', label: 'รถไฟฟ้า EV', icon: 'fa-bolt' },
    { id: 'cat_motorcycle', value: 'motorcycle', label: 'มอเตอร์ไซค์', icon: 'fa-motorcycle' }
];

let adminCarsData = (typeof carsData !== 'undefined') ? [...carsData] : [];
let adminSaleBikesData = (typeof defaultSaleBikesData !== 'undefined') ? [...defaultSaleBikesData] : [];
let adminBookingsData = [];
let adminCategoriesData = [...defaultCategoriesList];
let adminContactMessagesData = [];
let currentContactFilter = 'all';
let activeAdminChatKey = null;
let adminChatMessagesListener = null;
let activeModalBookingId = null;
let activeContactDetailId = null;

function initAdminData() {
    // Immediate pre-render with local/default data so user never sees a blank screen
    renderCategories();
    renderDashboardStats();
    populateCategoryDropdown();
    renderAdminSalesTable();

    // 1. One-time Migration from localStorage to Firebase
    migrateToFirebaseIfNeeded();

    // 2. Listen to Vehicles (Fleet)
    db.ref('maycar_fleet').on('value', (snapshot) => {
        const data = snapshot.val();
        adminCarsData = data ? Object.values(data) : [];
        renderAdminCarsTable();
        renderDashboardStats();
        renderCategories();
    });

    // 3. Listen to Bookings
    db.ref('maycar_bookings').on('value', (snapshot) => {
        const data = snapshot.val();
        adminBookingsData = data ? Object.values(data) : [];
        renderAdminBookings(data);
        renderDashboardStats();
    });

    // 4. Listen to Categories
    db.ref('maycar_categories').on('value', (snapshot) => {
        const data = snapshot.val();
        if (!data) {
            seedDefaultCategories();
        } else {
            adminCategoriesData = Object.values(data);
        }
        renderCategories();
        populateCategoryDropdown();
    });

    // 5. Listen to Chats
    db.ref('maycar_chats').on('value', (snapshot) => {
        renderAdminChatList(snapshot.val());
    });

    // 6. Listen to Notifications
    db.ref('maycar_notifications').on('value', (snapshot) => {
        renderNotifications(snapshot.val());
    });

    // 7. Listen to Payment & LINE Settings
    db.ref('maycar_payment_settings').on('value', (snapshot) => {
        const settings = snapshot.val();
        if (settings) {
            document.getElementById('bank-name').value = settings.bankName || '';
            document.getElementById('bank-acc-name').value = settings.accountName || '';
            document.getElementById('bank-acc-num').value = settings.accountNumber || '';
            document.getElementById('qr-url').value = settings.qrUrl || '';
            document.getElementById('line-access-token').value = settings.lineAccessToken || '';
            document.getElementById('line-user-id').value = settings.lineUserId || '';
            if (settings.qrUrl) previewQR();
        }
    });

    // 8. Listen to Sale Bikes (maycar_sale_fleet)
    db.ref('maycar_sale_fleet').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            adminSaleBikesData = Object.values(data);
        } else if (typeof defaultSaleBikesData !== 'undefined' && defaultSaleBikesData.length > 0) {
            adminSaleBikesData = [...defaultSaleBikesData];
            defaultSaleBikesData.forEach(item => {
                db.ref('maycar_sale_fleet').child(item.id).set(item);
            });
        }
        renderAdminSalesTable();
    });

    // 9. Listen to Contact Messages (maycar_contact_messages)
    db.ref('maycar_contact_messages').on('value', (snapshot) => {
        const data = snapshot.val();
        adminContactMessagesData = data ? Object.values(data) : [];
        renderAdminContactMessages();
    });
}

function migrateToFirebaseIfNeeded() {
    const isMigrated = localStorage.getItem('maycar_firebase_migrated') === 'true';
    if (!isMigrated) {
        console.log('Migrating local data to Firebase...');

        // Migrate Fleet
        const localFleet = JSON.parse(localStorage.getItem('maycar_fleet') || '[]');
        if (localFleet.length > 0) {
            localFleet.forEach(car => {
                db.ref('maycar_fleet').child(car.id).set(car);
            });
        } else {
            // If empty, use data.js defaults
            carsData.forEach(car => {
                db.ref('maycar_fleet').child(car.id).set(car);
            });
        }

        // Migrate Bookings
        const localBookings = JSON.parse(localStorage.getItem('maycar_my_bookings') || '[]');
        localBookings.forEach(b => {
            db.ref('maycar_bookings').child(b.id).set(b);
        });

        // Migrate Settings
        const localSettings = JSON.parse(localStorage.getItem('maycar_payment_settings') || '{}');
        if (Object.keys(localSettings).length > 0) {
            db.ref('maycar_payment_settings').set(localSettings);
        }

        localStorage.setItem('maycar_firebase_migrated', 'true');
        console.log('Migration complete!');
    }
}

// Cars Management
function renderAdminCarsTable() {
    const tbody = document.getElementById('cars-table-body');
    if (!tbody) return;

    tbody.innerHTML = adminCarsData.map(car => `
        <tr>
            <td><img src="${car.image}" alt="${car.name}" class="table-img"></td>
            <td style="font-weight: 500;">${car.name}</td>
            <td><span class="vehicle-category" style="position: static; font-size: 0.7rem; padding: 0.2rem 0.5rem;">${car.categoryLabel}</span></td>
            <td style="color: var(--text-secondary); font-size: 0.875rem;">${car.seats} ที่นั่ง / ${car.transmission}</td>
            <td style="font-weight: 600; color: var(--primary);">฿${car.pricePerDay.toLocaleString()}</td>
            <td>
                <div class="action-btns">
                    <button class="btn btn-outline" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;" onclick="editCar('${car.id}')"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn btn-outline" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; color: #ff5252; border-color: #ff5252;" onclick="deleteCar('${car.id}')"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Add / Edit Form Actions (switching views)
function openAddCarModal() {
    populateCategoryDropdown();
    document.getElementById('carForm').reset();
    document.getElementById('edit-car-id').value = '';
    document.getElementById('car-form-title').innerText = 'เพิ่มรถใหม่';
    document.getElementById('car-img-preview-container').innerHTML = `<i class="fa-solid fa-camera fa-3x" style="color: var(--text-secondary); margin-bottom: 1rem;"></i><p style="color: var(--text-secondary); font-size: 0.875rem;">วาง URL รูปภาพด้านล่าง</p>`;

    switchAdminView('edit-car-view');
}

function editCar(carId) {
    populateCategoryDropdown();
    const car = adminCarsData.find(c => c.id === carId);
    if (!car) return;

    document.getElementById('edit-car-id').value = car.id;
    document.getElementById('edit-car-name').value = car.name;
    document.getElementById('edit-car-category').value = car.category;
    document.getElementById('edit-car-price').value = car.pricePerDay;
    document.getElementById('edit-car-seats').value = car.seats;
    document.getElementById('edit-car-trans').value = car.transmission || 'Auto';
    document.getElementById('edit-car-img').value = car.image;
    document.getElementById('edit-car-details').value = car.details || '';

    document.getElementById('car-form-title').innerText = 'แก้ไขรถ: ' + car.name;
    updateCarPreview(car.image);

    switchAdminView('edit-car-view');
}

function updateCarPreview(url) {
    const container = document.getElementById('car-img-preview-container');
    if (url) {
        container.innerHTML = `<img src="${url}" alt="Car Preview">`;
    } else {
        container.innerHTML = `<i class="fa-solid fa-camera fa-3x" style="color: var(--text-secondary); margin-bottom: 1rem;"></i><p style="color: var(--text-secondary); font-size: 0.875rem;">วาง URL รูปภาพด้านล่าง</p>`;
    }
}

function saveCar(e) {
    e.preventDefault();
    const id = document.getElementById('edit-car-id').value;
    const catSelect = document.getElementById('edit-car-category');

    const carData = {
        name: document.getElementById('edit-car-name').value,
        category: catSelect.value,
        categoryLabel: catSelect.options[catSelect.selectedIndex].text,
        pricePerDay: parseInt(document.getElementById('edit-car-price').value),
        seats: document.getElementById('edit-car-seats').value,
        transmission: document.getElementById('edit-car-trans').value,
        image: document.getElementById('edit-car-img').value,
        details: document.getElementById('edit-car-details').value,
        status: 'Available'
    };

    const targetId = id || 'c' + Date.now();
    carData.id = targetId;

    db.ref('maycar_fleet').child(targetId).set(carData).then(() => {
        alert(id ? 'อัปเดตข้อมูลรถสำเร็จ' : 'เพิ่มรถใหม่สำเร็จ');
        switchAdminView('cars-view', document.querySelector('.side-link[href="#cars"]'));
    });
}

function deleteCar(carId) {
    if (confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรถคันนี้?')) {
        db.ref('maycar_fleet').child(carId).remove().then(() => {
            alert('ลบข้อมูลรถเรียบร้อยแล้ว');
        });
    }
}

// Payment Settings
function previewQR() {
    const url = document.getElementById('qr-url').value;
    const preview = document.getElementById('qr-preview');
    const img = document.getElementById('qr-img');

    if (url) {
        img.src = url;
        preview.style.display = 'block';
    } else {
        preview.style.display = 'none';
    }
}

function savePaymentSettings(e) {
    e.preventDefault();
    const settings = {
        bankName: document.getElementById('bank-name').value,
        accountName: document.getElementById('bank-acc-name').value,
        accountNumber: document.getElementById('bank-acc-num').value,
        qrUrl: document.getElementById('qr-url').value,
        lineAccessToken: document.getElementById('line-access-token').value,
        lineUserId: document.getElementById('line-user-id').value
    };

    db.ref('maycar_payment_settings').set(settings).then(() => {
        alert('บันทึกการตั้งค่าลง Firebase เรียบร้อยแล้ว (ทุกเครื่องจะเห็นข้อมูลนี้ทันที)');
    });
}

async function testLineMessage() {
    const token = document.getElementById('line-access-token').value;
    const userId = document.getElementById('line-user-id').value;

    if (!token || !userId) {
        alert('กรุณากรอก Channel Access Token และ User ID ก่อนทดสอบ');
        return;
    }

    const btn = document.querySelector('button[onclick="testLineMessage()"]');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังส่ง...';

    try {
        const testData = {
            carName: "🚗 Tesla Model 3 (ตัวอย่าง)",
            customerName: "👤 คุณสมชาย ใจดี",
            total: "1,500",
            bPickup: "2024-03-01 10:00",
            bReturn: "2024-03-02 10:00",
            carImage: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=800"
        };
        const result = await sendLineFlexMessage(testData, token, userId);
        if (result.success) {
            alert('ส่งข้อความแจ้งเตือนสีสันสดใสสำเร็จ! กรุณาตรวจสอบใน LINE OA หรือกลุ่มของคุณ');
        } else {
            alert('ส่งข้อความไม่สำเร็จ!\n\nสรุปสาเหตุ: ' + (result.error || 'ไม่พบสาเหตุที่แน่ชัด') + '\n\nวิธีแก้เบื้องต้น:\n1. ตรวจสอบว่าคัดลอก Token มาครบหรือไม่\n2. ตรวจสอบว่า User ID/Group ID ถูกต้องหรือไม่\n3. หากเป็น Group ID ต้องเชิญบอทเข้ากลุ่มก่อน\n4. ตรวจสอบ IP Whitelist ใน LINE Developer Console');
        }
    } catch (err) {
        alert('เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

async function sendLineFlexMessage(data, token, userId) {

    const flexContents = {
        "type": "bubble",
        "hero": {
            "type": "image",
            "url": data.carImage || "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=800",
            "size": "full",
            "aspectRatio": "20:13",
            "aspectMode": "cover"
        },
        "body": {
            "type": "box",
            "layout": "vertical",
            "contents": [
                { "type": "text", "text": "🔔 มีการจองรถใหม่!", "weight": "bold", "size": "xl", "color": "#06C755" },
                {
                    "type": "box", "layout": "vertical", "margin": "lg", "spacing": "sm",
                    "contents": [
                        {
                            "type": "box", "layout": "baseline", "spacing": "sm",
                            "contents": [
                                { "type": "text", "text": "รถยนต์", "color": "#aaaaaa", "size": "sm", "flex": 1 },
                                { "type": "text", "text": data.carName || "-", "wrap": true, "color": "#666666", "size": "sm", "flex": 4 }
                            ]
                        },
                        {
                            "type": "box", "layout": "baseline", "spacing": "sm",
                            "contents": [
                                { "type": "text", "text": "ลูกค้า", "color": "#aaaaaa", "size": "sm", "flex": 1 },
                                { "type": "text", "text": data.customerName || "-", "wrap": true, "color": "#666666", "size": "sm", "flex": 4 }
                            ]
                        },
                        {
                            "type": "box", "layout": "baseline", "spacing": "sm",
                            "contents": [
                                { "type": "text", "text": "ยอดรวม", "color": "#aaaaaa", "size": "sm", "flex": 1 },
                                { "type": "text", "text": "฿" + (data.total || "0"), "wrap": true, "color": "#ff5252", "size": "md", "flex": 4, "weight": "bold" }
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
                                { "type": "text", "text": "📅 รับรถ", "color": "#aaaaaa", "size": "sm", "flex": 1 },
                                { "type": "text", "text": data.bPickup || "-", "wrap": true, "color": "#666666", "size": "sm", "flex": 3 }
                            ]
                        },
                        {
                            "type": "box", "layout": "baseline", "spacing": "sm",
                            "contents": [
                                { "type": "text", "text": "📅 คืนรถ", "color": "#aaaaaa", "size": "sm", "flex": 1 },
                                { "type": "text", "text": data.bReturn || "-", "wrap": true, "color": "#666666", "size": "sm", "flex": 3 }
                            ]
                        }
                    ]
                }
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
// Notification System (Simulated via localStorage)
// ============================================

let notifications = [];

function initNotifications() {
    // Firebase listener handles this via initAdminData calls
}

function renderNotifications(notifsObj) {
    const list = document.getElementById('notif-list');
    const badge = document.getElementById('notif-badge');

    const notifs = notifsObj ? Object.values(notifsObj) : [];

    // Count unread
    const unreadCount = notifs.filter(n => !n.isRead).length;

    if (unreadCount > 0) {
        badge.style.display = 'flex';
        badge.innerText = unreadCount > 9 ? '9+' : unreadCount;
    } else {
        badge.style.display = 'none';
    }

    if (notifs.length === 0) {
        list.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--text-secondary); font-size: 0.875rem;">ไม่มีการแจ้งเตือนใหม่</div>`;
        return;
    }

    // Sort descending by time
    const sorted = notifs.sort((a, b) => b.timestamp - a.timestamp);

    list.innerHTML = sorted.map(notif => `
        <a href="#bookings" class="notif-item ${notif.isRead ? '' : 'unread'}" onclick="markAsRead('${notif.id}')">
            <div class="notif-icon">
                <i class="fa-solid fa-car"></i>
            </div>
            <div class="notif-content">
                <div class="notif-title">${notif.title}</div>
                <div class="notif-desc">${notif.message}</div>
                <div class="notif-time">${formatTimeAgo(notif.timestamp)}</div>
            </div>
            ${!notif.isRead ? '<div style="width: 8px; height: 8px; background: var(--primary); border-radius: 50%; margin-top: 0.25rem;"></div>' : ''}
        </a>
    `).join('');
}

function toggleNotificationDropdown() {
    document.getElementById('notif-dropdown').classList.toggle('active');
}

function markAsRead(id) {
    db.ref('maycar_notifications').child(id).update({ isRead: true }).then(() => {
        switchAdminView('bookings-view', document.querySelector('.side-link[href="#bookings"]'));
    });
}

function markAllNotificationsRead(e) {
    if (e) e.stopPropagation();
    db.ref('maycar_notifications').once('value').then(snapshot => {
        const notifs = snapshot.val();
        if (notifs) {
            const updates = {};
            Object.keys(notifs).forEach(id => {
                updates[`${id}/isRead`] = true;
            });
            db.ref('maycar_notifications').update(updates);
        }
    });
}

// Utility: Time Ago Formatter
function formatTimeAgo(timestamp) {
    const seconds = Math.floor((new Date() - timestamp) / 1000);
    if (seconds < 60) return 'เมื่อสักครู่';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
    const days = Math.floor(hours / 24);
    return `${days} วันที่แล้ว`;
}

// Bookings Management (Requirement 3.4 - Mobile Friendly Compact Table)
function renderAdminBookings(bookingsObj) {
    const tbody = document.getElementById('bookings-table-body');
    if (!tbody) return;

    const bookings = bookingsObj ? Object.values(bookingsObj) : [];
    // Sort descending by ID or Date if needed
    bookings.sort((a, b) => b.id.localeCompare(a.id));

    if (bookings.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2.5rem; color: var(--text-secondary);">ยังไม่มีออเดอร์ในขณะนี้</td></tr>`;
        return;
    }

    tbody.innerHTML = bookings.map(b => `
        <tr>
            <td>
                <img src="${b.carImage || 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&q=80&w=800'}" class="table-img" style="width: 52px; height: 38px; object-fit: cover; border-radius: 6px; cursor: pointer;" onclick="openOrderDetailModal('${b.id}')">
            </td>
            <td>
                <div style="font-weight: 600; font-size: 0.875rem; color: var(--text-primary); cursor: pointer;" onclick="openOrderDetailModal('${b.id}')">${escapeHtmlAdmin(b.carName || 'รถเช่า')}</div>
                <span style="font-size: 0.72rem; color: var(--primary); font-weight: 700;">${b.id}</span>
            </td>
            <td style="font-size: 0.8rem; line-height: 1.4;">
                <div style="font-weight: 600; color: var(--text-primary);">${escapeHtmlAdmin(b.customerName || 'ไม่ระบุชื่อ')}</div>
                <div style="font-size: 0.75rem; color: var(--text-secondary);"><i class="fa-solid fa-phone" style="font-size: 0.7rem; color: var(--primary);"></i> ${escapeHtmlAdmin(b.customerPhone || '-')}</div>
            </td>
            <td>
                <span style="font-weight: 700; color: var(--primary); font-size: 0.95rem;">฿${parseInt(b.totalAmount || 0).toLocaleString()}</span>
            </td>
            <td>
                <span style="background: ${getStatusColor(b.status)}15; color: ${getStatusColor(b.status)}; padding: 0.25rem 0.6rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; border: 1px solid ${getStatusColor(b.status)}35; display: inline-block;">
                    ${b.status || 'รอยืนยัน'}
                </span>
            </td>
            <td style="text-align: center;">
                <button type="button" class="btn btn-detail-toggle" onclick="openOrderDetailModal('${b.id}')" title="ดูข้อมูลทั้งหมดแบบละเอียด">
                    <i class="fa-solid fa-bars"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Order Detail Modal (Vertical Mobile-Friendly Layout - Requirement 3.4)
window.openOrderDetailModal = function (bookingId) {
    const booking = adminBookingsData.find(b => String(b.id) === String(bookingId));
    if (!booking) return;

    activeModalBookingId = bookingId;

    const modal = document.getElementById('orderDetailModal');
    if (!modal) return;

    // Header Info
    const bkgIdEl = document.getElementById('od-booking-id');
    const statusBadgeEl = document.getElementById('od-status-badge');
    const createdDateEl = document.getElementById('od-created-date');

    if (bkgIdEl) bkgIdEl.textContent = booking.id;
    if (statusBadgeEl) {
        statusBadgeEl.textContent = booking.status || 'รอยืนยัน';
        statusBadgeEl.style.background = `${getStatusColor(booking.status)}15`;
        statusBadgeEl.style.color = getStatusColor(booking.status);
        statusBadgeEl.style.border = `1px solid ${getStatusColor(booking.status)}40`;
    }
    if (createdDateEl) {
        createdDateEl.textContent = booking.bookingDate ? `วันที่ทำรายการ: ${formatDisplayDate(booking.bookingDate)}` : 'วันที่ทำรายการ: -';
    }

    // 1. Car Image
    const carImg = document.getElementById('od-car-img');
    if (carImg) {
        carImg.src = booking.carImage || 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&q=80&w=800';
    }

    // 2. Car Name
    const carNameEl = document.getElementById('od-car-name');
    if (carNameEl) carNameEl.textContent = booking.carName || '-';

    // 3. Customer Info
    const custNameEl = document.getElementById('od-customer-name');
    const custPhoneEl = document.getElementById('od-customer-phone');
    const custPhoneLink = document.getElementById('od-customer-phone-link');
    const custIdCardEl = document.getElementById('od-customer-id-card');
    const custPermAddrEl = document.getElementById('od-customer-permanent-addr');

    if (custNameEl) custNameEl.textContent = booking.customerName || 'ไม่ระบุ';
    if (custPhoneEl) custPhoneEl.textContent = booking.customerPhone || '-';
    if (custPhoneLink) custPhoneLink.href = booking.customerPhone ? `tel:${booking.customerPhone}` : '#';
    if (custIdCardEl) custIdCardEl.textContent = booking.customerIdCard || '-';
    if (custPermAddrEl) custPermAddrEl.textContent = booking.customerPermanentAddress || '-';

    // 4. Delivery Address & Map Link
    const deliveryAddrEl = document.getElementById('od-delivery-addr');
    const mapLinkContainer = document.getElementById('od-map-link-container');
    const mapLinkEl = document.getElementById('od-map-link');

    if (deliveryAddrEl) {
        deliveryAddrEl.textContent = booking.deliveryAddr ? booking.deliveryAddr : 'รับรถที่สาขา / ร้าน GOTBIKE';
    }
    if (mapLinkContainer && mapLinkEl) {
        if (booking.mapLink) {
            mapLinkContainer.style.display = 'block';
            mapLinkEl.href = booking.mapLink;
        } else {
            mapLinkContainer.style.display = 'none';
        }
    }

    // 5. Booking Dates
    const pickupDateEl = document.getElementById('od-pickup-date');
    const returnDateEl = document.getElementById('od-return-date');
    if (pickupDateEl) pickupDateEl.textContent = booking.pickupDate ? formatDisplayDate(booking.pickupDate) : '-';
    if (returnDateEl) returnDateEl.textContent = booking.returnDate ? formatDisplayDate(booking.returnDate) : '-';

    // 6. Total Amount
    const totalAmountEl = document.getElementById('od-total-amount');
    if (totalAmountEl) totalAmountEl.textContent = `฿${parseInt(booking.totalAmount || 0).toLocaleString()}`;

    // 7. Payment Slip
    const slipContainer = document.getElementById('od-slip-container');
    if (slipContainer) {
        if (booking.paymentSlip) {
            slipContainer.innerHTML = `
                <div style="cursor: pointer; display: inline-block; text-align: center;" onclick="openSlipModal('${booking.paymentSlip}')">
                    <img src="${booking.paymentSlip}" alt="Slip" style="max-width: 180px; max-height: 240px; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
                    <p style="font-size: 0.8rem; color: var(--primary); margin: 0.4rem 0 0; font-weight: 600;">
                        <i class="fa-solid fa-magnifying-glass-plus"></i> คลิกเพื่อดูภาพสลิปขนาดใหญ่
                    </p>
                </div>
            `;
        } else {
            slipContainer.innerHTML = `<span style="font-size: 0.85rem; color: var(--text-secondary);"><i class="fa-solid fa-circle-exclamation"></i> ไม่พบหลักฐานการโอนเงิน</span>`;
        }
    }

    // 8. Status Select
    const statusSelect = document.getElementById('od-status-select');
    if (statusSelect) {
        statusSelect.value = booking.status || 'รอยืนยัน';
    }

    modal.style.display = 'flex';
};

window.closeOrderDetailModal = function () {
    const modal = document.getElementById('orderDetailModal');
    if (modal) modal.style.display = 'none';
    activeModalBookingId = null;
};

window.saveStatusFromModal = function () {
    if (!activeModalBookingId) return;
    const statusSelect = document.getElementById('od-status-select');
    const newStatus = statusSelect ? statusSelect.value : 'รอยืนยัน';

    db.ref('maycar_bookings').child(activeModalBookingId).update({ status: newStatus }).then(() => {
        alert(`อัปเดตสถานะการจอง ${activeModalBookingId} เป็น "${newStatus}" เรียบร้อยแล้ว`);
        closeOrderDetailModal();
    }).catch(err => {
        alert('เกิดข้อผิดพลาดในการบันทึก: ' + err.message);
    });
};

window.deleteBookingFromModal = function () {
    if (!activeModalBookingId) return;
    if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบการจองรหัส ${activeModalBookingId}? ข้อมูลจะไม่สามารถกู้คืนได้`)) {
        db.ref('maycar_bookings').child(activeModalBookingId).remove().then(() => {
            alert(`ลบการจอง ${activeModalBookingId} เรียบร้อยแล้ว`);
            closeOrderDetailModal();
        }).catch(err => {
            alert('เกิดข้อผิดพลาดในการลบ: ' + err.message);
        });
    }
};

function updateBookingStatus(bookingId, newStatus) {
    db.ref('maycar_bookings').child(bookingId).update({ status: newStatus }).then(() => {
        alert(`อัปเดตสถานะการจอง ${bookingId} เป็น ${newStatus} แล้ว`);
    });
}

function deleteBooking(bookingId) {
    if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบการจอง ${bookingId}?`)) {
        db.ref('maycar_bookings').child(bookingId).remove().then(() => {
            alert(`ลบการจอง ${bookingId} เรียบร้อยแล้ว`);
        });
    }
}

function getStatusColor(status) {
    switch (status) {
        case 'รอยืนยัน': return '#f59e0b'; // Amber
        case 'ยืนยันแล้ว': return '#10b981'; // Green
        case 'กำลังใช้งาน': return '#3b82f6'; // Blue
        case 'เสร็จสิ้น': return '#6b7280'; // Gray
        case 'ยกเลิก': return '#ef4444'; // Red
        default: return '#6b7280';
    }
}

function formatDisplayDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', { year: '2-digit', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Slip Modal Handlers
window.openSlipModal = function (slipUrl) {
    const modal = document.getElementById('slip-modal');
    const img = document.getElementById('slip-preview-img');
    const download = document.getElementById('slip-download-link');

    if (modal && img) {
        img.src = slipUrl;
        if (download) download.href = slipUrl;
        modal.style.display = 'flex';
    }
};

window.closeSlipModal = function () {
    const modal = document.getElementById('slip-modal');
    if (modal) {
        modal.style.display = 'none';
    }
};

// Enhance polling to refresh bookings table too
const originalPoll = setInterval;
// We'll just add our extra refresh to the existing interval logic if we want to be clean,
// but for simplicity, we'll just re-render when notifications change in the existing logic.
// (Modifying the existing setInterval in admin.js line 220)

// ============================================
// Dashboard System
// ============================================
window.renderDashboardStats = function () {
    const totalCarsEl = document.getElementById('stat-total-cars');
    const totalOrdersEl = document.getElementById('stat-total-orders');
    const totalRevEl = document.getElementById('stat-total-revenue');
    const pendingOrdersEl = document.getElementById('stat-pending-orders');
    const recentOrdersBody = document.getElementById('dashboard-recent-orders');

    if (!totalCarsEl) return;

    totalCarsEl.innerText = adminCarsData.length;
    totalOrdersEl.innerText = adminBookingsData.length;

    const activeBookings = adminBookingsData.filter(b => b.status !== 'ยกเลิก');
    const totalRevenue = activeBookings.reduce((sum, b) => sum + (parseInt(b.totalAmount) || 0), 0);
    totalRevEl.innerText = '฿' + totalRevenue.toLocaleString();

    const pendingCount = adminBookingsData.filter(b => b.status === 'รอยืนยัน').length;
    pendingOrdersEl.innerText = pendingCount;

    if (recentOrdersBody) {
        const sorted = [...adminBookingsData].sort((a, b) => {
            const dateA = new Date(a.bookingDate || 0).getTime();
            const dateB = new Date(b.bookingDate || 0).getTime();
            return dateB - dateA;
        });
        const recent = sorted.slice(0, 5);

        if (recent.length === 0) {
            recentOrdersBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:2rem; color:var(--text-secondary);">ยังไม่มีออเดอร์</td></tr>`;
        } else {
            recentOrdersBody.innerHTML = recent.map(b => `
                <tr>
                    <td style="font-weight: 600; font-size: 0.85rem; color: var(--primary);">${b.id}</td>
                    <td>
                        <div style="font-weight: 500;">${b.customerName || 'N/A'}</div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary);">${b.customerPhone || ''}</div>
                    </td>
                    <td>
                        <div style="font-weight: 500;">${b.carName}</div>
                    </td>
                    <td style="font-weight: 600; color: var(--primary);">฿${parseInt(b.totalAmount || 0).toLocaleString()}</td>
                    <td>
                        <span style="background: ${getStatusColor(b.status)}15; color: ${getStatusColor(b.status)}; padding: 0.2rem 0.6rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; border: 1px solid ${getStatusColor(b.status)}30;">
                            ${b.status}
                        </span>
                    </td>
                </tr>
            `).join('');
        }
    }
}

// ============================================
// Category Management
// ============================================
function seedDefaultCategories() {
    const defaultCategories = [
        { id: 'cat_airport', value: 'airport', label: 'รถรับส่งสนามบิน', icon: 'fa-plane-departure' },
        { id: 'cat_van', value: 'van', label: 'รถตู้นำเที่ยว VIP', icon: 'fa-van-shuttle' },
        { id: 'cat_car', value: 'car', label: 'รถยนต์เช่า', icon: 'fa-car' },
        { id: 'cat_ev', value: 'ev', label: 'รถไฟฟ้า EV', icon: 'fa-bolt' },
        { id: 'cat_motorcycle', value: 'motorcycle', label: 'มอเตอร์ไซค์', icon: 'fa-motorcycle' }
    ];
    defaultCategories.forEach(cat => {
        db.ref('maycar_categories').child(cat.id).set(cat);
    });
}

function populateCategoryDropdown() {
    const select = document.getElementById('edit-car-category');
    if (!select || adminCategoriesData.length === 0) return;
    const currentVal = select.value;
    select.innerHTML = adminCategoriesData.map(c => `
        <option value="${c.value}">${c.label}</option>
    `).join('');
    if (currentVal) select.value = currentVal;
}

window.openAddCategoryForm = function () {
    const form = document.getElementById('categoryForm');
    if (form) form.reset();
    document.getElementById('edit-cat-id').value = '';
    document.getElementById('category-form-title').innerHTML = '<i class="fa-solid fa-plus-circle" style="color: var(--primary); margin-right: 0.5rem;"></i> เพิ่มหมวดหมู่ใหม่';
    document.getElementById('category-form-panel').style.display = 'block';
};

window.closeCategoryForm = function () {
    const panel = document.getElementById('category-form-panel');
    if (panel) panel.style.display = 'none';
};

window.saveCategory = function (e) {
    e.preventDefault();
    const id = document.getElementById('edit-cat-id').value;
    const label = document.getElementById('edit-cat-label').value.trim();
    const value = document.getElementById('edit-cat-value').value.trim().toLowerCase().replace(/\s+/g, '_');
    const icon = document.getElementById('edit-cat-icon').value.trim() || 'fa-car';

    const catId = id || 'cat_' + Date.now();
    const catData = {
        id: catId,
        label: label,
        value: value,
        icon: icon
    };

    db.ref('maycar_categories').child(catId).set(catData).then(() => {
        alert(id ? 'อัปเดตหมวดหมู่สำเร็จ' : 'เพิ่มหมวดหมู่ใหม่สำเร็จ');
        closeCategoryForm();
    });
};

window.editCategory = function (catId) {
    const cat = adminCategoriesData.find(c => c.id === catId);
    if (!cat) return;

    document.getElementById('edit-cat-id').value = cat.id;
    document.getElementById('edit-cat-label').value = cat.label;
    document.getElementById('edit-cat-value').value = cat.value;
    document.getElementById('edit-cat-icon').value = cat.icon || '';
    document.getElementById('category-form-title').innerHTML = '<i class="fa-solid fa-pen" style="color: var(--primary); margin-right: 0.5rem;"></i> แก้ไขหมวดหมู่: ' + cat.label;
    document.getElementById('category-form-panel').style.display = 'block';
};

window.deleteCategory = function (catId) {
    const cat = adminCategoriesData.find(c => c.id === catId);
    if (!cat) return;

    const count = adminCarsData.filter(c => c.category === cat.value).length;
    let msg = `คุณแน่ใจหรือไม่ว่าต้องการลบหมวดหมู่ "${cat.label}"?`;
    if (count > 0) {
        msg = `มีรถเช่าในหมวดหมู่นี้อยู่ ${count} คัน คุณแน่ใจหรือไม่ว่าต้องการลบหมวดหมู่ "${cat.label}"?`;
    }
    if (!confirm(msg)) return;

    db.ref('maycar_categories').child(catId).remove().then(() => {
        alert('ลบหมวดหมู่เรียบร้อยแล้ว');
    });
};

window.renderCategories = function () {
    const tbody = document.getElementById('categories-table-body');
    if (!tbody) return;

    if (adminCategoriesData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:2rem; color:var(--text-secondary);">ยังไม่มีหมวดหมู่ กดปุ่ม "เพิ่มหมวดหมู่ใหม่" ด้านบน</td></tr>`;
        return;
    }

    tbody.innerHTML = adminCategoriesData.map(cat => {
        const carCount = adminCarsData.filter(c => c.category === cat.value).length;
        const iconClass = cat.icon ? (cat.icon.startsWith('fa-') ? `fa-solid ${cat.icon}` : cat.icon) : 'fa-solid fa-car';

        return `
            <tr>
                <td>
                    <div style="width:36px; height:36px; border-radius:8px; background: rgba(25, 118, 210, 0.1); color: var(--primary); display:flex; align-items:center; justify-content:center; font-size:1.1rem;">
                        <i class="${iconClass}"></i>
                    </div>
                </td>
                <td style="font-weight:600; color: var(--text-primary);">${cat.label}</td>
                <td><code style="background: var(--bg-light); padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.85rem; color: var(--text-secondary);">${cat.value}</code></td>
                <td>
                    <span style="font-weight: 600; background: #f1f5f9; padding: 0.2rem 0.6rem; border-radius: 12px; font-size: 0.8rem;">
                        ${carCount} คัน
                    </span>
                </td>
                <td style="text-align: right;">
                    <div class="action-btns" style="justify-content: flex-end;">
                        <button class="btn btn-outline" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;" onclick="editCategory('${cat.id}')" title="แก้ไข">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button class="btn btn-outline" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; color: #ff5252; border-color: #ff5252;" onclick="deleteCategory('${cat.id}')" title="ลบ">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// ============================================
// Admin Chat System
// ============================================
let allAdminChats = {};

function renderAdminChatList(chatsObj) {
    allAdminChats = chatsObj || {};
    const container = document.getElementById('admin-chat-customers');
    const sidebarBadge = document.getElementById('chat-sidebar-badge');
    if (!container) return;

    const chatKeys = Object.keys(allAdminChats);

    let totalUnread = 0;
    chatKeys.forEach(k => {
        const info = allAdminChats[k].info || {};
        if (info.hasUnreadAdmin) totalUnread++;
    });

    if (sidebarBadge) {
        if (totalUnread > 0) {
            sidebarBadge.style.display = 'inline-block';
            sidebarBadge.innerText = totalUnread > 9 ? '9+' : totalUnread;
        } else {
            sidebarBadge.style.display = 'none';
        }
    }

    if (chatKeys.length === 0) {
        container.innerHTML = `
            <div style="padding: 2rem; text-align: center; color: var(--text-secondary); font-size: 0.875rem;">
                <i class="fa-regular fa-comments fa-2x" style="margin-bottom: 1rem; display:block; color:#cbd5e1;"></i>
                ยังไม่มีข้อความจากลูกค้า
            </div>
        `;
        return;
    }

    chatKeys.sort((a, b) => {
        const tA = (allAdminChats[a].info && allAdminChats[a].info.lastTimestamp) || 0;
        const tB = (allAdminChats[b].info && allAdminChats[b].info.lastTimestamp) || 0;
        return tB - tA;
    });

    container.innerHTML = chatKeys.map(k => {
        const chat = allAdminChats[k];
        const info = chat.info || {};
        const isActive = k === activeAdminChatKey;
        const hasUnread = info.hasUnreadAdmin;
        const timeStr = info.lastTimestamp ? formatChatTime(info.lastTimestamp) : '';

        return `
            <div class="admin-chat-customer-item ${isActive ? 'active' : ''} ${hasUnread ? 'unread' : ''}" 
                 onclick="selectAdminChat('${k}')">
                <div class="chat-avatar" style="width: 40px; height: 40px; font-size: 0.9rem; flex-shrink: 0;">
                    <i class="fa-solid fa-user"></i>
                </div>
                <div class="customer-info" style="flex: 1; min-width: 0;">
                    <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom: 0.25rem;">
                        <span class="customer-name" style="font-weight:600; font-size:0.9rem; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                            ${escapeHtmlAdmin(info.userName || info.userEmail || k)}
                        </span>
                        <span style="font-size:0.7rem; color:var(--text-secondary); flex-shrink:0;">${timeStr}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:0.8rem; color:var(--text-secondary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                            ${escapeHtmlAdmin(info.lastMessage || 'ไม่มีข้อความ')}
                        </span>
                        ${hasUnread ? '<span class="unread-dot"></span>' : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

window.selectAdminChat = function (chatKey) {
    activeAdminChatKey = chatKey;
    const chat = allAdminChats[chatKey];
    if (!chat) return;

    const info = chat.info || {};

    const emptyPanel = document.getElementById('admin-chat-empty');
    if (emptyPanel) emptyPanel.style.display = 'none';

    const activePanel = document.getElementById('admin-chat-active');
    if (activePanel) activePanel.style.display = 'flex';

    const nameEl = document.getElementById('admin-chat-customer-name');
    if (nameEl) nameEl.innerText = info.userName || 'ลูกค้า';

    const emailEl = document.getElementById('admin-chat-customer-email');
    if (emailEl) emailEl.innerText = info.userEmail || chatKey;

    renderAdminChatList(allAdminChats);

    db.ref('maycar_chats/' + chatKey + '/info').update({ hasUnreadAdmin: false });

    if (adminChatMessagesListener) {
        db.ref('maycar_chats/' + chatKey + '/messages').off('value', adminChatMessagesListener);
    }

    const messagesContainer = document.getElementById('admin-chat-messages');

    adminChatMessagesListener = db.ref('maycar_chats/' + chatKey + '/messages').on('value', (snapshot) => {
        const msgs = snapshot.val() ? Object.values(snapshot.val()) : [];
        msgs.sort((a, b) => a.timestamp - b.timestamp);

        if (msgs.length === 0) {
            messagesContainer.innerHTML = '<div style="text-align:center; padding:2rem; color:var(--text-secondary);">ยังไม่มีประวัติการคุย</div>';
            return;
        }

        messagesContainer.innerHTML = msgs.map(m => `
            <div class="chat-bubble ${m.sender === 'admin' ? 'admin' : 'user'}">
                <div style="font-size: 0.7rem; font-weight: 600; margin-bottom: 0.2rem; opacity: 0.8;">
                    ${m.sender === 'admin' ? 'แอดมิน' : escapeHtmlAdmin(m.senderName || 'ลูกค้า')}
                </div>
                ${escapeHtmlAdmin(m.text)}
                <div class="chat-bubble-time">${formatChatTime(m.timestamp)}</div>
            </div>
        `).join('');

        msgs.forEach(m => {
            if (m.sender === 'user' && !m.readByAdmin) {
                db.ref('maycar_chats/' + chatKey + '/messages/' + m.id).update({ readByAdmin: true });
            }
        });

        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });

    setTimeout(() => {
        const input = document.getElementById('admin-chat-input');
        if (input) input.focus();
    }, 100);
};

window.sendAdminReply = function (e) {
    e.preventDefault();
    if (!activeAdminChatKey) return;

    const input = document.getElementById('admin-chat-input');
    const text = input.value.trim();
    if (!text) return;

    const msgId = 'msg_' + Date.now();
    const msg = {
        id: msgId,
        text: text,
        sender: 'admin',
        senderName: 'แอดมิน GOTBIKE',
        timestamp: Date.now(),
        readByAdmin: true,
        readByUser: false
    };

    db.ref('maycar_chats/' + activeAdminChatKey + '/messages/' + msgId).set(msg);

    db.ref('maycar_chats/' + activeAdminChatKey + '/info').update({
        lastMessage: text,
        lastTimestamp: Date.now()
    });

    input.value = '';
};

function formatChatTime(timestamp) {
    const d = new Date(timestamp);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'เมื่อสักครู่';
    if (diffMins < 60) return diffMins + ' นาทีก่อน';

    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
        return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    }

    return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) + ' ' +
        d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}

function escapeHtmlAdmin(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

// ============================================
// Sale Bikes Management (Requirement 3.1 & 3.2)
// ============================================

window.renderAdminSalesTable = function () {
    const tbody = document.getElementById('sales-table-body');
    if (!tbody) return;

    if (adminSaleBikesData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2.5rem; color:var(--text-secondary);">ยังไม่มีรายการรถขาย กดปุ่ม "เพิ่มรถขายใหม่" ด้านบน</td></tr>`;
        return;
    }

    tbody.innerHTML = adminSaleBikesData.map(bike => {
        const images = (bike.images && Array.isArray(bike.images) && bike.images.length > 0)
            ? bike.images
            : [bike.image || 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&q=80&w=800'];
        const mainImg = images[0];
        const cashPrice = parseInt(bike.priceCash || 0).toLocaleString();
        const downPrice = parseInt(bike.downPayment || 0).toLocaleString();
        const downText = parseInt(bike.downPayment || 0) === 0 ? 'ฟรีดาวน์' : `฿${downPrice}`;
        const isFeatured = bike.isFeatured !== false;

        return `
            <tr>
                <td>
                    <div style="position: relative; width: 56px; height: 42px; border-radius: 6px; overflow: hidden; border: 1px solid var(--surface-border);">
                        <img src="${mainImg}" alt="${escapeHtmlAdmin(bike.name)}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&q=80&w=800'">
                        ${images.length > 1 ? `<span style="position: absolute; bottom: 2px; right: 2px; background: rgba(0,0,0,0.65); color: white; font-size: 0.65rem; padding: 0.1rem 0.3rem; border-radius: 4px;">${images.length}</span>` : ''}
                    </div>
                </td>
                <td style="font-weight: 600; color: var(--text-primary);">
                    ${escapeHtmlAdmin(bike.name)}
                </td>
                <td style="font-weight: 700; color: #d97706;">฿${cashPrice}</td>
                <td style="font-weight: 600; color: var(--text-primary);">${downText}</td>
                <td style="font-size: 0.85rem; color: var(--text-secondary);">${escapeHtmlAdmin(bike.installment || '-')}</td>
                <td>
                    <span style="cursor: pointer; padding: 0.25rem 0.65rem; border-radius: 12px; font-size: 0.75rem; font-weight: 600; display: inline-flex; align-items: center; gap: 0.3rem; ${isFeatured ? 'background: #fef3c7; color: #b45309; border: 1px solid #fde68a;' : 'background: #f1f5f9; color: #94a3b8; border: 1px solid #e2e8f0;'}" onclick="toggleSaleFeatured('${bike.id}', ${!isFeatured})">
                        <i class="fa-solid ${isFeatured ? 'fa-star' : 'fa-star-half-stroke'}"></i>
                        ${isFeatured ? 'แนะนำหน้าแรก' : 'ทั่วไป'}
                    </span>
                </td>
                <td style="text-align: right;">
                    <div class="action-btns" style="justify-content: flex-end;">
                        <button class="btn btn-outline" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;" onclick="editSaleBike('${bike.id}')" title="แก้ไข">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button class="btn btn-outline" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; color: #ff5252; border-color: #ff5252;" onclick="deleteSaleBike('${bike.id}')" title="ลบ">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
};

window.openAddSaleModal = function () {
    const form = document.getElementById('saleForm');
    if (form) form.reset();

    const editIdEl = document.getElementById('edit-sale-id');
    const titleEl = document.getElementById('sale-form-title');
    if (editIdEl) editIdEl.value = '';
    if (titleEl) titleEl.innerText = 'เพิ่มรถขายใหม่';

    // Clear dynamic image rows & populate 1 default row
    const list = document.getElementById('sale-image-inputs-list');
    if (list) {
        list.innerHTML = '';
        addSaleImageInputRow('');
    }
    updateSalePreview();

    switchAdminView('edit-sale-view');
};

window.editSaleBike = function (saleId) {
    const bike = adminSaleBikesData.find(b => String(b.id) === String(saleId));
    if (!bike) return;

    document.getElementById('edit-sale-id').value = bike.id;
    document.getElementById('sale-form-title').innerText = 'แก้ไขรถขาย: ' + bike.name;
    document.getElementById('edit-sale-name').value = bike.name || '';
    document.getElementById('edit-sale-price-cash').value = bike.priceCash || '';
    document.getElementById('edit-sale-down-payment').value = bike.downPayment !== undefined ? bike.downPayment : 0;
    document.getElementById('edit-sale-installment').value = bike.installment || '';
    document.getElementById('edit-sale-details').value = bike.details || '';
    document.getElementById('edit-sale-featured').checked = bike.isFeatured !== false;

    const images = (bike.images && Array.isArray(bike.images) && bike.images.length > 0)
        ? bike.images
        : [bike.image || ''];

    const list = document.getElementById('sale-image-inputs-list');
    if (list) {
        list.innerHTML = '';
        images.forEach(url => addSaleImageInputRow(url));
    }
    updateSalePreview();

    switchAdminView('edit-sale-view');
};

window.addSaleImageInputRow = function (urlValue = '') {
    const list = document.getElementById('sale-image-inputs-list');
    if (!list) return;

    const row = document.createElement('div');
    row.className = 'sale-img-row';
    row.innerHTML = `
        <input type="url" class="form-input sale-image-url-input" placeholder="https://example.com/bike.jpg" value="${urlValue}" oninput="updateSalePreview()">
        <button type="button" class="sale-img-remove-btn" onclick="removeSaleImageInputRow(this)" title="ลบรูปนี้">
            <i class="fa-solid fa-trash"></i>
        </button>
    `;
    list.appendChild(row);
    updateSalePreview();
};

window.removeSaleImageInputRow = function (btn) {
    const list = document.getElementById('sale-image-inputs-list');
    if (!list) return;

    const rows = list.querySelectorAll('.sale-img-row');
    if (rows.length <= 1) {
        alert('ต้องมีช่องใส่ URL รูปภาพอย่างน้อย 1 รูป');
        return;
    }

    btn.closest('.sale-img-row').remove();
    updateSalePreview();
};

window.updateSalePreview = function () {
    const container = document.getElementById('sale-img-preview-container');
    if (!container) return;

    const inputs = document.querySelectorAll('.sale-image-url-input');
    let firstValidUrl = '';
    inputs.forEach(input => {
        if (!firstValidUrl && input.value.trim()) {
            firstValidUrl = input.value.trim();
        }
    });

    if (firstValidUrl) {
        container.innerHTML = `<img src="${firstValidUrl}" alt="Preview" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.onerror=null; this.parentElement.innerHTML='<div style=\\\'padding:1rem; text-align:center; color:#ef4444;\\\'><i class=\\\'fa-solid fa-triangle-exclamation\\\'></i> ไม่สามารถโหลดรูปภาพได้</div>';">`;
    } else {
        container.innerHTML = `<i class="fa-solid fa-camera fa-3x" style="color: var(--text-secondary); margin-bottom: 0.5rem;"></i>`;
    }
};

window.applyBulkSaleImages = function () {
    const textarea = document.getElementById('sale-bulk-img-urls');
    if (!textarea) return;

    const lines = textarea.value.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) {
        alert('กรุณากรอก URL อย่างน้อย 1 บรรทัด');
        return;
    }

    const list = document.getElementById('sale-image-inputs-list');
    if (!list) return;

    // Remove existing empty rows
    const rows = list.querySelectorAll('.sale-img-row');
    rows.forEach(r => {
        const input = r.querySelector('.sale-image-url-input');
        if (input && !input.value.trim()) r.remove();
    });

    lines.forEach(url => addSaleImageInputRow(url));
    textarea.value = '';
    updateSalePreview();
};

window.saveSaleBike = function (e) {
    if (e) e.preventDefault();

    const id = document.getElementById('edit-sale-id').value;
    const name = document.getElementById('edit-sale-name').value.trim();
    const priceCash = parseInt(document.getElementById('edit-sale-price-cash').value) || 0;
    const downPayment = parseInt(document.getElementById('edit-sale-down-payment').value) || 0;
    const installment = document.getElementById('edit-sale-installment').value.trim();
    const details = document.getElementById('edit-sale-details').value.trim();
    const isFeatured = document.getElementById('edit-sale-featured').checked;

    // Collect images
    const imageInputs = document.querySelectorAll('.sale-image-url-input');
    const images = [];
    imageInputs.forEach(inp => {
        const val = inp.value.trim();
        if (val) images.push(val);
    });

    if (images.length === 0) {
        alert('กรุณาใส่ URL รูปภาพอย่างน้อย 1 รูป');
        return;
    }

    const bikeId = id || 'sale_' + Date.now();
    const bikeData = {
        id: bikeId,
        name: name,
        priceCash: priceCash,
        downPayment: downPayment,
        installment: installment,
        details: details,
        isFeatured: isFeatured,
        image: images[0],
        images: images,
        status: 'available',
        updatedAt: Date.now()
    };

    db.ref('maycar_sale_fleet').child(bikeId).set(bikeData).then(() => {
        alert(id ? 'อัปเดตข้อมูลรถขายสำเร็จ' : 'เพิ่มรถขายใหม่สำเร็จ');
        switchAdminView('sales-view', document.querySelector('.side-link[href="#sales"]'));
    }).catch(err => {
        alert('เกิดข้อผิดพลาดในการบันทึก: ' + err.message);
    });
};

window.deleteSaleBike = function (saleId) {
    const bike = adminSaleBikesData.find(b => String(b.id) === String(saleId));
    const bikeName = bike ? bike.name : saleId;

    if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบรถขาย "${bikeName}"?`)) {
        db.ref('maycar_sale_fleet').child(saleId).remove().then(() => {
            alert('ลบรถขายเรียบร้อยแล้ว');
        }).catch(err => {
            alert('เกิดข้อผิดพลาดในการลบ: ' + err.message);
        });
    }
};

window.toggleSaleFeatured = function (saleId, isFeatured) {
    db.ref('maycar_sale_fleet').child(saleId).update({ isFeatured: isFeatured }).then(() => {
        // Updated via real-time listener
    });
};


// ============================================
// Contact Messages Management (Requirement 3.3)
// ============================================

window.renderAdminContactMessages = function () {
    const tbody = document.getElementById('contact-messages-table-body');
    const sidebarBadge = document.getElementById('contact-sidebar-badge');
    if (!tbody) return;

    // Filter messages
    let list = [...adminContactMessagesData];
    list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    // Update unread / pending badge
    const pendingCount = list.filter(m => m.status !== 'replied').length;
    if (sidebarBadge) {
        if (pendingCount > 0) {
            sidebarBadge.style.display = 'inline-block';
            sidebarBadge.textContent = pendingCount > 9 ? '9+' : pendingCount;
        } else {
            sidebarBadge.style.display = 'none';
        }
    }

    if (currentContactFilter === 'pending') {
        list = list.filter(m => m.status !== 'replied');
    } else if (currentContactFilter === 'replied') {
        list = list.filter(m => m.status === 'replied');
    }

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2.5rem; color:var(--text-secondary);">ไม่พบข้อความติดต่อในหมวดหมู่นี้</td></tr>`;
        return;
    }

    tbody.innerHTML = list.map(m => {
        const isReplied = m.status === 'replied';
        const msgSnippet = (m.message || '').length > 60 ? (m.message.substring(0, 60) + '...') : (m.message || '-');
        const timeStr = m.timestamp ? formatChatTime(m.timestamp) : '-';

        return `
            <tr style="${!isReplied ? 'background: rgba(254, 243, 199, 0.2);' : ''}">
                <td style="font-size: 0.8rem; color: var(--text-secondary); white-space: nowrap;">
                    ${timeStr}
                </td>
                <td style="font-size: 0.85rem;">
                    <div style="font-weight: 600; color: var(--text-primary);">${escapeHtmlAdmin(m.customerName || 'ไม่ระบุชื่อ')}</div>
                </td>
                <td style="font-size: 0.8rem; line-height: 1.4;">
                    <a href="${m.customerPhone ? `tel:${m.customerPhone}` : '#'}" style="color: var(--primary); text-decoration: none; display: block; font-weight: 600;">
                        <i class="fa-solid fa-phone" style="font-size: 0.7rem; margin-right: 0.25rem;"></i>${escapeHtmlAdmin(m.customerPhone || '-')}
                    </a>
                    ${m.customerEmail && m.customerEmail !== '-' ? `
                        <a href="mailto:${m.customerEmail}" style="color: var(--text-secondary); text-decoration: none; font-size: 0.75rem; display: block;">
                            <i class="fa-solid fa-envelope" style="font-size: 0.7rem; margin-right: 0.25rem;"></i>${escapeHtmlAdmin(m.customerEmail)}
                        </a>
                    ` : ''}
                </td>
                <td>
                    <span class="down-badge" style="background: #e0f2fe; color: #0369a1; font-size: 0.75rem;">
                        ${escapeHtmlAdmin(m.subject || 'ติดต่อทั่วไป')}
                    </span>
                </td>
                <td style="font-size: 0.85rem; color: #475569; max-width: 200px;">
                    ${escapeHtmlAdmin(msgSnippet)}
                </td>
                <td>
                    <span class="contact-status-badge ${isReplied ? 'contact-status-replied' : 'contact-status-pending'}">
                        <i class="fa-solid ${isReplied ? 'fa-check' : 'fa-clock'}"></i>
                        ${isReplied ? 'ติดต่อแล้ว' : 'ยังไม่ตอบ'}
                    </span>
                </td>
                <td style="text-align: right;">
                    <div class="action-btns" style="justify-content: flex-end;">
                        <button class="btn btn-outline" style="padding: 0.35rem 0.75rem; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 0.35rem;" onclick="openContactDetailModal('${m.id}')">
                            <i class="fa-solid fa-envelope-open"></i> เปิดอ่าน
                        </button>
                        <button class="btn btn-outline" style="padding: 0.35rem 0.6rem; font-size: 0.8rem; color: #ff5252; border-color: #ff5252;" onclick="deleteContactMessage('${m.id}')" title="ลบข้อความ">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
};

window.filterContactMessages = function (filterType, btn) {
    currentContactFilter = filterType;
    document.querySelectorAll('.msg-filter-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderAdminContactMessages();
};

window.openContactDetailModal = function (msgId) {
    const msg = adminContactMessagesData.find(m => String(m.id) === String(msgId));
    if (!msg) return;

    activeContactDetailId = msgId;

    const modal = document.getElementById('contactDetailModal');
    if (!modal) return;

    const timeEl = document.getElementById('cmd-time');
    const nameEl = document.getElementById('cmd-name');
    const phoneEl = document.getElementById('cmd-phone');
    const phoneLink = document.getElementById('cmd-phone-link');
    const emailEl = document.getElementById('cmd-email');
    const emailLink = document.getElementById('cmd-email-link');
    const subjectEl = document.getElementById('cmd-subject');
    const messageEl = document.getElementById('cmd-message');
    const replyInput = document.getElementById('cmd-reply-input');

    if (timeEl) timeEl.textContent = msg.timestamp ? `เวลา: ${formatDisplayDate(msg.timestamp)} (${formatTimeAgo(msg.timestamp)})` : 'เวลา: -';
    if (nameEl) nameEl.textContent = msg.customerName || 'ไม่ระบุ';
    if (phoneEl) phoneEl.textContent = msg.customerPhone || '-';
    if (phoneLink) phoneLink.href = msg.customerPhone ? `tel:${msg.customerPhone}` : '#';
    if (emailEl) emailEl.textContent = msg.customerEmail || '-';
    if (emailLink) emailLink.href = (msg.customerEmail && msg.customerEmail !== '-') ? `mailto:${msg.customerEmail}` : '#';
    if (subjectEl) subjectEl.textContent = msg.subject || 'ติดต่อทั่วไป';
    if (messageEl) messageEl.textContent = msg.message || '-';
    if (replyInput) replyInput.value = msg.replyNotes || '';

    // Mark as read in Firebase
    if (!msg.isRead) {
        db.ref('maycar_contact_messages').child(msgId).update({ isRead: true });
    }

    modal.style.display = 'flex';
};

window.closeContactDetailModal = function () {
    const modal = document.getElementById('contactDetailModal');
    if (modal) modal.style.display = 'none';
    activeContactDetailId = null;
};

window.saveContactReply = function (markReplied) {
    if (!activeContactDetailId) return;

    const replyInput = document.getElementById('cmd-reply-input');
    const replyNotes = replyInput ? replyInput.value.trim() : '';

    const updates = {
        replyNotes: replyNotes,
        isRead: true
    };
    if (markReplied) {
        updates.status = 'replied';
        updates.repliedAt = Date.now();
    }

    db.ref('maycar_contact_messages').child(activeContactDetailId).update(updates).then(() => {
        alert(markReplied ? 'บันทึกสถานะ "ติดต่อแล้ว" เรียบร้อย' : 'บันทึกร่างเรียบร้อย');
        closeContactDetailModal();
    }).catch(err => {
        alert('เกิดข้อผิดพลาดในการบันทึก: ' + err.message);
    });
};

window.deleteContactMessage = function (msgId) {
    if (confirm('คุณแน่ใจหรือไม่ว่าต้องการลบข้อความติดต่อนี้?')) {
        db.ref('maycar_contact_messages').child(msgId).remove().then(() => {
            alert('ลบข้อความติดต่อเรียบร้อยแล้ว');
            if (activeContactDetailId === msgId) {
                closeContactDetailModal();
            }
        }).catch(err => {
            alert('เกิดข้อผิดพลาดในการลบ: ' + err.message);
        });
    }
};

