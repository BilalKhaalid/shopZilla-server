import express from "express";
import { adminOnly } from "../middlewares/authorization.js";
import {
  getBarCharts,
  getDashboardStats,
  getLineCharts,
  getPieCharts,
} from "../controllers/Stats.js";

const router = express.Router();

// ? Route - /api/v1/dashboard/stats
router.get("/stats", adminOnly, getDashboardStats);

// ? Route - /api/v1/dashboard/pie
router.get("/pie", adminOnly, getPieCharts);

// ? Route - /api/v1/dashboard/bar
router.get("/bar", adminOnly, getBarCharts);

// ? Route - /api/v1/dashboard/line
router.get("/line", adminOnly, getLineCharts);

export default router;
