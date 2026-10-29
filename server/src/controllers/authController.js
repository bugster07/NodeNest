
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";

const generateAccessToken = (userId) =>
  jwt.sign(
    { userId },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m" }
  );

const generateRefreshToken = () => crypto.randomBytes(64).toString("hex");

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
});

export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already registered",
      });
    }

    const user = await User.create({ name, email, password });

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken();

    user.refreshToken = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    await user.save();

    res.cookie("refreshToken", refreshToken, cookieOptions());

    return res.status(200).json({
      success: true,
      message: "Login successful",
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Refresh token missing",
      });
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      refreshToken: hashedToken,
    }).select("+refreshToken");

    if (!user) {
      res.clearCookie("refreshToken", cookieOptions());
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    const newRefreshToken = generateRefreshToken();

    user.refreshToken = crypto
      .createHash("sha256")
      .update(newRefreshToken)
      .digest("hex");

    await user.save();

    const accessToken = generateAccessToken(user._id.toString());

    res.cookie("refreshToken", newRefreshToken, cookieOptions());

    return res.status(200).json({
      success: true,
      accessToken,
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken;

    if (token) {
      const hashedToken = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

      await User.updateOne(
        { refreshToken: hashedToken },
        { $set: { refreshToken: null } }
      );
    }

    res.clearCookie("refreshToken", cookieOptions());

    return res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    next(error);
  }
};
