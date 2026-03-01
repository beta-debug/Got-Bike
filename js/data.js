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
