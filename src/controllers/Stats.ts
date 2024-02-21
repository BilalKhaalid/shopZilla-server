import { nodeCache } from "../index.js";
import { TryCatch } from "../middlewares/error.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import { User } from "../models/User.js";
import { calculatePercentage, getChartsData } from "../utils/feature.js";
import { getInventoryCategories } from "../utils/feature.js";
//?   This function fetches or calculates dashboard statistics and sends a response.

const getDashboardStats = TryCatch(async (req, res, next) => {
  //?  Initialize an empty object to store the dashboard statistics.
  let stats: object = {};
  const key = "admin-stats";
  //?  Check if the statistics are already cached, if yes, use the cached data.
  if (nodeCache.has(key)) {
    stats = JSON.parse(nodeCache.get(key) as string);
  } else {
    //?  If not cached, calculate statistics and store them in the cache.

    //?  Get the current date and the date six months ago.
    const today = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    //?  Define date ranges for the current month and the last month.
    const thisMonth = {
      start: new Date(today.getFullYear(), today.getMonth(), 1),
      end: today,
    };
    const lastMonth = {
      start: new Date(today.getFullYear(), today.getMonth() - 1, 1),
      end: new Date(today.getFullYear(), today.getMonth(), 0),
    };

    //?  Promises for fetching data related to products, users, and orders for the current and last month.
    const thisMonthProductsPromise = Product.find({
      createdAt: {
        $gte: thisMonth.start,
        $lte: thisMonth.end,
      },
    });
    const lastMonthProductsPromise = Product.find({
      createdAt: {
        $gte: lastMonth.start,
        $lte: lastMonth.end,
      },
    });
    const thisMonthUsersPromise = User.find({
      createdAt: {
        $gte: thisMonth.start,
        $lte: thisMonth.end,
      },
    });
    const lastMonthUsersPromise = User.find({
      createdAt: {
        $gte: lastMonth.start,
        $lte: lastMonth.end,
      },
    });
    const thisMonthOrdersPromise = Order.find({
      createdAt: {
        $gte: thisMonth.start,
        $lte: thisMonth.end,
      },
    });
    const lastMonthOrdersPromise = Order.find({
      createdAt: {
        $gte: lastMonth.start,
        $lte: lastMonth.end,
      },
    });

    const lastSixMonthsOrdersPromise = Order.find({
      createdAt: {
        $gte: sixMonthsAgo,
        $lte: today,
      },
    });

    const latestTransactionPromise = Order.find()
      .select(["orderItems", "total", "discount", "status"])
      .limit(4);

    //?  Await all promises simultaneously for better efficiency.
    const [
      thisMonthProducts,
      thisMonthUsers,
      thisMonthOrders,
      lastMonthProducts,
      lastMonthUsers,
      lastMonthOrders,
      ProductsCount,
      UsersCount,
      allOrders,
      lastSixMonthsOrders,
      categories,
      maleUsersCount,
      latestTransaction,
    ] = await Promise.all([
      thisMonthProductsPromise,
      thisMonthUsersPromise,
      thisMonthOrdersPromise,
      lastMonthProductsPromise,
      lastMonthUsersPromise,
      lastMonthOrdersPromise,
      Product.countDocuments(),
      User.countDocuments(),
      Order.find().select("total"),
      lastSixMonthsOrdersPromise,
      Product.distinct("category"),
      User.countDocuments({
        gender: "male",
      }),
      latestTransactionPromise,
    ]);
    //?  Calculate percentage changes for products, users, and orders.
    const change = {
      ProductPercentage: calculatePercentage(
        thisMonthProducts.length,
        lastMonthProducts.length
      ),
      UserPercentage: calculatePercentage(
        thisMonthUsers.length,
        lastMonthUsers.length
      ),
      OrderPercentage: calculatePercentage(
        thisMonthOrders.length,
        lastMonthOrders.length
      ),
    };

    //?  Calculate total revenue from all orders.
    const revenue = allOrders.reduce(
      (total, order) => total + (order.total || 0),
      0
    );

    //?  Create a count object with total counts for users, products, and orders.
    const count = {
      revenue,
      user: UsersCount,
      product: ProductsCount,
      order: allOrders.length,
    };
    //?  Create arrays for order counts and monthly revenue for the last six months.
    const OrderMonthsCount = new Array(6).fill(0);
    const OrderMonthlyRevenue = new Array(6).fill(0);

    //?  Populate the arrays based on the orders from the last six months.
    lastSixMonthsOrders.forEach((order) => {
      const creationDate = order.createdAt;
      const monthDiff = (today.getMonth() - creationDate.getMonth() + 12) % 12;
      if (monthDiff < 6) {
        OrderMonthsCount[6 - monthDiff - 1] += 1;
        OrderMonthlyRevenue[6 - monthDiff - 1] += order.total;
      }
    });

    //?  Prepare data for category count percentage.
    let categoryCountPercentage = await getInventoryCategories({
      categories,
      ProductsCount,
    });

    //?  Create a UsersRatio object with counts for male and female users.
    const UsersRatio = {
      male: maleUsersCount,
      female: UsersCount - maleUsersCount,
    };

    //?  Prepare data for the latest transactions.
    const transactions = latestTransaction.map((trans) => ({
      _id: trans._id,
      quantity: trans.orderItems.length,
      discount: trans.discount,
      status: trans.status,
      amount: trans.total,
    }));

    //?  Create the final stats object.
    stats = {
      count,
      change,
      charts: {
        OrderMonthsCount,
        OrderMonthlyRevenue,
      },
      categoryCountPercentage,
      UsersRatio,
      transactions,
    };
    //?  Cache the stats for future use.
    nodeCache.set(key, JSON.stringify(stats));
  }

  //?  Return the stats in the response.
  return res.status(200).json({
    success: true,
    message: "Dashboard Stats fetched successfully!",
    stats,
  });
});

