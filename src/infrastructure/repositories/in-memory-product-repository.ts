import { Product } from "@domain/entities/product";
import { IProductRepository } from "@domain/repositories/IProductRepository";

export class InMemoryProductRepository implements IProductRepository {
  private products: Product[] = [
    new Product(
      "1",
      "Gaming Laptop Pro",
      "High-performance gaming laptop with RTX 4070",
      "Electronics",
      1599.99,
      true,
      ["RTX 4070", "32GB RAM", "1TB SSD", "Intel i7-13700H", "165Hz Display"],
      {
        processor: "Intel i7-13700H",
        ram: "32GB DDR5",
        storage: "1TB NVMe SSD",
        graphics: "NVIDIA RTX 4070 8GB",
        display: '15.6" 165Hz QHD',
        weight: "2.3kg",
      },
      ["gaming", "laptop", "high-performance", "rtx", "portable"]
    ),
    new Product(
      "2",
      "Wireless Gaming Mouse",
      "Precision wireless gaming mouse with RGB lighting",
      "Electronics",
      79.99,
      true,
      ["Wireless", "RGB Lighting", "25000 DPI", "Ergonomic", "70-hour battery"],
      {
        connectivity: "Wireless 2.4GHz + Bluetooth",
        dpi: "25000",
        buttons: "7",
        battery: "70 hours",
        weight: "79g",
      },
      ["gaming", "mouse", "wireless", "rgb", "precision"]
    ),
    new Product(
      "3",
      "Smart Coffee Maker",
      "WiFi-enabled coffee maker with app control",
      "Appliances",
      249.99,
      false,
      [
        "WiFi Enabled",
        "App Control",
        "12-cup capacity",
        "Programmable",
        "Auto-clean",
      ],
      {
        capacity: "12 cups",
        material: "Stainless steel",
        connectivity: "WiFi",
        features: ["programmable", "auto-shutoff", "app-control"],
      },
      ["kitchen", "coffee", "smart", "wifi", "automatic"]
    ),
    new Product(
      "4",
      "Running Shoes Ultra",
      "Professional running shoes with advanced cushioning",
      "Sports",
      159.99,
      true,
      [
        "Advanced Cushioning",
        "Breathable Mesh",
        "Lightweight",
        "Durable",
        "Reflective",
      ],
      {
        material: "Engineered mesh upper",
        sole: "Carbon fiber plate",
        weight: "230g",
        drop: "8mm",
        support: "Neutral",
      },
      ["running", "sports", "fitness", "lightweight", "cushioning"]
    ),
    new Product(
      "5",
      "Smartphone Pro Max",
      "Latest flagship smartphone with advanced camera system",
      "Electronics",
      1199.99,
      true,
      ["5G", "256GB storage", "108MP camera", "Face ID", "Wireless charging"],
      {
        storage: "256GB",
        camera: "108MP triple system",
        connectivity: "5G",
        display: '6.7" Super AMOLED',
        battery: "5000mAh",
        charging: "Wireless + Fast charging",
      },
      ["smartphone", "mobile", "5g", "camera", "flagship"]
    ),
    new Product(
      "6",
      "Mechanical Keyboard RGB",
      "Premium mechanical keyboard with RGB backlighting",
      "Electronics",
      189.99,
      true,
      [
        "Mechanical Switches",
        "RGB Backlighting",
        "USB-C",
        "Aluminum Frame",
        "Hot-swappable",
      ],
      {
        switches: "Cherry MX Blue",
        backlighting: "Per-key RGB",
        connectivity: "USB-C + Wireless",
        material: "Aluminum alloy",
        layout: "Full-size",
      },
      ["keyboard", "mechanical", "rgb", "gaming", "typing"]
    ),
    new Product(
      "7",
      "Wireless Headphones Pro",
      "Noise-canceling wireless headphones",
      "Electronics",
      299.99,
      true,
      [
        "Active Noise Canceling",
        "Wireless",
        "30-hour battery",
        "Quick charge",
        "Touch controls",
      ],
      {
        driver: "40mm dynamic",
        battery: "30 hours ANC on",
        charging: "USB-C quick charge",
        weight: "250g",
        codec: "aptX HD",
      },
      ["headphones", "wireless", "noise-canceling", "audio", "premium"]
    ),
    new Product(
      "8",
      "Fitness Tracker Watch",
      "Advanced fitness tracker with heart rate monitoring",
      "Sports",
      199.99,
      true,
      [
        "Heart Rate Monitor",
        "GPS",
        "Sleep Tracking",
        "Waterproof",
        "7-day battery",
      ],
      {
        display: '1.4" AMOLED',
        battery: "7 days",
        sensors: "Heart rate, GPS, Accelerometer",
        waterproof: "5ATM",
        compatibility: "iOS/Android",
      },
      ["fitness", "tracker", "health", "gps", "smartwatch"]
    ),
  ];

  async findById(id: string): Promise<Product | null> {
    return this.products.find((product) => product.id === id) || null;
  }

  async findByName(name: string): Promise<Product[]> {
    const searchTerm = name.toLowerCase();
    return this.products.filter(
      (product) =>
        product.name.toLowerCase().includes(searchTerm) ||
        product.description.toLowerCase().includes(searchTerm)
    );
  }

  async findByCategory(category: string): Promise<Product[]> {
    return this.products.filter(
      (product) => product.category.toLowerCase() === category.toLowerCase()
    );
  }

  async findAll(): Promise<Product[]> {
    return [...this.products];
  }

  async save(product: Product): Promise<void> {
    const index = this.products.findIndex((p) => p.id === product.id);
    if (index >= 0) {
      this.products[index] = product;
    } else {
      this.products.push(product);
    }
  }

  async delete(id: string): Promise<void> {
    this.products = this.products.filter((p) => p.id !== id);
  }

  async findByTags(tags: string[]): Promise<Product[]> {
    return this.products.filter((product) =>
      tags.some((tag) => product.tags.includes(tag.toLowerCase()))
    );
  }

  async findByPriceRange(
    minPrice: number,
    maxPrice: number
  ): Promise<Product[]> {
    return this.products.filter(
      (product) => product.price >= minPrice && product.price <= maxPrice
    );
  }

  async findInStock(): Promise<Product[]> {
    return this.products.filter((product) => product.inStock);
  }

  async count(): Promise<number> {
    return this.products.length;
  }

  async updateStock(id: string, inStock: boolean): Promise<void> {
    const product = await this.findById(id);
    if (product) {
      const updatedProduct = new Product(
        product.id,
        product.name,
        product.description,
        product.category,
        product.price,
        inStock,
        product.features,
        product.specifications,
        product.tags
      );
      await this.save(updatedProduct);
    }
  }

  // Utility methods
  clear(): void {
    this.products = [];
  }

  seed(): void {
    // Reset to default products
    this.products = [
      new Product(
        "1",
        "Gaming Laptop Pro",
        "High-performance gaming laptop with RTX 4070",
        "Electronics",
        1599.99,
        true,
        ["RTX 4070", "32GB RAM", "1TB SSD", "Intel i7-13700H", "165Hz Display"],
        {
          processor: "Intel i7-13700H",
          ram: "32GB DDR5",
          storage: "1TB NVMe SSD",
          graphics: "NVIDIA RTX 4070 8GB",
        },
        ["gaming", "laptop", "high-performance", "rtx", "portable"]
      ),
    ];
  }
}
