
import "dotenv/config";
import { jest } from "@jest/globals";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

jest.unstable_mockModule("../src/services/aiService.js", () => ({
  generateSummary: jest.fn(),
  generateFlashcards: jest.fn(),
}));

const { default: app } = await import("../src/app.js");
const { default: User } = await import("../src/models/User.js");
const { default: Note } = await import("../src/models/Note.js");
const { generateSummary, generateFlashcards } =
  await import("../src/services/aiService.js");

let mongoServer;
let tokenA;
let tokenB;
let noteId;
let emptyNoteId;

const summaryResult = {
  summary: "A concise test summary.",
  keyPoints: [
    "First key point",
    "Second key point",
    "Third key point",
    "Fourth key point",
    "Fifth key point",
  ],
};

const flashcardResult = {
  flashcards: [
    { question: "What is Node.js?", answer: "A JavaScript runtime." },
    { question: "What is Express?", answer: "A Node.js web framework." },
    { question: "What is MongoDB?", answer: "A document database." },
    { question: "What is JWT?", answer: "A token format for claims." },
    { question: "What is middleware?", answer: "A function in the request-response cycle." },
  ],
};

async function createUserAndLogin(email) {
  const registration = await request(app)
    .post("/api/auth/register")
    .send({
      name: "AI Test User",
      email,
      password: "StrongPass123!",
    });

  expect(registration.status).toBe(201);

  const login = await request(app)
    .post("/api/auth/login")
    .send({
      email,
      password: "StrongPass123!",
    });

  expect(login.status).toBe(200);
  return login.body.accessToken;
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  tokenA = await createUserAndLogin("ai-user-a@example.com");
  tokenB = await createUserAndLogin("ai-user-b@example.com");

  const userA = await User.findOne({ email: "ai-user-a@example.com" });

  const note = await Note.create({
    title: "Node.js Notes",
    content: "Node.js runs JavaScript outside the browser.",
    owner: userA._id,
  });

  noteId = note._id.toString();

  const emptyNote = await Note.create({
    title: "Empty Note",
    content: "",
    owner: userA._id,
  });

  emptyNoteId = emptyNote._id.toString();
}, 60000);

beforeEach(() => {
  jest.clearAllMocks();
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

describe("AI Summary API", () => {
  test("rejects requests without authentication", async () => {
    const response = await request(app)
      .post(`/api/notes/${noteId}/summarize`);

    expect(response.status).toBe(401);
  });

  test("returns 404 for an invalid note ID", async () => {
    const response = await request(app)
      .post("/api/notes/not-an-id/summarize")
      .set("Authorization", `Bearer ${tokenA}`);

    expect(response.status).toBe(404);
    expect(generateSummary).not.toHaveBeenCalled();
  });

  test("returns 404 when another user requests the note", async () => {
    const response = await request(app)
      .post(`/api/notes/${noteId}/summarize`)
      .set("Authorization", `Bearer ${tokenB}`);

    expect(response.status).toBe(404);
    expect(generateSummary).not.toHaveBeenCalled();
  });

  test("rejects notes with no content", async () => {
    const response = await request(app)
      .post(`/api/notes/${emptyNoteId}/summarize`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(response.status).toBe(400);
    expect(generateSummary).not.toHaveBeenCalled();
  });

  test("generates a summary and five key points", async () => {
    generateSummary.mockResolvedValue(summaryResult);

    const response = await request(app)
      .post(`/api/notes/${noteId}/summarize`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.cached).toBe(false);
    expect(response.body.summary).toBe(summaryResult.summary);
    expect(response.body.keyPoints).toHaveLength(5);
    expect(generateSummary).toHaveBeenCalledTimes(1);
  });

  test("returns the cached summary when it is still valid", async () => {
    const note = await Note.findById(noteId);
    note.summary = summaryResult.summary;
    note.keyPoints = summaryResult.keyPoints;
    await note.save();

    // Save again with a timestamp newer than updatedAt.
    note.summaryGeneratedAt = new Date(Date.now() + 1000);
    await Note.updateOne(
      { _id: noteId },
      { $set: { summaryGeneratedAt: note.summaryGeneratedAt } }
    );

    const response = await request(app)
      .post(`/api/notes/${noteId}/summarize`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(response.status).toBe(200);
    expect(response.body.cached).toBe(true);
    expect(generateSummary).not.toHaveBeenCalled();
  });
});

describe("Flashcards API", () => {
  test("rejects requests without authentication", async () => {
    const response = await request(app)
      .post(`/api/notes/${noteId}/flashcards`);

    expect(response.status).toBe(401);
  });

  test("returns 404 when another user requests flashcards", async () => {
    const response = await request(app)
      .post(`/api/notes/${noteId}/flashcards`)
      .set("Authorization", `Bearer ${tokenB}`);

    expect(response.status).toBe(404);
    expect(generateFlashcards).not.toHaveBeenCalled();
  });

  test("rejects notes with no content", async () => {
    const response = await request(app)
      .post(`/api/notes/${emptyNoteId}/flashcards`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(response.status).toBe(400);
    expect(generateFlashcards).not.toHaveBeenCalled();
  });

  test("generates flashcards successfully", async () => {
    generateFlashcards.mockResolvedValue(flashcardResult);

    const response = await request(app)
      .post(`/api/notes/${noteId}/flashcards`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.cached).toBe(false);
    expect(response.body.flashcards).toHaveLength(5);
    expect(response.body.flashcards[0]).toHaveProperty("question");
    expect(response.body.flashcards[0]).toHaveProperty("answer");
    expect(generateFlashcards).toHaveBeenCalledTimes(1);
  });

  test("returns cached flashcards when they are still valid", async () => {
    const note = await Note.findById(noteId);
    note.flashcards = flashcardResult.flashcards;
    await note.save();

    note.flashcardsGeneratedAt = new Date(Date.now() + 1000);
    await Note.updateOne(
      { _id: noteId },
      { $set: { flashcardsGeneratedAt: note.flashcardsGeneratedAt } }
    );

    const response = await request(app)
      .post(`/api/notes/${noteId}/flashcards`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(response.status).toBe(200);
    expect(response.body.cached).toBe(true);
    expect(generateFlashcards).not.toHaveBeenCalled();
  });
});
