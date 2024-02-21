import express from "express";
import userRoutes from "./routes/User.js";
import productRoutes from "./routes/Product.js";
import orderRoutes from "./routes/Order.js";
import couponRoutes from "./routes/Coupon.js";
import DashboardRoutes from "./routes/Stats.js";
import PaymentRoutes from "./routes/Payment.js";
import connectToDB from "./utils/connection.js";
import { errorMiddleware } from "./middlewares/error.js";
import NodeCache from "node-cache";
import { config } from "dotenv";
import morgan from "morgan";
import Stripe from "stripe";
import cors from "cors";

config({
  path: "./.env",
});

const app = express();
const PORT = process.env.PORT || 4000;
const mongoURI = process.env.MONGO_URI || "";
const StripeKey = process.env.STRIPE_KEY || "";
connectToDB(mongoURI);

const nodeCache = new NodeCache();
const stripe = new Stripe(StripeKey);

app.use(express.json());
app.use(morgan("dev"));
app.use(cors({}));

app.get("/", (req, res) => {
  res.send("<h1>Hello World! It is awesome:)</h1>");
});

// ! Routes
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/product", productRoutes);
app.use("/api/v1/order", orderRoutes);
app.use("/api/v1/coupon", couponRoutes);
app.use("/api/v1/dashboard", DashboardRoutes);
app.use("/api/v1/payment", PaymentRoutes);

app.use("/uploads/images", express.static("uploads/images"));
app.use(errorMiddleware);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

export { nodeCache, stripe };
