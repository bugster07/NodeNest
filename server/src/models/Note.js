
import mongoose from "mongoose";

const noteSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 200,
    },

    content: {
      type: String,
      default: "",
      maxlength: 1000000,
    },

    tags: {
      type: [String],
      default: [],
    },

    sourceType: {
      type: String,
      enum: ["text", "pdf", "txt"],
      default: "text",
    },

    summary: {
      type: String,
      default: "",
    },

    keyPoints: {
      type: [String],
      default: [],
    },

    summaryGeneratedAt: {
      type: Date,
      default: null,
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    flashcards: {
      type: [
        {
          question: {
            type: String,
            required: true,
          },
          answer: {
            type: String,
            required: true,
          },
        },
      ],
      default: [],
    },

    flashcardsGeneratedAt: {
      type: Date,
      default: null,
    },

    // Public read-only sharing
    shareToken: {
      type: String,
      default: null,
      select: false,
    },

    isShared: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

noteSchema.index({ owner: 1, updatedAt: -1 });
noteSchema.index({ owner: 1, tags: 1 });

// Unique index ensures active share tokens cannot collide.
// Multiple notes can have null tokens.
noteSchema.index(
  { shareToken: 1 },
  {
    unique: true,
    partialFilterExpression: { shareToken: { $type: "string" } },
  }
);

const Note = mongoose.model("Note", noteSchema);

export default Note;
