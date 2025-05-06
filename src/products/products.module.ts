import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductsService } from '@products/products.service';
import { ProductsController } from '@products/products.controller';
import { Product, ProductSchema } from '@products/schemas/product.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }]),
  ],
  providers: [ProductsService],
  controllers: [ProductsController],
  exports: [ProductsService], // Exportamos el servicio para que AuthModule pueda usarlo
})
export class ProductsModule {}
