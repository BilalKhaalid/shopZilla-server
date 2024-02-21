import express from "express";
import {
  allCoupons,
  applyDiscount,
  deleteCoupon,
  newCoupon,
} from "../controllers/Coupon.js";
import { adminOnly } from "../middlewares/authorization.js";

const router = express.Router();

// ? Apply the discount using coupon - Admin Route - /api/v1/coupon/discount
router.get("/discount", applyDiscount);

// ? Create a new Coupon - Admin Route - /api/v1/coupon/coupon/new
router.post("/new", adminOnly, newCoupon);

// ? Get All Coupons - Admin Route - /api/v1/coupon/all
router.get("/all", adminOnly, allCoupons);

// ? Get All Coupons - Admin Route - /api/v1/coupon/:id
router.delete("/:id", adminOnly, deleteCoupon);

export default router;
