import mongoose from "mongoose";
import { trim } from "validator";

const ProductSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Product's title is required"],
    },
    picture: {
      type: String,
      required: [true, "Product's photo is required"],
    },
    price: {
      type: Number,
      required: [true, "Product's price is required"],
    },
    stock: {
      type: Number,
      required: [true, "Product's stock is required"],
    },
    category: {
      type: String,
      required: [true, "Product's category is required"],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Product = mongoose.model("Product", ProductSchema);

export default Product;
