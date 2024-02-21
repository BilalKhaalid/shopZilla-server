import express from "express";
import {
  allOrders,
  deleteOrder,
  getSingleOrder,
  myOrders,
  newOrder,
  processOrder,
} from "../controllers/Order.js";
import { adminOnly } from "../middlewares/authorization.js";
const router = express.Router();

// ? Post - Create New Order - /api/v1/order/new
router.post("/new", newOrder);

// ? Get - Get My Orders - /api/v1/order/my
router.get("/my", adminOnly,myOrders);

// ? Get - Get All Orders - Admin Only - /api/v1/order/all
router.get("/all",  adminOnly,allOrders);

// ? Get - Get Single Order - Admin Only - /api/v1/order/:id
router.route("/:id").get( adminOnly,getSingleOrder).put( adminOnly,processOrder).delete( adminOnly,deleteOrder);

export default router;
