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
    document.getElementById(viewId).classList.add('active');

    // Update Sidebar Active state
    if (clickedElement && clickedElement.classList.contains('side-link')) {
        document.querySelectorAll('.side-link').forEach(link => {
            link.classList.remove('active');
        });
        clickedElement.classList.add('active');
    }
}

// Data Initialization / localStorage Sync
let adminCarsData = [];

function initAdminData() {
    // Sync with global carsData from data.js or localStorage
    const storedCars = localStorage.getItem('maycar_fleet');
    if (storedCars) {
        adminCarsData = JSON.parse(storedCars);
    } else {
        adminCarsData = [...carsData]; // From data.js
        saveCarsToStorage();
    }
    renderAdminCarsTable();
    renderAdminBookings();

    // Load Payment & LINE Settings
    const paymentStored = localStorage.getItem('maycar_payment_settings');
    if (paymentStored) {
        const settings = JSON.parse(paymentStored);
        document.getElementById('bank-name').value = settings.bankName || '';
        document.getElementById('bank-acc-name').value = settings.accountName || ''; // Updated field
        document.getElementById('bank-acc-num').value = settings.accountNumber || ''; // Updated field
        document.getElementById('qr-url').value = settings.qrUrl || '';
        document.getElementById('line-access-token').value = settings.lineAccessToken || '';
        document.getElementById('line-user-id').value = settings.lineUserId || '';
        if (settings.qrUrl) previewQR();
    }
}

function saveCarsToStorage() {
    localStorage.setItem('maycar_fleet', JSON.stringify(adminCarsData));
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
    document.getElementById('carForm').reset();
    document.getElementById('edit-car-id').value = '';
    document.getElementById('car-form-title').innerText = 'เพิ่มรถใหม่';
    document.getElementById('car-img-preview-container').innerHTML = `<i class="fa-solid fa-camera fa-3x" style="color: var(--text-secondary); margin-bottom: 1rem;"></i><p style="color: var(--text-secondary); font-size: 0.875rem;">วาง URL รูปภาพด้านล่าง</p>`;

    switchAdminView('edit-car-view');
}

function editCar(carId) {
    const car = adminCarsData.find(c => c.id === carId);
    if (!car) return;

    document.getElementById('edit-car-id').value = car.id;
    document.getElementById('edit-car-name').value = car.name;
    document.getElementById('edit-car-category').value = car.category;
    document.getElementById('edit-car-price').value = car.pricePerDay;
    document.getElementById('edit-car-seats').value = car.seats;
    document.getElementById('edit-car-trans').value = car.transmission || 'Auto';
    document.getElementById('edit-car-img').value = car.image;

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
        image: document.getElementById('edit-car-img').value
    };

    if (id) {
        // Edit existing
        const index = adminCarsData.findIndex(c => c.id === id);
        if (index !== -1) {
            adminCarsData[index] = { ...adminCarsData[index], ...carData };
            alert('อัปเดตข้อมูลรถสำเร็จ');
        }
    } else {
        // Add new
        const newId = 'c' + Date.now();
        adminCarsData.push({ id: newId, ...carData });
        alert('เพิ่มรถใหม่สำเร็จ');
    }

    saveCarsToStorage();
    renderAdminCarsTable();
    switchAdminView('cars-view', document.querySelector('.side-link[href="#cars"]'));
}

