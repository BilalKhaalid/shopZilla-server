import express from "express";
import { adminOnly } from "../middlewares/authorization.js";
import { createPaymentIntent } from "../controllers/Payment.js";

const router = express.Router();

// ? Create a request for payment - /api/v1/payment/create
router.post("/create", createPaymentIntent);

export default router;
