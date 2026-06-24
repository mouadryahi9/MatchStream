import { Router } from "express";
import { authService } from "../services/authService.js";
import { authenticate, validate, schemas, authLimiter, authorize } from "../middleware/index.js";
import { asyncHandler } from "../utils/helpers.js";

const router = Router();

router.post(
  "/register",
  authLimiter,
  validate(schemas.register),
  asyncHandler(async (req, res) => {
    try {
      const result = await authService.register(req.body);
      res.status(201).json(result);
    } catch (err) {
      res.status(409).json({ error: err.message });
    }
  })
);

router.post(
  "/login",
  authLimiter,
  validate(schemas.login),
  asyncHandler(async (req, res) => {
    try {
      const result = await authService.login(req.body);
      res.json(result);
    } catch (err) {
      res.status(401).json({ error: err.message });
    }
  })
);

router.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: "Refresh token required" });
    }
    try {
      const result = await authService.refresh(refreshToken);
      res.json(result);
    } catch (err) {
      res.status(401).json({ error: err.message });
    }
  })
);

router.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await authService.getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  })
);

router.get(
  "/users",
  authenticate,
  authorize("admin"),
  asyncHandler(async (req, res) => {
    const { page, limit } = req.query;
    const result = await authService.listUsers(parseInt(page) || 1, parseInt(limit) || 20);
    res.json(result);
  })
);

router.patch(
  "/users/:id/role",
  authenticate,
  authorize("admin"),
  asyncHandler(async (req, res) => {
    const { role } = req.body;
    if (!["admin", "editor", "viewer"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }
    await authService.updateUserRole(req.params.id, role);
    res.json({ message: "Role updated" });
  })
);

export default router;
