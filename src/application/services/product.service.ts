import {
  CreateProductDto,
  UpdateProductDto,
  ProductDto,
  ProductSearchDto,
} from '../dtos/product-dto';
import { CreateProduct } from '../use-cases/create-product';
import { DeleteProduct } from '../use-cases/delete-product';
import { SearchProducts } from '../use-cases/search-products';
import { UpdateProduct } from '../use-cases/update-product';

export class ProductService {
  constructor(
    private createProduct: CreateProduct,
    private updateProduct: UpdateProduct,
    private searchProducts: SearchProducts,
    private deleteProduct: DeleteProduct
  ) {}

  async create(dto: CreateProductDto): Promise<ProductDto> {
    return await this.createProduct.execute(dto);
  }

  async update(productId: string, dto: UpdateProductDto): Promise<ProductDto> {
    return await this.updateProduct.execute(productId, dto);
  }

  async search(searchDto: ProductSearchDto): Promise<ProductDto[]> {
    return await this.searchProducts.execute(searchDto);
  }

  async delete(productId: string): Promise<void> {
    return await this.deleteProduct.execute(productId);
  }
}
