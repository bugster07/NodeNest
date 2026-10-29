
import crypto from "node:crypto";
import mongoose from "mongoose";
import Note from "../models/Note.js";

// Create a public read-only share link
export const createShareLink = async (req, res, next) => {
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
    }).select("+shareToken");

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found",
      });
    }

    if (!note.shareToken) {
      note.shareToken = crypto.randomBytes(32).toString("hex");
    }

    note.isShared = true;
    await note.save();

    return res.status(200).json({
      success: true,
      message: "Share link created successfully",
      shareToken: note.shareToken,
      shareUrl: `${process.env.CLIENT_URL || "http://localhost:5173"}/shared/${note.shareToken}`,
    });
  } catch (error) {
    next(error);
  }
};

// Public endpoint: read-only access, no authentication required
export const getSharedNote = async (req, res, next) => {
  try {
    const { token } = req.params;

    if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) {
      return res.status(404).json({
        success: false,
        message: "Shared note not found",
      });
    }

    const note = await Note.findOne({
      shareToken: token,
      isShared: true,
    }).select("title content tags sourceType summary keyPoints flashcards createdAt updatedAt");

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Shared note not found",
      });
    }

    return res.status(200).json({
      success: true,
      note,
    });
  } catch (error) {
    next(error);
  }
};

// Revoke a public share link
export const revokeShareLink = async (req, res, next) => {
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
    }).select("+shareToken");

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found",
      });
    }

    note.isShared = false;
    note.shareToken = null;

    await note.save();

    return res.status(200).json({
      success: true,
      message: "Share link revoked successfully",
    });
  } catch (error) {
    next(error);
  }
};
