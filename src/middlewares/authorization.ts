// ? Middleware to make sure only admin is allowed to access specific routes

import { User } from "../models/User.js";
import ErrorHandler from "../utils/classes.js";
import { TryCatch } from "./error.js";

// Middleware to make sure only admin is allowed
export const adminOnly = TryCatch(async (req, res, next) => {
  const { id } = req.query;

  if (!id)
    return next(
      new ErrorHandler("Admin ID is required to access this route", 401)
    );

  const user = await User.findById(id);
  if (!user) return next(new ErrorHandler("User Not Found", 404));
  if (user.role !== "admin")
    return next(new ErrorHandler("Only admin can access this route", 403));

  next();
});
