'use server';

import { revalidatePath } from 'next/cache';
import dbConnect from '@/lib/dbConnect';
import Product from '@/models/Product';
import {
  validateProduct,
  validateUpdateProduct,
  formatValidationErrors,
  type ProductInput,
  type UpdateProductInput
} from '@/lib/validations/Product';

type ActionResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
  errors?: Array<{ field: string; message: string }>;
};

export async function createProduct(formData: FormData): Promise<ActionResponse> {
  try {
    await dbConnect();
    const rawData = {
      name: formData.get('name'),
      description: formData.get('description'),
      price: Number(formData.get('price')),
      stock: Number(formData.get('stock')),
      category: formData.get('category'),
      images: formData.getAll('images').filter((img) => img !== ''),
      featured: formData.get('featured') === 'true' || formData.get('featured') === 'on'
    };
    const validationResult = validateProduct(rawData);

    if (!validationResult.success) {
      return {
        success: false,
        error: 'Validation failed',
        errors: formatValidationErrors(validationResult.error)
      };
    }
    const product = await Product.create(validationResult.data);

    revalidatePath('/dashboard/products');

    return {
      success: true,
      data: JSON.parse(JSON.stringify(product)),
      error: undefined
    };
  } catch (error: any) {
    console.error('Error creating product:', error);

    if (error.code === 11000) {
      return {
        success: false,
        error: 'A product with this name already exists'
      };
    }

    return {
      success: false,
      error: error.message || 'Failed to create product. Please try again.'
    };
  }
}

export async function updateProduct(
  id: string,
  formData: FormData
): Promise<ActionResponse> {
  try {
    await dbConnect();

    const rawData: Partial<ProductInput> = {};

    if (formData.has('name')) rawData.name = formData.get('name') as string;
    if (formData.has('description')) rawData.description = formData.get('description') as string;
    if (formData.has('price')) rawData.price = Number(formData.get('price'));
    if (formData.has('stock')) rawData.stock = Number(formData.get('stock'));
    if (formData.has('category')) rawData.category = formData.get('category') as any;
    if (formData.has('featured')) {
      rawData.featured = formData.get('featured') === 'true' || formData.get('featured') === 'on';
    }

    const images = formData.getAll('images').filter((img) => img !== '');
    if (images.length > 0) rawData.images = images as string[];

    const validationResult = validateUpdateProduct(rawData);

    if (!validationResult.success) {
      return {
        success: false,
        error: 'Validation failed',
        errors: formatValidationErrors(validationResult.error)
      };
    }

    const product = await Product.findByIdAndUpdate(
      id,
      validationResult.data,
      { new: true, runValidators: true }
    );

    if (!product) {
      return {
        success: false,
        error: 'Product not found'
      };
    }

    revalidatePath('/dashboard/products');
    revalidatePath(`/dashboard/products/${id}`);

    return {
      success: true,
      data: JSON.parse(JSON.stringify(product))
    };
  } catch (error: any) {
    console.error('Error updating product:', error);

    return {
      success: false,
      error: error.message || 'Failed to update product. Please try again.'
    };
  }
}

export async function deleteProduct(id: string): Promise<ActionResponse> {
  try {
    await dbConnect();

    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      return {
        success: false,
        error: 'Product not found'
      };
    }

    revalidatePath('/dashboard/products');

    return {
      success: true,
      data: { message: 'Product deleted successfully' }
    };
  } catch (error: any) {
    console.error('Error deleting product:', error);

    return {
      success: false,
      error: error.message || 'Failed to delete product. Please try again.'
    };
  }
}

export async function getProductById(id: string): Promise<ActionResponse> {
  try {
    await dbConnect();

    const product = await Product.findById(id);

    if (!product) {
      return {
        success: false,
        error: 'Product not found'
      };
    }

    return {
      success: true,
      data: JSON.parse(JSON.stringify(product))
    };
  } catch (error: any) {
    console.error('Error fetching product:', error);

    return {
      success: false,
      error: error.message || 'Failed to fetch product. Please try again.'
    };
  }
}

export async function getAllProducts(params?: {
  search?: string;
  category?: string;
  page?: number;
  limit?: number;
}): Promise<ActionResponse> {
  try {
    await dbConnect();

    const {
      search = '',
      category = '',
      page = 1,
      limit = 10
    } = params || {};

    const query: any = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (category) {
      query.category = category;
    }

    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      Product.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(query)
    ]);

    return {
      success: true,
      data: {
        products: JSON.parse(JSON.stringify(products)),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    };
  } catch (error: any) {
    console.error('Error fetching products:', error);

    return {
      success: false,
      error: error.message || 'Failed to fetch products. Please try again.'
    };
  }
}

export async function toggleFeaturedStatus(id: string): Promise<ActionResponse> {
  try {
    await dbConnect();

    const product = await Product.findById(id);

    if (!product) {
      return {
        success: false,
        error: 'Product not found'
      };
    }

    product.featured = !product.featured;
    await product.save();

    revalidatePath('/dashboard/products');
    revalidatePath(`/dashboard/products/${id}`);

    return {
      success: true,
      data: JSON.parse(JSON.stringify(product))
    };
  } catch (error: any) {
    console.error('Error toggling featured status:', error);

    return {
      success: false,
      error: error.message || 'Failed to update product. Please try again.'
    };
  }
}