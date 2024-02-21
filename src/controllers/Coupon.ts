import { TryCatch } from "../middlewares/error.js";
import Coupon from "../models/Coupon.js";
import ErrorHandler from "../utils/classes.js";

const newCoupon = TryCatch(async (req, res, next) => {
  const { couponCode, amount } = req.body;
  if (!couponCode || !amount) {
    return next(new ErrorHandler("Please enter couponCode and amount", 400));
  }

  const coupon = await Coupon.create({
    couponCode,
    amount,
  });
  return res.status(201).json({
    success: true,
    message: `Coupon Created Successfully!`,
    code: `CouponCode: ${coupon.couponCode} `,
    amount: `Amount: ${coupon.amount} `,
  });
});

const applyDiscount = TryCatch(async (req, res, next) => {
  const { couponCode } = req.query;
  if (!couponCode) {
    return next(
      new ErrorHandler("Please enter a coupon to apply discount", 400)
    );
  }

  const discount = await Coupon.findOne({ couponCode });

  if (!discount) {
    return next(new ErrorHandler("Invalid Coupon Code", 400));
  }

  return res.status(200).json({
    success: true,
    message: `Discount of $${discount.amount} applied successfully!`,
    discount: discount.amount,
  });
});

const allCoupons = TryCatch(async (req, res, next) => {
  const allCoupons = await Coupon.find();
  return res.status(200).json({
    success: true,
    message: `All Coupons fetched successfully!`,
    allCoupons,
  });
});

const deleteCoupon = TryCatch(async (req, res, next) => {
  const { id } = req.params;
  const deletedCoupon = await Coupon.findByIdAndDelete(id);
  if (!deletedCoupon) {
    return next(new ErrorHandler("Coupon not found", 404));
  }
  return res.status(200).json({
    success: true,
    message: `Coupon: ${deletedCoupon?.couponCode} deleted successfully!`,
  });
});

export { newCoupon, applyDiscount, allCoupons, deleteCoupon };
