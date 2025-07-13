/* eslint-disable no-console */
/* eslint-disable max-lines */
// Enhanced InMemoryProductRepository with 40 diverse products
// Replace your current src/infrastructure/repositories/in-memory-product-repository.ts

import { Product } from '@domain/entities/product';
import { IProductRepository } from '@domain/repositories/IProductRepository';

export class InMemoryProductRepository implements IProductRepository {
  private products: Product[] = [];

  constructor() {
    this.seedProducts();
  }
  async findByName(name: string): Promise<Product[]> {
    const searchTerm = name.toLowerCase();
    return this.products.filter(
      product =>
        product.name.toLowerCase().includes(searchTerm) ||
        product.description.toLowerCase().includes(searchTerm)
    );
  }

  private seedProducts(): void {
    this.products = [
      // Electronics - Computers & Laptops (5 products)
      new Product(
        '1',
        'Gaming Laptop Pro',
        'High-performance gaming laptop with RTX 4070 graphics card, perfect for gaming and content creation',
        'Electronics',
        1599.99,
        true,
        ['RTX 4070', '32GB RAM', '1TB SSD', 'Intel i7-13700H', '165Hz Display', 'RGB Keyboard'],
        {
          processor: 'Intel i7-13700H',
          ram: '32GB DDR5',
          storage: '1TB NVMe SSD',
          graphics: 'NVIDIA RTX 4070 8GB',
          display: '15.6" 165Hz QHD',
          weight: '2.3kg',
          battery: '8 hours',
          ports: '3x USB-A, 2x USB-C, HDMI, Ethernet',
        },
        ['gaming', 'laptop', 'high-performance', 'rtx', 'portable', 'creator']
      ),

      new Product(
        '2',
        'MacBook Air M3',
        'Ultra-thin laptop with Apple M3 chip, exceptional battery life and Retina display',
        'Electronics',
        1299.99,
        true,
        ['M3 Chip', '16GB RAM', '512GB SSD', 'Retina Display', '18-hour battery', 'Touch ID'],
        {
          processor: 'Apple M3',
          ram: '16GB Unified Memory',
          storage: '512GB SSD',
          display: '13.6" Retina',
          weight: '1.24kg',
          battery: '18 hours',
          ports: '2x Thunderbolt, MagSafe',
        },
        ['apple', 'laptop', 'ultrabook', 'm3', 'portable', 'professional']
      ),

      new Product(
        '3',
        'Desktop Workstation PC',
        'Powerful desktop computer for professional work, 3D rendering, and heavy computing tasks',
        'Electronics',
        2299.99,
        true,
        ['Intel i9-13900K', '64GB RAM', '2TB SSD', 'RTX 4080', 'Liquid Cooling', 'Wi-Fi 6E'],
        {
          processor: 'Intel i9-13900K',
          ram: '64GB DDR5',
          storage: '2TB NVMe SSD + 4TB HDD',
          graphics: 'NVIDIA RTX 4080 16GB',
          cooling: '240mm AIO Liquid Cooler',
          motherboard: 'Z790 Chipset',
          psu: '850W 80+ Gold',
        },
        ['desktop', 'workstation', 'professional', 'high-end', 'rendering', 'gaming']
      ),

      new Product(
        '4',
        'Ultrabook Business Laptop',
        'Lightweight business laptop with enterprise security features and all-day battery',
        'Electronics',
        899.99,
        true,
        ['Intel i5-1335U', '16GB RAM', '512GB SSD', '14-inch FHD', 'Fingerprint Reader', 'TPM 2.0'],
        {
          processor: 'Intel i5-1335U',
          ram: '16GB LPDDR5',
          storage: '512GB PCIe SSD',
          display: '14" FHD IPS',
          weight: '1.1kg',
          battery: '12 hours',
          security: 'Fingerprint, TPM 2.0, IR Camera',
        },
        ['business', 'ultrabook', 'security', 'lightweight', 'professional', 'enterprise']
      ),

      new Product(
        '5',
        'Gaming Desktop RGB',
        'Mid-range gaming desktop with customizable RGB lighting and excellent price-to-performance ratio',
        'Electronics',
        1199.99,
        true,
        [
          'AMD Ryzen 7 7700X',
          '32GB RAM',
          '1TB SSD',
          'RTX 4060 Ti',
          'RGB Lighting',
          'Tempered Glass',
        ],
        {
          processor: 'AMD Ryzen 7 7700X',
          ram: '32GB DDR5',
          storage: '1TB NVMe SSD',
          graphics: 'NVIDIA RTX 4060 Ti 16GB',
          case: 'Mid-Tower with Tempered Glass',
          cooling: 'RGB Air Cooler',
          psu: '650W 80+ Bronze',
        },
        ['gaming', 'desktop', 'rgb', 'amd', 'mid-range', 'customizable']
      ),

      // Electronics - Peripherals (8 products)
      new Product(
        '6',
        'Wireless Gaming Mouse',
        'Precision wireless gaming mouse with RGB lighting and ultra-low latency',
        'Electronics',
        79.99,
        true,
        ['Wireless', 'RGB Lighting', '25000 DPI', 'Ergonomic', '70-hour battery', 'Ultralight'],
        {
          connectivity: 'Wireless 2.4GHz + Bluetooth',
          dpi: '25000',
          buttons: '7 programmable',
          battery: '70 hours',
          weight: '79g',
          sensor: 'PAW3395',
        },
        ['gaming', 'mouse', 'wireless', 'rgb', 'precision', 'esports']
      ),

      new Product(
        '7',
        'Mechanical Keyboard RGB',
        'Premium mechanical keyboard with hot-swappable switches and per-key RGB lighting',
        'Electronics',
        149.99,
        true,
        [
          'Mechanical Switches',
          'Hot-swappable',
          'RGB Per-key',
          'Aluminum Frame',
          'USB-C',
          'Gasket Mount',
        ],
        {
          switches: 'Cherry MX Red (Hot-swappable)',
          layout: '75% Compact',
          backlighting: 'Per-key RGB',
          frame: 'CNC Aluminum',
          connection: 'USB-C Wired + Wireless',
          battery: '4000mAh',
        },
        ['keyboard', 'mechanical', 'rgb', 'gaming', 'premium', 'wireless']
      ),

      new Product(
        '8',
        '4K Webcam Pro',
        'Professional 4K webcam with auto-focus and noise-canceling microphone',
        'Electronics',
        129.99,
        true,
        [
          '4K Resolution',
          'Auto-focus',
          'Noise Canceling Mic',
          'Privacy Shutter',
          'USB-C',
          'Wide-angle',
        ],
        {
          resolution: '4K 30fps / 1080p 60fps',
          fieldOfView: '90 degrees',
          microphone: 'Dual stereo with noise canceling',
          features: 'Auto-focus, auto-exposure, privacy shutter',
          compatibility: 'Windows, Mac, Linux',
          connection: 'USB-C',
        },
        ['webcam', '4k', 'streaming', 'professional', 'video-call', 'content-creation']
      ),

      new Product(
        '9',
        'Gaming Headset Wireless',
        'Premium wireless gaming headset with 7.1 surround sound and noise cancellation',
        'Electronics',
        199.99,
        true,
        [
          'Wireless',
          '7.1 Surround',
          'Noise Canceling',
          '50mm drivers',
          '20-hour battery',
          'Retractable Mic',
        ],
        {
          drivers: '50mm Neodymium',
          frequency: '20Hz - 20kHz',
          connectivity: '2.4GHz Wireless + 3.5mm',
          battery: '20 hours',
          microphone: 'Retractable noise-canceling',
          weight: '320g',
        },
        ['headset', 'gaming', 'wireless', 'surround-sound', 'noise-canceling', 'esports']
      ),

      new Product(
        '10',
        'USB-C Docking Station',
        'Universal USB-C docking station with multiple ports and 100W power delivery',
        'Electronics',
        89.99,
        true,
        ['USB-C', '100W PD', 'Dual 4K Display', 'Gigabit Ethernet', 'Multiple Ports', 'Compact'],
        {
          ports: '2x HDMI, 4x USB-A, 2x USB-C, Ethernet, Audio, SD Card',
          powerDelivery: '100W USB-C PD',
          display: 'Dual 4K 60Hz',
          ethernet: 'Gigabit',
          compatibility: 'Windows, Mac, Linux',
          dimensions: '120 x 60 x 15mm',
        },
        ['docking', 'usb-c', 'hub', 'ports', 'power-delivery', 'productivity']
      ),

      new Product(
        '11',
        'Portable Monitor 15.6"',
        'Portable USB-C monitor perfect for travel and extending your workspace',
        'Electronics',
        249.99,
        true,
        ['15.6-inch', 'USB-C', 'IPS Display', '1080p', 'Ultra-thin', 'Magnetic Stand'],
        {
          size: '15.6"',
          resolution: '1920x1080 IPS',
          connectivity: 'USB-C (single cable)',
          brightness: '300 nits',
          weight: '700g',
          thickness: '8mm',
        },
        ['monitor', 'portable', 'travel', 'usb-c', 'productivity', 'dual-screen']
      ),

      new Product(
        '12',
        'Wireless Charging Pad',
        'Fast wireless charging pad compatible with all Qi-enabled devices',
        'Electronics',
        39.99,
        true,
        [
          'Qi Wireless',
          '15W Fast Charging',
          'LED Indicator',
          'Non-slip',
          'Case Friendly',
          'Safety Features',
        ],
        {
          power: '15W max output',
          compatibility: 'All Qi-enabled devices',
          features: 'LED indicator, non-slip surface',
          safety: 'Over-current, over-voltage, temperature protection',
          dimensions: '100mm diameter',
          certification: 'Qi certified',
        },
        ['wireless', 'charging', 'qi', 'fast-charging', 'phone', 'accessories']
      ),

      new Product(
        '13',
        'Bluetooth Earbuds Pro',
        'Premium wireless earbuds with active noise cancellation and transparency mode',
        'Electronics',
        179.99,
        true,
        [
          'ANC',
          'Transparency Mode',
          '6+24hr Battery',
          'Spatial Audio',
          'Wireless Charging',
          'IPX4',
        ],
        {
          anc: 'Active Noise Cancellation',
          battery: '6hrs + 24hrs case',
          drivers: '11mm dynamic',
          features: 'Spatial audio, transparency mode',
          resistance: 'IPX4 water resistant',
          charging: 'Wireless + USB-C',
        },
        ['earbuds', 'wireless', 'anc', 'premium', 'spatial-audio', 'waterproof']
      ),

      // Mobile Devices (4 products)
      new Product(
        '14',
        'Smartphone Pro Max',
        'Latest flagship smartphone with pro-grade camera system and 5G connectivity',
        'Mobile',
        1199.99,
        true,
        ['Pro Camera', '5G', '256GB Storage', '120Hz Display', 'Wireless Charging', 'Face ID'],
        {
          display: '6.7" OLED 120Hz',
          camera: 'Triple 48MP + 12MP + 12MP',
          storage: '256GB',
          battery: '4422mAh',
          processor: 'A17 Pro',
          connectivity: '5G, Wi-Fi 6E, Bluetooth 5.3',
        },
        ['smartphone', 'flagship', '5g', 'camera', 'premium', 'wireless-charging']
      ),

      new Product(
        '15',
        'Budget Smartphone',
        'Affordable smartphone with decent performance and long battery life',
        'Mobile',
        299.99,
        true,
        [
          '128GB Storage',
          '48MP Camera',
          '5000mAh Battery',
          'Fast Charging',
          'Dual SIM',
          'Android 14',
        ],
        {
          display: '6.5" IPS 90Hz',
          camera: '48MP main + 8MP ultrawide',
          storage: '128GB + microSD',
          battery: '5000mAh',
          processor: 'Snapdragon 4 Gen 2',
          os: 'Android 14',
        },
        ['smartphone', 'budget', 'long-battery', 'android', 'dual-sim', 'affordable']
      ),

      new Product(
        '16',
        'Tablet 11-inch',
        'Versatile tablet perfect for work, creativity, and entertainment',
        'Mobile',
        649.99,
        true,
        [
          '11-inch Display',
          'Stylus Support',
          'Keyboard Compatible',
          'All-day Battery',
          'Face Recognition',
          'USB-C',
        ],
        {
          display: '11" LCD 2388x1668',
          processor: 'M1 Chip',
          storage: '128GB',
          battery: '10 hours',
          accessories: 'Magic Keyboard, Apple Pencil compatible',
          camera: '12MP rear, 12MP front',
        },
        ['tablet', 'stylus', 'productivity', 'creative', 'entertainment', 'portable']
      ),

      new Product(
        '17',
        'Smart Watch Ultra',
        'Advanced smartwatch with health monitoring and outdoor adventure features',
        'Mobile',
        499.99,
        true,
        [
          'Health Monitoring',
          'GPS',
          'Waterproof',
          'Long Battery',
          'Cellular',
          'Adventure Features',
        ],
        {
          display: '1.9" Always-on OLED',
          health: 'Heart rate, ECG, SpO2, temperature',
          gps: 'Dual-frequency GPS + GLONASS',
          battery: '36 hours normal use',
          resistance: 'Water resistant to 100m',
          connectivity: '4G LTE + Wi-Fi + Bluetooth',
        },
        ['smartwatch', 'health', 'gps', 'waterproof', 'cellular', 'adventure']
      ),

      // Home Appliances (8 products)
      new Product(
        '18',
        'Smart Coffee Maker',
        'WiFi-enabled coffee maker with app control and programmable brewing',
        'Appliances',
        249.99,
        false,
        [
          'WiFi Enabled',
          'App Control',
          '12-cup capacity',
          'Programmable',
          'Auto-clean',
          'Thermal Carafe',
        ],
        {
          capacity: '12 cups',
          material: 'Stainless steel',
          connectivity: 'WiFi',
          features: ['programmable', 'auto-shutoff', 'app-control', 'strength-selector'],
          carafe: 'Thermal stainless steel',
          filter: 'Permanent gold-tone filter',
        },
        ['kitchen', 'coffee', 'smart', 'wifi', 'automatic', 'programmable']
      ),

      new Product(
        '19',
        'Air Fryer Smart',
        'Large capacity smart air fryer with multiple cooking presets and app connectivity',
        'Appliances',
        199.99,
        true,
        [
          '8-Quart Capacity',
          'Smart App',
          'Multiple Presets',
          'Touch Screen',
          'Non-stick',
          'Dishwasher Safe',
        ],
        {
          capacity: '8 quarts',
          presets: '12 cooking presets',
          connectivity: 'Wi-Fi + App control',
          display: 'Touch screen',
          temperature: '170°F - 400°F',
          timer: '1-60 minutes',
        },
        ['kitchen', 'air-fryer', 'smart', 'healthy-cooking', 'large-capacity', 'app-control']
      ),

      new Product(
        '20',
        'Robot Vacuum Cleaner',
        'Intelligent robot vacuum with mapping, scheduling, and self-emptying base',
        'Appliances',
        599.99,
        true,
        [
          'Smart Mapping',
          'Auto-Empty Base',
          'App Control',
          'Voice Assistant',
          'Multi-Floor',
          'Pet Hair',
        ],
        {
          navigation: 'LiDAR mapping',
          suction: '2700Pa',
          runtime: '180 minutes',
          dustbin: 'Auto-empty for 60 days',
          connectivity: 'Wi-Fi + App',
          compatibility: 'Alexa, Google Assistant',
        },
        ['vacuum', 'robot', 'smart', 'mapping', 'auto-empty', 'pet-hair']
      ),

      new Product(
        '21',
        'Smart Thermostat',
        'Energy-saving smart thermostat with learning capabilities and remote control',
        'Appliances',
        179.99,
        true,
        [
          'Learning Algorithm',
          'Remote Control',
          'Energy Saving',
          'Voice Control',
          'Easy Install',
          'Scheduling',
        ],
        {
          compatibility: 'Most HVAC systems',
          connectivity: 'Wi-Fi',
          display: 'Color touchscreen',
          sensors: 'Temperature, humidity, occupancy',
          savings: 'Up to 15% on energy bills',
          installation: 'C-wire adapter included',
        },
        ['thermostat', 'smart', 'energy-saving', 'learning', 'voice-control', 'scheduling']
      ),

      new Product(
        '22',
        'Smart Doorbell Camera',
        'HD video doorbell with two-way audio, motion detection, and cloud storage',
        'Appliances',
        149.99,
        true,
        [
          '1080p HD Video',
          'Two-way Audio',
          'Motion Detection',
          'Night Vision',
          'Cloud Storage',
          'Mobile Alerts',
        ],
        {
          video: '1080p HD with 160° field of view',
          audio: 'Two-way communication',
          detection: 'Smart motion zones',
          storage: 'Cloud storage included',
          power: 'Battery or hardwired',
          weather: 'IP65 weather resistant',
        },
        ['doorbell', 'camera', 'security', 'smart', 'motion-detection', 'cloud']
      ),

      new Product(
        '23',
        'Smart LED Light Bulbs (4-pack)',
        'Color-changing smart LED bulbs with voice control and scheduling',
        'Appliances',
        79.99,
        true,
        [
          '16 Million Colors',
          'Voice Control',
          'Scheduling',
          'Energy Efficient',
          'No Hub Required',
          'Long Life',
        ],
        {
          brightness: '800 lumens (60W equivalent)',
          colors: '16 million colors + whites',
          connectivity: 'Wi-Fi (no hub needed)',
          lifespan: '25,000 hours',
          energy: '9W LED',
          compatibility: 'Alexa, Google, Apple HomeKit',
        },
        ['lighting', 'smart', 'led', 'color-changing', 'voice-control', 'energy-efficient']
      ),

      new Product(
        '24',
        'Instant Pot Electric Pressure Cooker',
        'Multi-functional electric pressure cooker with 7 cooking functions',
        'Appliances',
        89.99,
        true,
        [
          '7-in-1 Functions',
          '6-Quart Capacity',
          'Smart Programs',
          'Stainless Steel',
          'Safety Features',
          'Easy Clean',
        ],
        {
          capacity: '6 quarts',
          functions: 'Pressure cook, slow cook, rice, yogurt, steam, sauté, warm',
          programs: '13 smart programs',
          material: 'Stainless steel inner pot',
          safety: '10 safety mechanisms',
          accessories: 'Steaming rack, rice paddle, measuring cup',
        },
        ['kitchen', 'pressure-cooker', 'multi-function', 'instant-pot', 'smart-programs', 'easy']
      ),

      new Product(
        '25',
        'Smart Security Camera Set',
        '4-camera wireless security system with app monitoring and cloud storage',
        'Appliances',
        399.99,
        true,
        ['4 Cameras', 'Wireless', 'Night Vision', 'Motion Alerts', 'Cloud Storage', 'Mobile App'],
        {
          cameras: '4x 1080p wireless cameras',
          nightVision: 'Color night vision',
          storage: 'Cloud + local backup',
          alerts: 'Smart motion detection',
          power: 'Rechargeable batteries',
          weatherproof: 'IP65 rated',
        },
        ['security', 'camera', 'wireless', 'night-vision', 'motion-detection', 'cloud']
      ),

      // Sports & Fitness (5 products)
      new Product(
        '26',
        'Running Shoes Ultra',
        'Professional running shoes with advanced cushioning and energy return',
        'Sports',
        149.99,
        true,
        [
          'Advanced Cushioning',
          'Energy Return',
          'Lightweight',
          'Breathable',
          'Durable',
          'All-Weather',
        ],
        {
          cushioning: 'Boost foam midsole',
          upper: 'Engineered mesh',
          weight: '240g (size 9)',
          drop: '10mm heel-to-toe drop',
          terrain: 'Road running',
          durability: '500+ miles',
        },
        ['running', 'shoes', 'cushioning', 'lightweight', 'breathable', 'marathon']
      ),

      new Product(
        '27',
        'Yoga Mat Premium',
        'Eco-friendly yoga mat with superior grip and comfort',
        'Sports',
        79.99,
        true,
        [
          'Eco-friendly',
          'Non-slip Grip',
          'Extra Thick',
          'Alignment Lines',
          'Carrying Strap',
          'Easy Clean',
        ],
        {
          material: 'Natural rubber + microfiber',
          thickness: '6mm',
          size: '72" x 24"',
          grip: 'Wet/dry non-slip surface',
          features: 'Body alignment lines',
          care: 'Machine washable',
        },
        ['yoga', 'mat', 'eco-friendly', 'non-slip', 'thick', 'alignment']
      ),

      new Product(
        '28',
        'Fitness Tracker Watch',
        'Advanced fitness tracker with heart rate monitoring and GPS',
        'Sports',
        199.99,
        true,
        [
          'Heart Rate Monitor',
          'Built-in GPS',
          'Sleep Tracking',
          'Water Resistant',
          'Long Battery',
          'Smart Notifications',
        ],
        {
          sensors: 'Heart rate, GPS, accelerometer, gyroscope',
          battery: '7 days typical use',
          display: '1.4" color AMOLED',
          resistance: '5ATM water resistant',
          sports: '90+ sport modes',
          health: '24/7 health monitoring',
        },
        ['fitness', 'tracker', 'heart-rate', 'gps', 'waterproof', 'health']
      ),

      new Product(
        '29',
        'Adjustable Dumbbells Set',
        'Space-saving adjustable dumbbells from 5-50 lbs per hand',
        'Sports',
        299.99,
        true,
        [
          '5-50 lbs Each',
          'Quick Adjust',
          'Space Saving',
          'Durable',
          'Comfortable Grip',
          'Storage Rack',
        ],
        {
          weight: '5-50 lbs per dumbbell',
          adjustment: 'Quick-select dial',
          increment: '5 lb increments',
          construction: 'Steel plates with rubber coating',
          grip: 'Ergonomic handles',
          footprint: '24" x 12" with rack',
        },
        ['dumbbells', 'adjustable', 'home-gym', 'space-saving', 'strength-training', 'quick-adjust']
      ),

      new Product(
        '30',
        'Resistance Bands Set',
        'Complete resistance bands set with multiple resistance levels and accessories',
        'Sports',
        49.99,
        true,
        [
          '5 Resistance Levels',
          'Door Anchor',
          'Ankle Straps',
          'Handles',
          'Exercise Guide',
          'Portable',
        ],
        {
          bands: '5 bands with different resistance',
          resistance: '10-50 lbs per band',
          accessories: 'Door anchor, ankle straps, foam handles',
          material: 'Premium latex',
          guide: 'Exercise instruction manual',
          storage: 'Carry bag included',
        },
        ['resistance', 'bands', 'home-workout', 'portable', 'full-body', 'strength']
      ),

      // Fashion & Accessories (5 products)
      new Product(
        '31',
        'Designer Backpack',
        'Stylish and functional backpack perfect for work, travel, or daily use',
        'Fashion',
        129.99,
        true,
        [
          'Laptop Compartment',
          'Water Resistant',
          'Multiple Pockets',
          'Ergonomic',
          'Stylish Design',
          'Durable',
        ],
        {
          laptopSize: 'Up to 15.6 inches',
          material: 'Water-resistant polyester',
          capacity: '30 liters',
          pockets: '15+ compartments',
          straps: 'Padded shoulder straps',
          warranty: 'Lifetime warranty',
        },
        ['backpack', 'laptop', 'travel', 'work', 'water-resistant', 'ergonomic']
      ),

      new Product(
        '32',
        'Wireless Headphones Premium',
        'High-quality over-ear headphones with noise cancellation',
        'Fashion',
        299.99,
        true,
        [
          'Active Noise Cancelling',
          '30-hour Battery',
          'Hi-Res Audio',
          'Comfortable Fit',
          'Quick Charge',
          'Foldable',
        ],
        {
          drivers: '40mm Hi-Res certified',
          anc: 'Hybrid active noise cancelling',
          battery: '30 hours ANC on',
          charging: '5 min = 3 hours playback',
          comfort: 'Memory foam ear cushions',
          design: 'Foldable for travel',
        },
        ['headphones', 'wireless', 'noise-cancelling', 'hi-res', 'premium', 'travel']
      ),

      new Product(
        '33',
        'Smartwatch Classic',
        'Elegant smartwatch combining classic design with modern features',
        'Fashion',
        349.99,
        true,
        [
          'Classic Design',
          'Health Tracking',
          'Smart Notifications',
          'Water Resistant',
          'Long Battery',
          'Multiple Straps',
        ],
        {
          display: '1.3" sapphire crystal',
          health: 'Heart rate, sleep, stress tracking',
          battery: '14 days typical use',
          resistance: 'Water resistant to 50m',
          materials: 'Stainless steel case',
          straps: 'Leather and silicone options',
        },
        ['smartwatch', 'classic', 'elegant', 'health', 'notifications', 'waterproof']
      ),

      new Product(
        '34',
        'Sunglasses Polarized',
        'Premium polarized sunglasses with UV protection and durable frame',
        'Fashion',
        89.99,
        true,
        [
          'Polarized Lenses',
          'UV Protection',
          'Lightweight Frame',
          'Scratch Resistant',
          'Multiple Colors',
          'Case Included',
        ],
        {
          lenses: 'Polarized polycarbonate',
          uvProtection: '100% UV400',
          frame: 'Lightweight aluminum',
          coating: 'Anti-scratch and anti-glare',
          colors: '5 frame colors available',
          accessories: 'Hard case and cleaning cloth',
        },
        ['sunglasses', 'polarized', 'uv-protection', 'lightweight', 'scratch-resistant', 'premium']
      ),

      new Product(
        '35',
        'Leather Wallet RFID',
        'Premium leather wallet with RFID blocking technology',
        'Fashion',
        59.99,
        true,
        [
          'Genuine Leather',
          'RFID Blocking',
          'Multiple Cards',
          'Coin Pocket',
          'Bill Compartment',
          'Compact Design',
        ],
        {
          material: 'Full-grain leather',
          rfid: 'RFID blocking technology',
          capacity: '12 card slots + 2 hidden pockets',
          features: 'Coin pocket with zipper',
          dimensions: '4.5" x 3.5" x 0.8"',
          colors: 'Black, brown, navy available',
        },
        ['wallet', 'leather', 'rfid', 'compact', 'premium', 'security']
      ),

      // Home & Garden (5 products)
      new Product(
        '36',
        'Indoor Plant Growing Kit',
        'Complete hydroponic growing system for herbs and vegetables',
        'Home & Garden',
        199.99,
        true,
        [
          'Hydroponic System',
          'LED Grow Light',
          '12 Pod Capacity',
          'Automatic Timer',
          'Nutrients Included',
          'App Control',
        ],
        {
          capacity: '12 plant pods',
          lighting: 'Full-spectrum LED grow light',
          automation: 'Automatic water circulation + timer',
          nutrients: '3-month supply included',
          app: 'Growing tips and monitoring',
          plants: 'Herbs, lettuce, tomatoes, peppers',
        },
        ['gardening', 'hydroponic', 'indoor', 'herbs', 'led-grow', 'automatic']
      ),

      new Product(
        '37',
        'Essential Oil Diffuser',
        'Ultrasonic aromatherapy diffuser with LED lighting and timer',
        'Home & Garden',
        69.99,
        true,
        [
          'Ultrasonic',
          '500ml Capacity',
          'LED Lighting',
          'Timer Settings',
          'Auto Shut-off',
          'Whisper Quiet',
        ],
        {
          capacity: '500ml water tank',
          runtime: 'Up to 10 hours continuous',
          lighting: '7-color LED lights',
          timer: '1H/3H/6H/continuous',
          coverage: 'Up to 430 sq ft',
          operation: 'Whisper-quiet ultrasonic',
        },
        ['aromatherapy', 'diffuser', 'essential-oils', 'led', 'quiet', 'relaxation']
      ),

      new Product(
        '38',
        'Smart Sprinkler Controller',
        'WiFi-enabled sprinkler controller with weather intelligence',
        'Home & Garden',
        149.99,
        true,
        [
          'WiFi Control',
          'Weather Intelligence',
          '8 Zones',
          'Water Savings',
          'Easy Install',
          'Mobile App',
        ],
        {
          zones: '8 zone control',
          weather: 'Automatic weather adjustments',
          savings: 'Up to 50% water savings',
          connectivity: 'Wi-Fi + mobile app',
          installation: 'DIY friendly',
          compatibility: 'Most existing sprinkler systems',
        },
        ['sprinkler', 'smart', 'wifi', 'water-saving', 'automation', 'weather']
      ),

      new Product(
        '39',
        'Outdoor Security Light',
        'Motion-activated LED security light with solar charging',
        'Home & Garden',
        79.99,
        true,
        [
          'Solar Powered',
          'Motion Sensor',
          'LED Bright Light',
          'Weather Resistant',
          'Easy Install',
          'No Wiring',
        ],
        {
          power: 'Solar panel + rechargeable battery',
          brightness: '2000 lumens',
          sensor: 'PIR motion detection up to 26ft',
          lighting: 'LED with 3 modes',
          weather: 'IP65 waterproof',
          installation: 'No wiring required',
        },
        ['security', 'solar', 'motion', 'led', 'outdoor', 'wireless']
      ),

      new Product(
        '40',
        'Garden Tool Set Premium',
        'Professional-grade garden tool set with ergonomic handles and storage case',
        'Home & Garden',
        129.99,
        true,
        [
          '10-Piece Set',
          'Ergonomic Handles',
          'Stainless Steel',
          'Storage Case',
          'Lifetime Warranty',
          'Professional Grade',
        ],
        {
          pieces:
            'Shovel, rake, hoe, trowel, pruner, weeder, cultivator, transplanter, gloves, case',
          material: 'Stainless steel heads with aluminum handles',
          handles: 'Ergonomic non-slip grips',
          storage: 'Organized carrying case',
          warranty: 'Lifetime manufacturer warranty',
          weight: '8 lbs total',
        },
        ['gardening', 'tools', 'professional', 'ergonomic', 'stainless-steel', 'warranty']
      ),
    ];
  }

