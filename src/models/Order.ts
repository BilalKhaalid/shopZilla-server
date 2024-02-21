import mongoose from "mongoose";

const orderItemsSchema = new mongoose.Schema({
  title: String,
  picture: String,
  price: Number,
  quantity: Number,
  productId: {
    type: mongoose.Types.ObjectId,
    ref: "Product",
  },
});

const OrderSchema = new mongoose.Schema(
  {
    shippingInfo: {
      address: {
        type: String,
        required: [true, "Address is required"],
      },
      city: {
        type: String,
        required: [true, "City is required"],
      },
      state: {
        type: String,
        required: [true, "State is required"],
      },
      country: {
        type: String,
        required: [true, "Country is required"],
      },
      pinCode: {
        type: Number,
        required: [true, "PinCode is required"],
      },
    },
    user: {
      type: String,
      ref: "User",
      required: [true, "User's id is required to place an order!"],
    },
    subtotal: {
      type: Number,
      required: true,
    },
    tax: {
      type: Number,
      required: true,
    },
    shippingCharges: {
      type: Number,
      required: true,
    },
    discount: {
      type: Number,
      required: true,
    },
    total: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["Processing", "Shipped", "Delivered"],
      default: "Processing",
    },
    orderItems: [orderItemsSchema],
  },
  { timestamps: true }
);

const Order = mongoose.model("order", OrderSchema);

export default Order;
