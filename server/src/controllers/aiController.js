
import mongoose from "mongoose";
import Note from "../models/Note.js";
import { generateSummary } from "../services/aiService.js";

export const summarizeNote = async (req, res, next) => {
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
        message: "This note has no content to summarize",
      });
    }

    // Return cached result if the note has not changed.
    if (
      note.summary &&
      note.keyPoints.length === 5 &&
      note.summaryGeneratedAt &&
      note.summaryGeneratedAt >= note.updatedAt
    ) {
      return res.status(200).json({
        success: true,
        cached: true,
        summary: note.summary,
        keyPoints: note.keyPoints,
      });
    }

    const result = await generateSummary(note.content);

    note.summary = result.summary;
    note.keyPoints = result.keyPoints;
    note.summaryGeneratedAt = new Date();

    await note.save();

    return res.status(200).json({
      success: true,
      cached: false,
      summary: note.summary,
      keyPoints: note.keyPoints,
    });
  } catch (error) {
    next(error);
  }
};
