import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  images: string[];
  featured: boolean;
  createdAt: Date;
  updatedAt: Date;
}


const ProductSchema: Schema<IProduct> = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [100, 'Product name cannot exceed 100 characters'],
      minlength: [3, 'Product name must be at least 3 characters long']
    },
    description: {
      type: String,
      required: [true, 'Product description is required'],
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    price: {
      type: Number,
      required: [true, 'Product price is required'],
      min: [0, 'Price cannot be negative'],
      validate: {
        validator: function(value: number) {
          return value >= 0;
        },
        message: 'Price must be a valid positive number'
      }
    },
    stock: {
      type: Number,
      required: [true, 'Product stock quantity is required'],
      min: [0, 'Stock cannot be negative'],
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: 'Stock must be a whole number'
      }
    },
    category: {
      type: String,
      required: [true, 'Product category is required'],
      trim: true,
      enum: {
        values: ['Electronics', 'Clothing', 'Food', 'Books', 'Home', 'Sports', 'Toys', 'Other'],
        message: '{VALUE} is not a valid category'
      }
    },
    images: {
      type: [String],
      default: [],
      validate: {
        validator: function(value: string[]) {
          return value.length <= 5;
        },
        message: 'Cannot upload more than 5 images per product'
      }
    },
    featured: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    
    toJSON: {
       virtuals: true,
       transform: function (doc, ret: Record<string, any>) {
          ret.id = ret._id.toString(); 
          delete ret._id;   
          delete ret.__v;  
          return ret;
  },
}
  }
);

ProductSchema.index({ name: 1 });
ProductSchema.index({ category: 1 });
ProductSchema.index({ price: 1 });
ProductSchema.index({ featured: 1 });


const Product: Model<IProduct> = 
  mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);

export default Product;