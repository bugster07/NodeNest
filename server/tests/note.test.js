
import "dotenv/config";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";

import app from "../src/app.js";
import User from "../src/models/User.js";
import Note from "../src/models/Note.js";

let mongoServer;
let tokenA;
let tokenB;
let noteId;

const registerAndLogin = async (email) => {
  const registerResponse = await request(app)
    .post("/api/auth/register")
    .send({
      name: "Test User",
      email,
      password: "StrongPass123!",
    });

  if (registerResponse.status !== 201) {
    throw new Error(
      `Registration failed: ${JSON.stringify(registerResponse.body)}`
    );
  }

  const loginResponse = await request(app)
    .post("/api/auth/login")
    .send({
      email,
      password: "StrongPass123!",
    });

  if (loginResponse.status !== 200) {
    throw new Error(
      `Login failed: ${JSON.stringify(loginResponse.body)}`
    );
  }

  return loginResponse.body.accessToken;
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();

  await mongoose.connect(mongoServer.getUri());

  tokenA = await registerAndLogin("usera@example.com");
  tokenB = await registerAndLogin("userb@example.com");

  const userA = await User.findOne({
    email: "usera@example.com",
  });

  const note = await Note.create({
    title: "Private Note",
    content: "This note belongs to user A",
    owner: userA._id,
  });

  noteId = note._id.toString();
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();

  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe("Notes API — Authentication protection", () => {
  test("GET /api/notes rejects requests without token", async () => {
    const response = await request(app).get("/api/notes");

    expect(response.status).toBe(401);
  });

  test("POST /api/notes rejects requests without token", async () => {
    const response = await request(app)
      .post("/api/notes")
      .send({
        title: "Test Note",
        content: "Testing NoteNest",
      });

    expect(response.status).toBe(401);
  });

  test("GET /api/notes/:id rejects requests without token", async () => {
    const response = await request(app).get(
      `/api/notes/${noteId}`
    );

    expect(response.status).toBe(401);
  });

  test("DELETE /api/notes/:id rejects requests without token", async () => {
    const response = await request(app).delete(
      `/api/notes/${noteId}`
    );

    expect(response.status).toBe(401);
  });
});

describe("Notes API — CRUD operations", () => {
  test("User A can create a note", async () => {
    const response = await request(app)
      .post("/api/notes")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        title: "My New Note",
        content: "Testing note creation",
        tags: ["testing"],
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
  });

  test("User A can retrieve their own note", async () => {
    const response = await request(app)
      .get(`/api/notes/${noteId}`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  test("User A can update their own note", async () => {
    const response = await request(app)
      .patch(`/api/notes/${noteId}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        title: "Updated Private Note",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  test("User A can list their notes", async () => {
    const response = await request(app)
      .get("/api/notes")
      .set("Authorization", `Bearer ${tokenA}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  test("User A can delete their own note", async () => {
    const response = await request(app)
      .delete(`/api/notes/${noteId}`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});

describe("Notes API — Ownership isolation", () => {
  test("User B cannot retrieve User A's note", async () => {
    const response = await request(app)
      .get(`/api/notes/${noteId}`)
      .set("Authorization", `Bearer ${tokenB}`);

    expect(response.status).toBe(404);
  });

  test("User B cannot update User A's note", async () => {
    const response = await request(app)
      .patch(`/api/notes/${noteId}`)
      .set("Authorization", `Bearer ${tokenB}`)
      .send({
        title: "Unauthorized Update",
      });

    expect(response.status).toBe(404);
  });

  test("User B cannot delete User A's note", async () => {
    const response = await request(app)
      .delete(`/api/notes/${noteId}`)
      .set("Authorization", `Bearer ${tokenB}`);

    expect(response.status).toBe(404);
  });
});
