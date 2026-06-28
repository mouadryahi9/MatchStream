import { Router } from "express";
import { streamService } from "../services/streamService.js";
import { streamManager } from "../services/StreamManager.js";
import { authenticate, authorize, validate, schemas, streamLimiter } from "../middleware/index.js";
import { asyncHandler } from "../utils/helpers.js";

const router = Router();

router.post(
  "/",
  authenticate,
  authorize("admin", "editor"),
  validate(schemas.startStream),
  asyncHandler(async (req, res) => {
    try {
      const stream = await streamService.create(req.body);
      res.status(201).json(stream);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  })
);

router.get(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const { match_id, status, page, limit } = req.query;
    const result = await streamService.list({ match_id, status, page, limit });
    res.json(result);
  })
);

router.get(
  "/active",
  asyncHandler(async (req, res) => {
    const stats = streamManager.getStats();
    res.json(stats.channels);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const stream = await streamService.getById(req.params.id);
    if (!stream) return res.status(404).json({ error: "Stream not found" });
    res.json(stream);
  })
);

router.get(
  "/:id/status",
  asyncHandler(async (req, res) => {
    const status = await streamService.getStreamStatus(req.params.id);
    if (!status) return res.status(404).json({ error: "Stream not found" });
    res.json(status);
  })
);

router.post(
  "/:id/stop",
  authenticate,
  authorize("admin", "editor"),
  asyncHandler(async (req, res) => {
    await streamService.stop(req.params.id);
    res.json({ message: "Stream stop initiated" });
  })
);

router.post(
  "/:id/restart",
  authenticate,
  authorize("admin", "editor"),
  asyncHandler(async (req, res) => {
    await streamService.restart(req.params.id);
    res.json({ message: "Stream restart initiated" });
  })
);

export default router;
