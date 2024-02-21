import express from "express";
import {
  deleteProduct,
  getAdminProducts,
  getAllFilteredProducts,
  getLatestProducts,
  getProductsCategories,
  getSingleProduct,
  newProduct,
  updateProduct,
} from "../controllers/Product.js";
import { singleUpload } from "../middlewares/multer.js";
import { adminOnly } from "../middlewares/authorization.js";

const router = express.Router();

// ? Create New Product - /api/v1/product/new
router.post("/new", singleUpload, newProduct);

// ? Get Latest Products - /api/v1/product/latest
router.get("/latest", getLatestProducts);

// ? Get - Get all Product with Filter- /api/v1/product/all/queries
router.get("/all", getAllFilteredProducts);

// ? Get Categories of Products - /api/v1/product/categories
router.get("/categories", getProductsCategories);

// ? Get Admin Products - /api/v1/product/admin-products
router.get("/admin-products", adminOnly, getAdminProducts);

// ! Remember always use all the other routes on top and dynamic routes at the end

// ? Get - Get a Single Product - /api/v1/product/:id
// ? Put - Update Single Product - /api/v1/product/:id
// ? Delete - Delete a Product - /api/v1/product/:id
router
  .route("/:id")
  .get(adminOnly, getSingleProduct)
  .put(adminOnly, singleUpload, updateProduct)
  .delete(adminOnly, deleteProduct);

export default router;
