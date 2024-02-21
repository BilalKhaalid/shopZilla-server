import { rm } from "fs";
import { TryCatch } from "../middlewares/error.js";
import ProductModel from "../models/Product.js";
import ErrorHandler from "../utils/classes.js";
import { SearchRequestQuery, baseQuery } from "../types/types.js";
import { Request } from "express";
import { nodeCache } from "../index.js";
import { invalidateCache } from "../utils/feature.js";

//?  Controller for creating a new product
const newProduct = TryCatch(async (req, res, next) => {
  //?  Extracting data from the request body
  const { title, price, stock, category } = req.body;

  //?  Checking if the product photo is provided
  const picture = req.file;
  if (!picture)
    return next(new ErrorHandler("Product's Photo is required", 400));

  //?  Checking if all required fields are provided
  if (!title || !price || !stock || !category) {
    //?  Delete the uploaded picture if validation fails
    rm(picture.path, () => {
      console.log("Deleted Successfully!");
    });
    return next(new ErrorHandler("All fields are required", 400));
  }

  //?  Creating a new product in the database
  const product = await ProductModel.create({
    title,
    price,
    stock,
    category: category.toLowerCase(),
    picture: picture.path,
  });

  // ? Invalidating Cache when creating a product
  await invalidateCache({ product: true, admin: true });

  //?  Sending success response with the created product
  return res.status(201).json({
    success: true,
    message: `Product Completed successfully!`,
    product,
  });
});

//?  Controller for fetching the latest products

const getLatestProducts = TryCatch(async (req, res, next) => {
  let products;
  if (nodeCache.has("latest-products")) {
    products = JSON.parse(nodeCache.get("latest-products") as string);
  } else {
    //?  Fetching the latest products from the database
    products = await ProductModel.find()
      .sort({
        createdAt: -1,
      })
      .limit(5);
    nodeCache.set("latest-products", JSON.stringify(products));
  }

  return res.status(200).json({
    success: true,
    message: `Latest Products Fetched successfully!`,
    products,
  });
});

//?  Controller for fetching product categories
const getProductsCategories = TryCatch(async (req, res, next) => {
  let categories;
  if (req.query.category === "all") {
    // If category is 'all', fetch all products
    categories = await ProductModel.find();
  } else if (nodeCache.has("categories")) {
    // If categories are in cache, use them
    categories = JSON.parse(nodeCache.get("categories") as string);
  } else {
    // Fetch distinct product categories from the database
    categories = await ProductModel.distinct("category");
    nodeCache.set("categories", JSON.stringify(categories));
  }

  // Send success response with the product categories
  return res.status(200).json({
    success: true,
    message: `Products categories Fetched successfully!`,
    categories,
  });
});

//?  Controller for fetching all admin products
const getAdminProducts = TryCatch(async (req, res, next) => {
  let AdminProducts;
  if (nodeCache.has("all-products"))
    AdminProducts = JSON.parse(nodeCache.get("all-products") as string);
  else {
    AdminProducts = await ProductModel.find({});
    nodeCache.set("all-products", JSON.stringify(AdminProducts));
  }

  return res.status(200).json({
    success: true,
    AdminProducts,
  });
});

//?  Controller for fetching a single product by ID
const getSingleProduct = TryCatch(async (req, res, next) => {
  let product;
  const id = req.params.id;
  if (nodeCache.has(`product-${id}`)) {
    product = JSON.parse(nodeCache.get(`product-${id}`) as string);
  } else {
    //?  Fetching a single product by ID from the database
    product = await ProductModel.findById(id);
    //?  Handling case where the product is not found
    if (!product) return next(new ErrorHandler("Product Not Found", 404));
    nodeCache.set(`product-${id}`, JSON.stringify(product));
  }

  //?  Sending success response with the fetched product
  return res.status(200).json({
    success: true,
    message: "Single Product Fetched Successfully!",
    product,
  });
});

//?  Controller for updating a product by ID
const updateProduct = TryCatch(async (req, res, next) => {
  const { id } = req.params;
  const { title, price, stock, category } = req.body;
  const picture = req.file;

  //?  Fetching the product by ID from the database
  const product = await ProductModel.findById(id);

  //?  Handling case where the product is not found
  if (!product) return next(new ErrorHandler("Product Not Found", 404));

  //?  Handling picture update (if provided)
  if (picture) {
    //?  Remove the old picture
    rm(product.picture, () => {});
    //?  Update product with the new picture path
    product.picture = picture.path;
  }

  //?  Updating product properties if provided in the request body
  if (title) product.title = title;
  if (price) product.price = price;
  if (stock) product.stock = stock;
  if (category) product.category = category;

  //?  Saving the updated product in the database
  await product.save();
  // ? Invalidating Cache when updating a product
  await invalidateCache({ product: true, admin: true });

  //?  Sending success response with the updated product
  return res.status(200).json({
    success: true,
    message: "Product Updated Successfully!",
    product,
  });
});

//?  Controller for deleting a product by ID
const deleteProduct = TryCatch(async (req, res, next) => {
  const { id } = req.params;

  //?  Fetching the product by ID from the database
  const product = await ProductModel.findById(id);

  //?  Handling case where the product is not found
  if (!product) return next(new ErrorHandler("Product Not Found", 404));

  //?  Removing the picture associated with the product
  rm(product?.picture!, () => {});

  //?  Deleting the product from the database
  await product?.deleteOne();
  // ? Invalidating Cache when deleting a product

  await invalidateCache({ product: true, admin: true });

  //?  Sending success response with the deleted product
  return res.status(202).json({
    success: true,
    message: "Product Deleted Successfully!",
    product,
  });
});

const getAllFilteredProducts = TryCatch(
  async (req: Request<{}, {}, {}, SearchRequestQuery>, res, next) => {
    const { search, price, sort, category } = req.query;
    const page = Number(req.query.page || 1);
    const limit = 8;
    const skip = (page - 1) * limit;
    const BaseQuery: baseQuery = {};
    if (search)
      BaseQuery.title = {
        $regex: search,
        $options: "i",
      };
    if (price)
      BaseQuery.price = {
        $lte: Number(price),
      };
    if (category) BaseQuery.category = category;
    const productsPromise = ProductModel.find(BaseQuery)
      .sort(sort && { price: sort === "lowToHigh" ? 1 : -1 }) // Adjusted this line
      .limit(limit)
      .skip(skip);
    const FilteredPromise = ProductModel.find(BaseQuery);

    const [products, FilteredProducts] = await Promise.all([
      productsPromise,
      FilteredPromise,
    ]);
    const totalPages = Math.ceil(FilteredProducts.length / limit);
    res.status(200).json({
      success: true,
      products,
      totalPages,
    });
  }
);

//?  Exporting all controllers for use in routes
export {
  newProduct,
  getLatestProducts,
  getProductsCategories,
  getAdminProducts,
  getSingleProduct,
  updateProduct,
  deleteProduct,
  getAllFilteredProducts,
};
