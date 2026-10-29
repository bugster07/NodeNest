
import mongoose from "mongoose";
import Note from "../models/Note.js";

export const createNote = async (req, res, next) => {
  try {
    const { title, content = "", tags = [] } = req.body;

    const note = await Note.create({
      title,
      content,
      tags,
      owner: req.userId,
    });

    res.status(201).json({ success: true, note });
  } catch (error) {
    next(error);
  }
};

export const getNotes = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));

    const filter = { owner: req.userId };

    if (req.query.tag) {
      filter.tags = req.query.tag;
    }

    if (req.query.search) {
      const escaped = req.query.search.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );
      const regex = new RegExp(escaped, "i");
      filter.$or = [{ title: regex }, { content: regex }];
    }

    const sort =
      req.query.sort === "oldest" ? { createdAt: 1 } : { updatedAt: -1 };

    const [notes, total] = await Promise.all([
      Note.find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Note.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      notes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getNoteById = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: "Note not found" });
    }

    const note = await Note.findOne({
      _id: req.params.id,
      owner: req.userId,
    });

    if (!note) {
      return res.status(404).json({ success: false, message: "Note not found" });
    }

    res.status(200).json({ success: true, note });
  } catch (error) {
    next(error);
  }
};

export const updateNote = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: "Note not found" });
    }

    const { title, content, tags } = req.body;
    const updates = {};

    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (tags !== undefined) updates.tags = tags;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one field to update",
      });
    }

    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, owner: req.userId },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!note) {
      return res.status(404).json({ success: false, message: "Note not found" });
    }

    res.status(200).json({ success: true, note });
  } catch (error) {
    next(error);
  }
};

export const deleteNote = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: "Note not found" });
    }

    const note = await Note.findOneAndDelete({
      _id: req.params.id,
      owner: req.userId,
    });

    if (!note) {
      return res.status(404).json({ success: false, message: "Note not found" });
    }

    res.status(200).json({
      success: true,
      message: "Note deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
