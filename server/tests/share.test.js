
import request from "supertest";
import mongoose from "mongoose";
import { jest, describe, test, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";
import { MongoMemoryServer } from "mongodb-memory-server";

import "dotenv/config";

let app;
let mongoServer;
let User;
let Note;
let accessToken;
let noteId;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();

  process.env.MONGO_URI = mongoServer.getUri();

  const mongooseModule = await import("mongoose");
  await mongooseModule.default.connect(process.env.MONGO_URI);

  const appModule = await import("../src/app.js");
  app = appModule.default;

  User = (await import("../src/models/User.js")).default;
  Note = (await import("../src/models/Note.js")).default;
});

beforeEach(async () => {
  await Note.deleteMany({});
  await User.deleteMany({});

  const registerResponse = await request(app)
    .post("/api/auth/register")
    .send({
      name: "Share Test User",
      email: "sharetest@example.com",
      password: "Password123!",
    });

  expect(registerResponse.status).toBe(201);

  const loginResponse = await request(app)
    .post("/api/auth/login")
    .send({
      email: "sharetest@example.com",
      password: "Password123!",
    });

  expect(loginResponse.status).toBe(200);

  accessToken = loginResponse.body.accessToken;

  const note = await Note.create({
    title: "Sharing Test Note",
    content: "This note is shared for testing purposes.",
    owner: (await User.findOne({ email: "sharetest@example.com" }))._id,
  });

  noteId = note._id.toString();
});

afterAll(async () => {
  await mongoose.disconnect();

  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe("Note sharing API", () => {
  test("creates a public share link for the owner", async () => {
    const response = await request(app)
      .post(`/api/share/${noteId}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.shareToken).toMatch(/^[a-f0-9]{64}$/);
    expect(response.body.shareUrl).toContain(response.body.shareToken);

    const savedNote = await Note.findById(noteId).select("+shareToken");

    expect(savedNote.isShared).toBe(true);
    expect(savedNote.shareToken).toBe(response.body.shareToken);
  });

  test("rejects creating a share link without authentication", async () => {
    const response = await request(app).post(`/api/share/${noteId}`);

    expect(response.status).toBe(401);
  });

  test("returns 404 when a user tries to share another user's note", async () => {
    const otherUser = await User.create({
      name: "Another User",
      email: "another@example.com",
      password: "Password123!",
    });

    const otherNote = await Note.create({
      title: "Private Note",
      content: "Private content",
      owner: otherUser._id,
    });

    const response = await request(app)
      .post(`/api/share/${otherNote._id}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(404);
  });

  test("returns a shared note publicly without authentication", async () => {
    const createResponse = await request(app)
      .post(`/api/share/${noteId}`)
      .set("Authorization", `Bearer ${accessToken}`);

    const response = await request(app).get(
      `/api/share/${createResponse.body.shareToken}`
    );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.note.title).toBe("Sharing Test Note");
    expect(response.body.note.content).toBe(
      "This note is shared for testing purposes."
    );
  });

  test("returns 404 for an invalid share token", async () => {
    const response = await request(app).get("/api/share/invalid-token");

    expect(response.status).toBe(404);
  });

  test("revokes a share link and prevents further public access", async () => {
    const createResponse = await request(app)
      .post(`/api/share/${noteId}`)
      .set("Authorization", `Bearer ${accessToken}`);

    const token = createResponse.body.shareToken;

    const revokeResponse = await request(app)
      .delete(`/api/share/${noteId}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(revokeResponse.status).toBe(200);

    const publicResponse = await request(app).get(`/api/share/${token}`);

    expect(publicResponse.status).toBe(404);

    const savedNote = await Note.findById(noteId).select("+shareToken");

    expect(savedNote.isShared).toBe(false);
    expect(savedNote.shareToken).toBeNull();
  });

  test("returns 404 when another user tries to revoke a share link", async () => {
    const otherUser = await User.create({
      name: "Another User",
      email: "another@example.com",
      password: "Password123!",
    });

    const otherNote = await Note.create({
      title: "Private Note",
      content: "Private content",
      owner: otherUser._id,
      isShared: true,
      shareToken: "a".repeat(64),
    });

    const response = await request(app)
      .delete(`/api/share/${otherNote._id}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(404);
  });

  test("returns 404 when sharing a malformed note ID", async () => {
    const response = await request(app)
      .post("/api/share/not-a-valid-id")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(404);
  });
});
