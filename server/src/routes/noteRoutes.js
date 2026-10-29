
import { Router } from "express";

import { aiRateLimiter } from "../middleware/aiRateLimiter.js";
import { protect } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/upload.js";

import { summarizeNote } from "../controllers/aiController.js";
import { createFlashcards } from "../controllers/flashcardController.js";
import { askNote } from "../controllers/chatController.js";

import {
  createNote,
  getNotes,
  getNoteById,
  updateNote,
  deleteNote,
} from "../controllers/noteController.js";

import { uploadNote } from "../controllers/uploadController.js";

const router = Router();

// All note routes require authentication
router.use(protect);

// AI routes — maximum 20 requests per hour per user
router.post("/:id/summarize", aiRateLimiter, summarizeNote);
router.post("/:id/flashcards", aiRateLimiter, createFlashcards);
router.post("/:id/ask", aiRateLimiter, askNote);

// Upload PDF/TXT and extract text
router.post("/upload", upload.single("file"), uploadNote);

// Create and list notes
router.route("/")
  .post(createNote)
  .get(getNotes);

// Get, update, or delete a specific note
router.route("/:id")
  .get(getNoteById)
  .patch(updateNote)
  .delete(deleteNote);

export default router;
