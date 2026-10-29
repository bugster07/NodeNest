
import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";

import {
  createShareLink,
  getSharedNote,
  revokeShareLink,
} from "../controllers/shareController.js";

const router = Router();

// Public route — no login required
router.get("/:token", getSharedNote);

// Owner-only routes
router.post("/:id", protect, createShareLink);
router.delete("/:id", protect, revokeShareLink);

export default router;
