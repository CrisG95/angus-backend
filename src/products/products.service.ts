import { Injectable, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, SortOrder } from 'mongoose';
import { omitBy, isNil } from 'lodash';

import { Product, ProductDocument } from '@products/schemas/product.schema';
import {
  ProductCategory,
  ProductCategoryDocument,
} from '@products/schemas/product.category.schema';
import {
  CreateProductDto,
  UpdateProductDto,
  ListProductsDto,
} from '@products/dto/index';
import { generateChangeHistory } from '@helpers/history.helper';

import { BaseCrudService } from '@common/services/base-crud.service';

import { PaginatedResult } from '@common/interfaces/paginated-result.interface';
import { toUppercaseStrings } from '@common/functions/toUpperCase.function';

@Injectable()
export class ProductsService extends BaseCrudService<ProductDocument> {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(ProductCategory.name)
    private productCategoryModel: Model<ProductCategoryDocument>,
  ) {
    super(productModel);
  }

  async createProduct(
    createProductDto: CreateProductDto,
    user: string,
  ): Promise<Product> {
    try {
      const uppercasedDto = toUppercaseStrings(createProductDto);

      const changeHistory = [
        {
          date: new Date(),
          user,
          changes: [{ field: 'create product', before: '', after: '' }],
        },
      ];
      const newProduct = new this.productModel({
        ...uppercasedDto,
        changeHistory,
      });
      return await newProduct.save();
    } catch (error) {
      throw new ConflictException(error.message);
    }
  }

  async updateProduct(
    id: string,
    updateProductDto: UpdateProductDto,
    user: string,
  ): Promise<ProductDocument> {
    const existingProduct = await this.findById(id, { lean: true });

    const changeEntry = generateChangeHistory(
      existingProduct,
      updateProductDto,
      user,
    );

    const updateOps: any = { ...updateProductDto };
    if (changeEntry) {
      updateOps.$push = { changeHistory: changeEntry };
    }

    try {
      const updated = await this.findOneAndUpdate({ _id: id }, updateOps, {
        lean: true,
        projection: '-__v',
        returnNew: true,
      });
      return updated;
    } catch (err) {
      throw new ConflictException(err.message);
    }
  }

  async listProducts(
    filters: ListProductsDto,
  ): Promise<PaginatedResult<ProductDocument>> {
    const {
      name,
      category,
      subCategory,
      codeBar,
      minPrice,
      maxPrice,
      minStock,
      maxStock,
      brand,
      provider,
      page = 1,
      limit = 10,
    } = filters;

    const filter = omitBy(
      {
        name: name ? new RegExp(name, 'i') : undefined,
        category,
        subCategory,
        codeBar,
        brand: brand ? new RegExp(brand, 'i') : undefined,
        provider: provider ? new RegExp(provider, 'i') : undefined,
        priceSell:
          minPrice !== undefined || maxPrice !== undefined
            ? {
                ...(minPrice !== undefined && { $gte: minPrice }),
                ...(maxPrice !== undefined && { $lte: maxPrice }),
              }
            : undefined,
        stock:
          minStock !== undefined || maxStock !== undefined
            ? {
                ...(minStock !== undefined && { $gte: minStock }),
                ...(maxStock !== undefined && { $lte: maxStock }),
              }
            : undefined,
      },
      isNil,
    ) as FilterQuery<ProductDocument>;

    return this.paginate(filter, {
      page,
      limit,
      lean: true,
      sort: { name: 1 } as Record<string, SortOrder>,
      projection: '-changeHistory -__v',
    });
  }

  async getProductCategories(): Promise<ProductCategoryDocument[]> {
    return this.productCategoryModel.find({ status: 'active' });
  }
}
