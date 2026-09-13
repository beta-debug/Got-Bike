const carsData = [
  {
    id: 'c1',
    name: 'Toyota Camry 2024',
    category: 'airport',
    categoryLabel: 'รับส่งสนามบิน',
    seats: 4,
    transmission: 'Auto',
    engine: '2.5L Hybrid',
    pricePerDay: 1500,
    image: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fd?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'c2',
    name: 'Hyundai Staria VIP',
    category: 'van',
    categoryLabel: 'รถตู้นำเที่ยว',
    seats: 11,
    transmission: 'Auto',
    engine: '2.2L Diesel',
    pricePerDay: 3500,
    image: 'https://images.unsplash.com/photo-1631557989914-19d27038e9c0?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'c3',
    name: 'Honda Civic e:HEV',
    category: 'car',
    categoryLabel: 'รถยนต์เช่า',
    seats: 5,
    transmission: 'Auto',
    engine: '2.0L Hybrid',
    pricePerDay: 1200,
    image: 'https://images.unsplash.com/photo-1605810730811-9257b420f188?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'c4',
    name: 'Tesla Model 3 Long Range',
    category: 'ev',
    categoryLabel: 'รถไฟฟ้า EV',
    seats: 5,
    transmission: 'Auto',
    engine: 'Dual Motor',
    pricePerDay: 3000,
    image: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'c5',
    name: 'Yamaha XMAX 300',
    category: 'motorcycle',
    categoryLabel: 'มอเตอร์ไซค์',
    seats: 2,
    transmission: 'Auto',
    engine: '300cc',
    pricePerDay: 800,
    image: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'c6',
    name: 'Mercedes-Benz C-Class',
    category: 'airport',
    categoryLabel: 'รับส่งสนามบิน',
    seats: 4,
    transmission: 'Auto',
    engine: '2.0L Turbo',
    pricePerDay: 4500,
    image: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&q=80&w=800'
  }
];

// Mock Bookings Data
let bookingsData = [];

// Default Sale Bikes Data
const defaultSaleBikesData = [
  {
    id: 'sale_1',
    name: 'Honda Forza 350 RoadSync 2024',
    priceCash: 179000,
    downPayment: 9900,
    installment: '3,850 บาท/เดือน (48 งวด)',
    details: 'รถบิ๊กสกู๊ตเตอร์ยอดนิยม สภาพป้ายแดง ไมล์แท้ 2,xxx กม. กุญแจสมาร์ทคีย์ 2 ดอกครบ ระบบ HSTC และ ABS หน้า-หลัง พร้อมระบบสั่งการด้วยเสียง HSVCs เล่มทะเบียนพร้อมโอน ภาษี พ.ร.บ. ครบถ้วน ไม่เคยชนหรือล้ม',
    image: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&q=80&w=800',
    images: [
      'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1609630875171-b1321377ee65?auto=format&fit=crop&q=80&w=800'
    ],
    isFeatured: true,
    status: 'available',
    createdAt: 1710000000000
  },
  {
    id: 'sale_2',
    name: 'Yamaha XMAX 300 Tech MAX 2023',
    priceCash: 189000,
    downPayment: 0,
    installment: '4,150 บาท/เดือน (48 งวด)',
    details: 'รุ่นท็อป Tech MAX เบาะพิเศษพร้อมหน้าจอ Dual Displays สภาพสวยกริ๊บ ใช้งานน้อย เช็คศูนย์ตลอด ของแต่งแท้เบิกศูนย์ ยาง Michelin City Grip 2 ใหม่เอี่ยม พร้อมขับขี่ ดาวน์ 0 บาท ออกรถได้ทันที',
    image: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&q=80&w=800',
    images: [
      'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1609630875171-b1321377ee65?auto=format&fit=crop&q=80&w=800'
    ],
    isFeatured: true,
    status: 'available',
    createdAt: 1710000001000
  },
  {
    id: 'sale_3',
    name: 'Vespa Sprint 150 i-Get ABS 2023',
    priceCash: 139000,
    downPayment: 5000,
    installment: '3,100 บาท/เดือน (48 งวด)',
    details: 'เวสป้า สปริ้นท์ ดีไซน์สปอร์ต สีพิเศษ สภาพนางฟ้า วิ่งเพียง 4,500 กม. ไม่เคยล้ม แปะ เคลือบแก้วเงาวับ เอกสารครบพร้อมโอน ผ่อนสบายๆ เหมาะกับการใช้งานในเมือง',
    image: 'https://images.unsplash.com/photo-1609630875171-b1321377ee65?auto=format&fit=crop&q=80&w=800',
    images: [
      'https://images.unsplash.com/photo-1609630875171-b1321377ee65?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&q=80&w=800'
    ],
    isFeatured: true,
    status: 'available',
    createdAt: 1710000002000
  },
  {
    id: 'sale_4',
    name: 'Honda ADV 160 (2024)',
    priceCash: 99000,
    downPayment: 1900,
    installment: '2,450 บาท/เดือน (48 งวด)',
    details: 'SUV Bike สไตล์ลุย เครื่องยนต์ eSP+ 4 วาล์ว คล่องตัวและประหยัดน้ำมัน ระบบ ABS พร้อมดิสก์เบรกหน้า-หลัง มีระบบควบคุมการทรงตัว HSTC สภาพ 99% เจ้าของมือเดียวออกห้าง',
    image: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&q=80&w=800',
    images: [
      'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&q=80&w=800'
    ],
    isFeatured: false,
    status: 'available',
    createdAt: 1710000003000
  }
];

