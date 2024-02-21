import { stripe } from "../index.js";
import { TryCatch } from "../middlewares/error.js";
import ErrorHandler from "../utils/classes.js";

const createPaymentIntent = TryCatch(async (req, res, next) => {
  const { amount } = req.body;

  if (!amount) return next(new ErrorHandler("Enter an amount to proceed", 400));

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Number(amount) * 100,
    currency: "pkr",
  });
  return res.status(201).json({
    success: true,
    clientSecret: paymentIntent.client_secret,
  });
});

export { createPaymentIntent };
