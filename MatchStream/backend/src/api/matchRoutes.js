import { Router } from "express";
import { matchService } from "../services/matchService.js";
import { authenticate, optionalAuth, validate, schemas, authorize } from "../middleware/index.js";
import { asyncHandler } from "../utils/helpers.js";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { status, sport, page, limit, search } = req.query;
    const result = await matchService.list({ status, sport, page, limit, search });
    res.json(result);
  })
);

router.get(
  "/live",
  asyncHandler(async (req, res) => {
    const matches = await matchService.getLiveMatches();
    res.json(matches);
  })
);

router.get(
  "/upcoming",
  asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    const matches = await matchService.getUpcomingMatches(limit);
    res.json(matches);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const match = await matchService.getById(req.params.id);
    if (!match) return res.status(404).json({ error: "Match not found" });
    res.json(match);
  })
);

router.post(
  "/",
  authenticate,
  authorize("admin", "editor"),
  validate(schemas.createMatch),
  asyncHandler(async (req, res) => {
    const match = await matchService.create(req.body);
    res.status(201).json(match);
  })
);

router.patch(
  "/:id",
  authenticate,
  authorize("admin", "editor"),
  validate(schemas.updateMatch),
  asyncHandler(async (req, res) => {
    const match = await matchService.update(req.params.id, req.body);
    if (!match) return res.status(404).json({ error: "Match not found" });
    res.json(match);
  })
);

router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  asyncHandler(async (req, res) => {
    await matchService.delete(req.params.id);
    res.json({ message: "Match deleted" });
  })
);

export default router;
