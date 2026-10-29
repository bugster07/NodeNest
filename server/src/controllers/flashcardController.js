
import mongoose from "mongoose";
import Note from "../models/Note.js";
import { generateFlashcards } from "../services/aiService.js";

export const createFlashcards = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({
        success: false,
        message: "Note not found",
      });
    }

    const note = await Note.findOne({
      _id: req.params.id,
      owner: req.userId,
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found",
      });
    }

    if (!note.content?.trim()) {
      return res.status(400).json({
        success: false,
        message: "This note has no content to generate flashcards",
      });
    }

    if (
      note.flashcards.length >= 5 &&
      note.flashcards.length <= 10 &&
      note.flashcardsGeneratedAt &&
      note.flashcardsGeneratedAt >= note.updatedAt
    ) {
      return res.status(200).json({
        success: true,
        cached: true,
        flashcards: note.flashcards,
      });
    }

    const result = await generateFlashcards(note.content);

    note.flashcards = result.flashcards;
    note.flashcardsGeneratedAt = new Date();

    await note.save();

    return res.status(200).json({
      success: true,
      cached: false,
      flashcards: note.flashcards,
    });
  } catch (error) {
    next(error);
  }
};