function deleteCar(carId) {
    if (confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรถคันนี้?')) {
        adminCarsData = adminCarsData.filter(c => c.id !== carId);
        saveCarsToStorage();
        renderAdminCarsTable();
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

    localStorage.setItem('maycar_payment_settings', JSON.stringify(settings));
    alert('บันทึกการตั้งค่าเรียบร้อยแล้ว');
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
        const success = await sendLineFlexMessage(testData, token, userId);
        if (success) {
            alert('ส่งข้อความแจ้งเตือนสีสันสดใสสำเร็จ! กรุณาตรวจสอบใน LINE OA หรือกลุ่มของคุณ');
        } else {
            alert('ส่งข้อความไม่สำเร็จ กรุณาตรวจสอบ Token/User ID อีกครั้ง (หรือลองเปิด CORS Proxy)');
        }
    } catch (err) {
        alert('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

async function sendLineFlexMessage(data, token, userId) {
    const proxyUrl = "https://corsproxy.io/?";
    const apiUrl = "https://api.line.me/v2/bot/message/push";

    const flexContents = {
        "type": "bubble",
        "hero": {
            "type": "image",
            "url": data.carImage,
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
                                { "type": "text", "text": data.carName, "wrap": true, "color": "#666666", "size": "sm", "flex": 4 }
                            ]
                        },
                        {
                            "type": "box", "layout": "baseline", "spacing": "sm",
                            "contents": [
                                { "type": "text", "text": "ลูกค้า", "color": "#aaaaaa", "size": "sm", "flex": 1 },
                                { "type": "text", "text": data.customerName, "wrap": true, "color": "#666666", "size": "sm", "flex": 4 }
                            ]
                        },
                        {
                            "type": "box", "layout": "baseline", "spacing": "sm",
                            "contents": [
                                { "type": "text", "text": "ยอดรวม", "color": "#aaaaaa", "size": "sm", "flex": 1 },
                                { "type": "text", "text": "฿" + data.total, "wrap": true, "color": "#ff5252", "size": "md", "flex": 4, "weight": "bold" }
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
                                { "type": "text", "text": data.bPickup, "wrap": true, "color": "#666666", "size": "sm", "flex": 3 }
                            ]
                        },
                        {
                            "type": "box", "layout": "baseline", "spacing": "sm",
                            "contents": [
                                { "type": "text", "text": "📅 คืนรถ", "color": "#aaaaaa", "size": "sm", "flex": 1 },
                                { "type": "text", "text": data.bReturn, "wrap": true, "color": "#666666", "size": "sm", "flex": 3 }
                            ]
                        }
                    ]
                }
            ]
        }
    };

    try {
        const response = await fetch(proxyUrl + encodeURIComponent(apiUrl), {
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
        return response.ok;
    } catch (error) {
        console.error('LINE Messaging API Error:', error);
        return false;
    }
}

// ============================================
// Notification System (Simulated via localStorage)
// ============================================

let notifications = [];

function initNotifications() {
    const stored = localStorage.getItem('maycar_notifications');
    if (stored) {
        notifications = JSON.parse(stored);
    }
    renderNotifications();

    // Poll for changes every 3 seconds (simulating realtime DB like Firebase/Supabase)
    setInterval(() => {
        const currentStored = localStorage.getItem('maycar_notifications');
        const currentBookings = localStorage.getItem('maycar_my_bookings');

        let changed = false;
        if (currentStored && currentStored !== JSON.stringify(notifications)) {
            notifications = JSON.parse(currentStored);
            renderNotifications();
            changed = true;
        }

        if (currentBookings) {
            renderAdminBookings(); // Refresh table in case status changed in another tab or new booking arrived
        }
    }, 3000);
}

function renderNotifications() {
    const list = document.getElementById('notif-list');
    const badge = document.getElementById('notif-badge');

    // Count unread
    const unreadCount = notifications.filter(n => !n.isRead).length;

    if (unreadCount > 0) {
        badge.style.display = 'flex';
        badge.innerText = unreadCount > 9 ? '9+' : unreadCount;
    } else {
        badge.style.display = 'none';
    }

    if (notifications.length === 0) {
        list.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--text-secondary); font-size: 0.875rem;">ไม่มีการแจ้งเตือนใหม่</div>`;
        return;
    }

    // Sort descending by time
    const sorted = [...notifications].sort((a, b) => b.timestamp - a.timestamp);

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
    const notif = notifications.find(n => n.id === id);
    if (notif) {
        notif.isRead = true;
        localStorage.setItem('maycar_notifications', JSON.stringify(notifications));
        renderNotifications();
        switchAdminView('bookings-view', document.querySelector('.side-link[href="#bookings"]'));
    }
}

function markAllNotificationsRead(e) {
    if (e) e.stopPropagation();
    notifications.forEach(n => n.isRead = true);
    localStorage.setItem('maycar_notifications', JSON.stringify(notifications));
    renderNotifications();
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
function renderAdminBookings() {
    const tbody = document.getElementById('bookings-table-body');
    if (!tbody) return;

    const bookings = JSON.parse(localStorage.getItem('maycar_my_bookings') || '[]');

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
    const bookings = JSON.parse(localStorage.getItem('maycar_my_bookings') || '[]');
    const index = bookings.findIndex(b => b.id === bookingId);
    if (index !== -1) {
        bookings[index].status = newStatus;
        localStorage.setItem('maycar_my_bookings', JSON.stringify(bookings));
        renderAdminBookings();
        alert(`อัปเดตสถานะการจอง ${bookingId} เป็น ${newStatus} แล้ว`);
    }
}

function deleteBooking(bookingId) {
    if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบการจอง ${bookingId}?`)) {
        let bookings = JSON.parse(localStorage.getItem('maycar_my_bookings') || '[]');
        bookings = bookings.filter(b => b.id !== bookingId);
        localStorage.setItem('maycar_my_bookings', JSON.stringify(bookings));
        renderAdminBookings();
        alert(`ลบการจอง ${bookingId} เรียบร้อยแล้ว`);
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