  // Repository implementation methods
  async findAll(): Promise<Product[]> {
    return [...this.products];
  }

  async findById(id: string): Promise<Product | null> {
    const product = this.products.find(p => p.id === id);
    return product || null;
  }

  async findByCategory(category: string): Promise<Product[]> {
    return this.products.filter(p => p.category.toLowerCase() === category.toLowerCase());
  }

  async search(query: string): Promise<Product[]> {
    const lowerQuery = query.toLowerCase();
    return this.products.filter(
      product =>
        product.name.toLowerCase().includes(lowerQuery) ||
        product.description.toLowerCase().includes(lowerQuery) ||
        product.category.toLowerCase().includes(lowerQuery) ||
        product.features.some(feature => feature.toLowerCase().includes(lowerQuery)) ||
        product.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
        Object.values(product.specifications).some(spec =>
          String(spec).toLowerCase().includes(lowerQuery)
        )
    );
  }

  async save(product: Product): Promise<void> {
    const existingIndex = this.products.findIndex(p => p.id === product.id);
    if (existingIndex >= 0) {
      this.products[existingIndex] = product;
    } else {
      this.products.push(product);
    }
  }

  async delete(id: string): Promise<boolean> {
    const initialLength = this.products.length;
    this.products = this.products.filter(p => p.id !== id);
    return this.products.length < initialLength;
  }

