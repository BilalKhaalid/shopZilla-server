import { Document } from "mongoose";
import { nodeCache } from "../index.js";
import Product from "../models/Product.js";
import { OrderItemType, invalidateCacheProps } from "../types/types.js";

const invalidateCache = ({
  product,
  order,
  admin,
  userId,
  orderId,
  productId,
}: invalidateCacheProps) => {
  if (product) {
    const productKeys: string[] = [
      "latest-products",
      "categories",
      "all-products",
    ];

    if (typeof productId === "string") productKeys.push(`product-${productId}`);

    if (typeof productId === "object")
      productId.forEach((i) => productKeys.push(`product-${i}`));

    nodeCache.del(productKeys);
  }
  if (order) {
    const ordersKeys: string[] = [
      "all-orders",
      `my-orders-${userId}`,
      `order-${orderId}`,
    ];

    nodeCache.del(ordersKeys);
  }
  if (admin) {
    nodeCache.del([
      "admin-stats",
      "admin-pie-charts",
      "admin-bar-charts",
      "admin-line-charts",
    ]);
  }
};

const reduceStock = async (orderItems: OrderItemType[]) => {
  for (let i = 0; i < orderItems.length; i++) {
    const order = orderItems[i];
    const product = await Product.findById(order.productId);
    if (!product) throw new Error("Product Not Found");
    product.stock -= order.quantity;
    await product.save();
  }
};

const calculatePercentage = (thisMonth: number, lastMonth: number) => {
  if (lastMonth === 0) {
    return thisMonth * 100;
  }
  const percentage = ((thisMonth - lastMonth) / lastMonth) * 100;
  return Number(percentage.toFixed(0));
};

const getInventoryCategories = async ({
  categories,
  ProductsCount,
}: {
  categories: string[];
  ProductsCount: number;
}) => {
  const categoriesCountPromise = categories.map((category) =>
    Product.countDocuments({ category })
  );

  const categoriesCount = await Promise.all(categoriesCountPromise);

  const categoryCount: Record<string, number>[] = [];

  categories.forEach((category, i) => {
    categoryCount.push({
      [category]: Math.round((categoriesCount[i] / ProductsCount) * 100),
    });
  });

  return categoryCount;
};

interface ExtendedDocument extends Document {
  createdAt: Date;
  discount?: number;
  total?: number;
}
type getChartsDataProps = {
  array: ExtendedDocument[];
  today: Date;
  length: number;
  property?: "discount" | "total";
};

const getChartsData = async ({
  length,
  array,
  today,
  property,
}: getChartsDataProps) => {
  const data: number[] = new Array(length).fill(0);

  //?  Populate the arrays based on the orders from the last six months.
  array.forEach((order) => {
    const creationDate = order.createdAt;
    const monthDiff = (today.getMonth() - creationDate.getMonth() + 12) % 12;
    if (monthDiff < length) {
      if (property) {
        data[length - monthDiff - 1] += order[property]!;
      } else {
        data[length - monthDiff - 1] += 1;
      }
    }
  });
  return data;
};

export {
  invalidateCache,
  reduceStock,
  calculatePercentage,
  getInventoryCategories,
  getChartsData,
};
