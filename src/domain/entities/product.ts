export class Product {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    public readonly category: string,
    public readonly price: number,
    public readonly inStock: boolean,
    public readonly features: string[] = [],
    public readonly specifications: Record<string, any> = {},
    public readonly tags: string[] = []
  ) {}

  get searchableContent(): string {
    return `${this.name} ${this.description} ${
      this.category
    } ${this.features.join(" ")} ${this.tags.join(" ")}`;
  }
}