const getPieCharts = TryCatch(async (req, res, next) => {
  //?  Initialize the charts object.
  let charts;
  const key = "admin-pie-charts";
  //?  Check if pie charts data is already cached; if yes, use the cached data.
  if (nodeCache.has(key)) {
    charts = JSON.parse(nodeCache.get(key) as string);
  } else {
    //?  If not cached, calculate pie chart data and store it in the cache.

    //?  Fetch various data related to orders, products, and users.
    const allOrdersPromise = Order.find({}).select([
      "total",
      "discount",
      "subtotal",
      "tax",
      "shippingCharges",
    ]);
    const [
      processingOrder,
      shippedOrder,
      deliveredOrder,
      categories,
      ProductsCount,
      ProductsOutOfStock,
      allOrders,
      UsersAge,
      adminUsers,
      allUsers,
    ] = await Promise.all([
      Order.countDocuments({ status: "Processing" }),
      Order.countDocuments({ status: "Shipped" }),
      Order.countDocuments({ status: "Delivered" }),
      Product.distinct("category"),
      Product.countDocuments(),
      Product.countDocuments({ stock: 0 }),
      allOrdersPromise,
      User.find().select("dob"),
      User.countDocuments({ role: "admin" }),
      User.countDocuments({ role: "user" }),
    ]);

    //?  Prepare an object representing the order fulfillment status.
    const orderFulfillment = {
      processing: processingOrder,
      shipped: shippedOrder,
      delivered: deliveredOrder,
    };

    //?  Prepare data for category count percentage.
    let ProductsCategories = await getInventoryCategories({
      categories,
      ProductsCount,
    });

    //?  Calculate stock availability statistics.
    const StockAvailability = {
      ProductsInStock: ProductsCount - ProductsOutOfStock,
      ProductsOutOfStock,
    };

    //?  Calculate various financial metrics related to order data.
    const GrossIncome = allOrders.reduce(
      (prev, order) => prev + (order.total || 0),
      0
    );
    const discount = allOrders.reduce(
      (prev, order) => prev + (order.discount || 0),
      0
    );
    const ProductionCost = allOrders.reduce(
      (prev, order) => prev + (order.shippingCharges || 0),
      0
    );
    const burnt = allOrders.reduce((prev, order) => prev + (order.tax || 0), 0);
    const marketingCost = Math.round(GrossIncome * (30 / 100));
    const netMargin =
      GrossIncome - discount - ProductionCost - burnt - marketingCost;

    //?  Prepare an object representing the distribution of revenue components.
    let revenueDistribution = {
      ProductionCost,
      discount,
      burnt,
      marketingCost,
      netMargin,
    };

    //?  Prepare an object representing the count of admin and user roles.
    const Users = {
      admins: adminUsers,
      customers: allUsers,
    };

    //?  Categorize users based on age groups.
    const teen = UsersAge.filter(
      (user) => user.age < 20 && user.age >= 14
    ).length;
    const adult = UsersAge.filter(
      (user) => user.age >= 20 && user.age < 40
    ).length;
    const old = UsersAge.filter((user) => user.age >= 40).length;

    //?  Prepare an object representing the count of users in different age groups.
    let UsersAgeGroup = {
      teen,
      adult,
      old,
    };

    //?  Create the final charts object.
    charts = {
      orderFulfillment,
      ProductsCategories,
      StockAvailability,
      revenueDistribution,
      Users,
      UsersAgeGroup,
    };

    //?  Cache the charts data for future use.
    nodeCache.set(key, JSON.stringify(charts));
  }

  //?  Return the charts data in the response.
  return res.status(200).json({
    success: true,
    charts,
  });
});

