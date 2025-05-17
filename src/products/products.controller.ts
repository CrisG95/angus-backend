import {
  Controller,
  Post,
  Put,
  Get,
  Body,
  Query,
  UseGuards,
  Param,
} from '@nestjs/common';

import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '@auth/roles.guard';
import { Roles } from '@auth/roles.decorator';
import { User, UserPayload } from '@common/decorators/user.decorator';

import { ProductsService } from '@products/products.service';
import { CreateProductDto } from '@products/dto/create-product.dto';
import { UpdateProductDto } from '@products/dto/update-product.dto';
import { ListProductsDto } from '@products/dto/list-product.dto';

@Controller('products')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin', 'user')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  async createProduct(
    @Body() createProductDto: CreateProductDto,
    @User() user: UserPayload,
  ) {
    return this.productsService.createProduct(createProductDto, user.email);
  }

  @Put(':id')
  async updateProduct(
    @Body() updateProductDto: UpdateProductDto,
    @User() user: UserPayload,
    @Param('id') id: string,
  ) {
    return this.productsService.updateProduct(id, updateProductDto, user.email);
  }

  @Get('categories')
  async getProductCategories() {
    return this.productsService.getProductCategories();
  }

  @Get()
  async listProducts(@Query() filters: ListProductsDto) {
    return this.productsService.listProducts(filters);
  }

  @Get(':id')
  async getProductById(@Param('id') id: string) {
    return this.productsService.findById(id);
  }

}
