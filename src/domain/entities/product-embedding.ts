export class ProductEmbedding {
  constructor(
    public readonly id: string,
    public readonly productId: string,
    public readonly embedding: number[],
    public readonly metadata: Record<string, any>
  ) {}
}
