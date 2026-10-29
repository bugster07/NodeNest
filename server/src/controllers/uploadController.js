
import Note from "../models/Note.js";
import { extractText } from "../services/fileService.js";

export const uploadNote = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a PDF or TXT file",
      });
    }

    const extractedText = await extractText(req.file);

    if (!extractedText.trim()) {
      return res.status(400).json({
        success: false,
        message: "No readable text found in file",
      });
    }

    const title =
      req.body.title?.trim() ||
      req.file.originalname.replace(/\.(pdf|txt)$/i, "");

    const note = await Note.create({
      title,
      content: extractedText,
      sourceType: req.file.mimetype === "application/pdf" ? "pdf" : "txt",
      tags: [],
      owner: req.userId,
    });

    return res.status(201).json({
      success: true,
      message: "File uploaded and text extracted successfully",
      note,
    });
  } catch (error) {
    next(error);
  }
};