//? Define a function getBarCharts wrapped in a TryCatch block for error handling

const getBarCharts = TryCatch(async (req, res, next) => {
  //? Initialize a variable to hold the charts data
  let charts;
  //? Define a key to be used for caching
  const key = "admin-bar-charts";

  //? Check if the cache has data for the given key
  if (nodeCache.has(key)) {
    //? If cache data exists, parse it from string to JSON
    charts = JSON.parse(nodeCache.get(key) as string);
  } else {
    //? If no cache data exists, initialize an empty object for charts
    charts = {};
    //? Get the current date
    const today = new Date();
    //? Get the date six months ago
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    //? Get the date twelve months ago
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    //? Define promises to fetch products, users, and orders created within the last six months
    const SixMonthProductsPromise = Product.find({
      createdAt: {
        $gte: sixMonthsAgo,
        $lte: today,
      },
    }).select("createdAt");
    const SixMonthUsersPromise = User.find({
      createdAt: {
        $gte: sixMonthsAgo,
        $lte: today,
      },
    }).select("createdAt");
    //? Define a promise to fetch orders created within the last twelve months
    const TwelveMonthOrdersPromise = Order.find({
      createdAt: {
        $gte: twelveMonthsAgo,
        $lte: today,
      },
    }).select("createdAt");

    //? Wait for all promises to resolve and destructure the results into products, users, and orders
    const [products, users, orders] = await Promise.all([
      SixMonthProductsPromise,
      SixMonthUsersPromise,
      TwelveMonthOrdersPromise,
    ]);

    //? Get the count of products, users, and orders for the charts
    const productsCount = await getChartsData({
      length: 6,
      array: products,
      today,
    });
    const usersCount = await getChartsData({ length: 6, array: users, today });
    const ordersCount = await getChartsData({
      length: 12,
      array: orders,
      today,
    });

    //? Assign the counts to the charts object
    charts = {
      products: productsCount,
      users: usersCount,
      orders: ordersCount,
    };

    //? Cache the charts data by setting it in the nodeCache
    nodeCache.set(key, JSON.stringify(charts));
  }
  //? Return a successful response with the charts data
  return res.status(200).json({
    success: true,
    charts,
  });
});

const getLineCharts = TryCatch(async (req, res, next) => {
  let charts;
  const key = "admin-line-charts";
  if (nodeCache.has(key)) {
    charts = JSON.parse(nodeCache.get(key) as string);
  } else {
    const today = new Date();

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const baseQuery = {
      createdAt: {
        $gte: twelveMonthsAgo,
        $lte: today,
      },
    };
    const [products, users, orders] = await Promise.all([
      Product.find(baseQuery).select("createdAt"),
      User.find(baseQuery).select("createdAt"),
      Order.find(baseQuery).select(["createdAt", "discount", "total"]),
    ]);
    const productCounts = await getChartsData({
      length: 12,
      today,
      array: products,
    });
    const usersCounts = await getChartsData({
      length: 12,
      today,
      array: users,
    });
    const discount = await getChartsData({
      length: 12,
      today,
      array: orders,
      property: "discount",
    });
    const revenue = await getChartsData({
      length: 12,
      today,
      array: orders,
      property: "total",
    });

    charts = {
      users: usersCounts,
      products: productCounts,
      discount,
      revenue,
    };

    nodeCache.set(key, JSON.stringify(charts));
  }

  return res.status(200).json({
    success: true,
    charts,
  });
});

export { getDashboardStats, getPieCharts, getBarCharts, getLineCharts };
