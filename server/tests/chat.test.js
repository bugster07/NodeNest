
import "dotenv/config";
import { jest } from "@jest/globals";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

const mockCreate = jest.fn();

jest.unstable_mockModule("groq-sdk", () => ({
  default: class Groq {
    constructor() {
      this.chat = {
        completions: {
          create: mockCreate,
        },
      };
    }
  },
}));

const { default: app } = await import("../src/app.js");
const { default: User } = await import("../src/models/User.js");
const { default: Note } = await import("../src/models/Note.js");

let mongoServer;
let tokenA;
let tokenB;
let noteId;
let emptyNoteId;

async function registerAndLogin(email) {
  await request(app).post("/api/auth/register").send({
    name: "Chat Test User",
    email,
    password: "StrongPass123!",
  });

  const response = await request(app).post("/api/auth/login").send({
    email,
    password: "StrongPass123!",
  });

  return response.body.accessToken;
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  tokenA = await registerAndLogin("chat-a@example.com");
  tokenB = await registerAndLogin("chat-b@example.com");

  const userA = await User.findOne({ email: "chat-a@example.com" });

  const note = await Note.create({
    title: "JavaScript Notes",
    content: "JavaScript supports asynchronous programming.",
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

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

beforeEach(() => {
  jest.clearAllMocks();
});

const mockStream = async function* () {
  yield {
    choices: [{ delta: { content: "JavaScript supports " } }],
  };
  yield {
    choices: [{ delta: { content: "asynchronous programming." } }],
  };
};

describe("Ask Note API — Authentication and validation", () => {
  test("rejects requests without an access token", async () => {
    const response = await request(app)
      .post(`/api/notes/${noteId}/ask`)
      .send({ question: "What is JavaScript?" });

    expect(response.status).toBe(401);
  });

  test("rejects an invalid note ID", async () => {
    const response = await request(app)
      .post("/api/notes/invalid-id/ask")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ question: "What is JavaScript?" });

    expect(response.status).toBe(404);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  test("rejects a missing question", async () => {
    const response = await request(app)
      .post(`/api/notes/${noteId}/ask`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({});

    expect(response.status).toBe(400);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  test("rejects a question longer than 2000 characters", async () => {
    const response = await request(app)
      .post(`/api/notes/${noteId}/ask`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ question: "a".repeat(2001) });

    expect(response.status).toBe(400);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  test("does not allow a user to ask about another user's note", async () => {
    const response = await request(app)
      .post(`/api/notes/${noteId}/ask`)
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ question: "What is JavaScript?" });

    expect(response.status).toBe(404);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  test("rejects notes with no content", async () => {
    const response = await request(app)
      .post(`/api/notes/${emptyNoteId}/ask`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ question: "Explain this note" });

    expect(response.status).toBe(400);
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

describe("Ask Note API — Streaming", () => {
  test("streams the AI answer using SSE", async () => {
    mockCreate.mockResolvedValue(mockStream());

    const response = await request(app)
      .post(`/api/notes/${noteId}/ask`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ question: "What does JavaScript support?" });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("text/event-stream");
    expect(response.text).toContain("JavaScript supports");
    expect(response.text).toContain("[DONE]");
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  test("returns an error if the AI provider fails before streaming", async () => {
    mockCreate.mockRejectedValue(new Error("Mock provider failure"));

    const response = await request(app)
      .post(`/api/notes/${noteId}/ask`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ question: "Explain JavaScript" });

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
  });
});
