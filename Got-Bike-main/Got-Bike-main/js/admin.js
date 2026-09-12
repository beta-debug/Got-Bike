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
function switchAdminView(viewId, clickedElement) {
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
    }
}

window.updateTopNav = function (clickedElement) {
    if (!clickedElement) return;
    document.querySelectorAll('.admin-top-nav .nav-item').forEach(item => {
        item.classList.remove('active');
    });
    clickedElement.classList.add('active');
};

// Data Initialization / Firebase Sync
let adminCarsData = [];
let adminBookingsData = [];
let adminCategoriesData = [];
let activeAdminChatKey = null;
let adminChatMessagesListener = null;

function initAdminData() {
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
            renderCategories();
            populateCategoryDropdown();
        }
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

// Bookings Management
function renderAdminBookings(bookingsObj) {
    const tbody = document.getElementById('bookings-table-body');
    if (!tbody) return;

    const bookings = bookingsObj ? Object.values(bookingsObj) : [];
    // Sort descending by ID or Date if needed
    bookings.sort((a, b) => b.id.localeCompare(a.id));

    if (bookings.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 2rem; color: var(--text-secondary);">ยังไม่มีออเดอร์ในขณะนี้</td></tr>`;
        return;
    }

    tbody.innerHTML = bookings.map(b => `
        <tr>
            <td style="font-weight: 500; font-size: 0.875rem;">${b.id}</td>
            <td><img src="${b.carImage}" class="table-img"></td>
            <td style="font-weight: 500;">${b.carName}</td>
            <td style="font-size: 0.8rem; line-height: 1.4;">
                <strong>${b.customerName || 'N/A'}</strong><br>
                <i class="fa-solid fa-phone" style="font-size: 0.7rem; width: 15px;"></i> ${b.customerPhone || '-'}<br>
                <i class="fa-solid fa-id-card" style="font-size: 0.7rem; width: 15px;"></i> ${b.customerIdCard || '-'}
            </td>
            <td style="font-size: 0.8rem; line-height: 1.4; max-width: 150px;">
                ${b.deliveryAddr ? `
                    <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${b.deliveryAddr}">
                        <i class="fa-solid fa-location-dot" style="color: var(--primary);"></i> ${b.deliveryAddr}
                    </div>
                    ${b.mapLink ? `<a href="${b.mapLink}" target="_blank" style="color: #2563eb; text-decoration: underline; font-size: 0.75rem;">ดูแผนที่ Google Maps</a>` : ''}
                ` : '<span style="color: var(--text-secondary);">รับที่สาขา</span>'}
            </td>
            <td style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.4;">
                <i class="fa-solid fa-arrow-right" style="color: #10b981; margin-right: 0.25rem;"></i> ${formatDisplayDate(b.pickupDate)}<br>
                <i class="fa-solid fa-arrow-left" style="color: #ef4444; margin-right: 0.25rem;"></i> ${formatDisplayDate(b.returnDate)}
            </td>
            <td style="font-weight: 600; color: var(--primary);">฿${parseInt(b.totalAmount).toLocaleString()}</td>
            <td>
                ${b.paymentSlip ? `
                    <div class="slip-thumb" onclick="openSlipModal('${b.paymentSlip}')" style="cursor: pointer; position: relative; width: 40px; height: 40px; border-radius: 4px; overflow: hidden; border: 1px solid var(--surface-border);">
                        <img src="${b.paymentSlip}" style="width: 100%; height: 100%; object-fit: cover; opacity: 0.8;">
                        <i class="fa-solid fa-eye" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; font-size: 0.75rem; text-shadow: 0 0 4px rgba(0,0,0,0.5);"></i>
                    </div>
                ` : `
                    <span style="font-size: 0.75rem; color: var(--text-secondary);">ไม่มีสลิป</span>
                `}
            </td>
            <td>
                <span style="background: ${getStatusColor(b.status)}15; color: ${getStatusColor(b.status)}; padding: 0.2rem 0.6rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; border: 1px solid ${getStatusColor(b.status)}30;">
                    ${b.status}
                </span>
            </td>
            <td style="text-align: right;">
                <div style="display: flex; gap: 0.5rem; justify-content: flex-end; align-items: center;">
                    <select class="form-input" style="padding: 0.3rem; font-size: 0.8rem; width: auto; display: inline-block;" onchange="updateBookingStatus('${b.id}', this.value)">
                        <option value="รอยืนยัน" ${b.status === 'รอยืนยัน' ? 'selected' : ''}>รอยืนยัน</option>
                        <option value="ยืนยันแล้ว" ${b.status === 'ยืนยันแล้ว' ? 'selected' : ''}>ยืนยันแล้ว</option>
                        <option value="กำลังใช้งาน" ${b.status === 'กำลังใช้งาน' ? 'selected' : ''}>กำลังใช้งาน</option>
                        <option value="เสร็จสิ้น" ${b.status === 'เสร็จสิ้น' ? 'selected' : ''}>เสร็จสิ้น</option>
                        <option value="ยกเลิก" ${b.status === 'ยกเลิก' ? 'selected' : ''}>ยกเลิก</option>
                    </select>
                    <button class="btn btn-outline" onclick="deleteBooking('${b.id}')" style="padding: 0.3rem 0.6rem; color: #ff5252; border-color: #ff5252; font-size: 0.8rem;" title="ลบการจอง">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

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
function renderDashboardStats() {
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

function renderCategories() {
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
