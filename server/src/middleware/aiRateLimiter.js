
import rateLimit from "express-rate-limit";

export const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,

  // Each authenticated user gets their own limit.
  keyGenerator: (req) => req.userId,

  message: {
    success: false,
    message: "AI request limit reached. Try again in an hour.",
  },
});