  async findByPriceRange(minPrice: number, maxPrice: number): Promise<Product[]> {
    return this.products.filter(p => p.price >= minPrice && p.price <= maxPrice);
  }

  async findInStock(): Promise<Product[]> {
    return this.products.filter(p => p.inStock);
  }

  async findByTags(tags: string[]): Promise<Product[]> {
    return this.products.filter(product =>
      tags.some(tag =>
        product.tags.some(productTag => productTag.toLowerCase().includes(tag.toLowerCase()))
      )
    );
  }

  // Development utilities
  seed(): void {
    // Products are already seeded in constructor
    console.log(`✅ Seeded ${this.products.length} products`);
  }

  clear(): void {
    this.products = [];
    console.log('🧹 Cleared all products');
  }

  // Get product statistics
  getStats(): {
    total: number;
    inStock: number;
    outOfStock: number;
    categories: Record<string, number>;
    priceRange: { min: number; max: number; average: number };
  } {
    const inStock = this.products.filter(p => p.inStock).length;
    const categories: Record<string, number> = {};

    this.products.forEach(product => {
      categories[product.category] = (categories[product.category] || 0) + 1;
    });

    const prices = this.products.map(p => p.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;

    return {
      total: this.products.length,
      inStock,
      outOfStock: this.products.length - inStock,
      categories,
      priceRange: {
        min: minPrice,
        max: maxPrice,
        average: Math.round(avgPrice * 100) / 100,
      },
    };
  }
}
