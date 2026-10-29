
import "dotenv/config";
import { jest } from "@jest/globals";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

jest.unstable_mockModule("../src/services/fileService.js", () => ({
  extractText: jest.fn(),
}));

const { default: app } = await import("../src/app.js");
const { default: User } = await import("../src/models/User.js");
const { default: Note } = await import("../src/models/Note.js");
const { extractText } = await import("../src/services/fileService.js");

let mongoServer;
let token;

async function registerAndLogin() {
  const registration = await request(app)
    .post("/api/auth/register")
    .send({
      name: "Upload Test User",
      email: "upload-test@example.com",
      password: "StrongPass123!",
    });

  expect(registration.status).toBe(201);

  const login = await request(app)
    .post("/api/auth/login")
    .send({
      email: "upload-test@example.com",
      password: "StrongPass123!",
    });

  return login.body.accessToken;
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  token = await registerAndLogin();
}, 60000);

beforeEach(() => {
  jest.clearAllMocks();
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

describe("Upload API — Authentication", () => {
  test("rejects upload without an access token", async () => {
    const response = await request(app)
      .post("/api/notes/upload");

    expect(response.status).toBe(401);
  });
});

describe("Upload API — TXT files", () => {
  test("uploads a TXT file and creates a note", async () => {
    extractText.mockResolvedValue("This is extracted study content.");

    const response = await request(app)
      .post("/api/notes/upload")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", Buffer.from("Sample text"), {
        filename: "lecture.txt",
        contentType: "text/plain",
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.note.title).toBe("lecture");
    expect(response.body.note.content).toBe(
      "This is extracted study content."
    );
    expect(response.body.note.sourceType).toBe("txt");
    expect(extractText).toHaveBeenCalledTimes(1);
  });

  test("uses the provided title when uploading TXT", async () => {
    extractText.mockResolvedValue("Some notes.");

    const response = await request(app)
      .post("/api/notes/upload")
      .set("Authorization", `Bearer ${token}`)
      .field("title", "Biology Chapter")
      .attach("file", Buffer.from("Biology content"), {
        filename: "biology.txt",
        contentType: "text/plain",
      });

    expect(response.status).toBe(201);
    expect(response.body.note.title).toBe("Biology Chapter");
  });
});

describe("Upload API — PDF files", () => {
  test("uploads a PDF and creates a note", async () => {
    extractText.mockResolvedValue("Extracted PDF study content.");

    const response = await request(app)
      .post("/api/notes/upload")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", Buffer.from("%PDF-1.4 fake test PDF"), {
        filename: "lecture.pdf",
        contentType: "application/pdf",
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.note.sourceType).toBe("pdf");
    expect(response.body.note.content).toBe(
      "Extracted PDF study content."
    );
  });
});

describe("Upload API — Validation", () => {
  test("rejects a request without a file", async () => {
    const response = await request(app)
      .post("/api/notes/upload")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toMatch(/upload/i);
    expect(extractText).not.toHaveBeenCalled();
  });

  test("rejects unsupported file types", async () => {
    const response = await request(app)
      .post("/api/notes/upload")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", Buffer.from("fake image"), {
        filename: "photo.png",
        contentType: "image/png",
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(extractText).not.toHaveBeenCalled();
  });

  test("rejects files larger than 5 MB", async () => {
    const largeBuffer = Buffer.alloc(5 * 1024 * 1024 + 1, "a");

    const response = await request(app)
      .post("/api/notes/upload")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", largeBuffer, {
        filename: "large.txt",
        contentType: "text/plain",
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toMatch(/5 MB/i);
    expect(extractText).not.toHaveBeenCalled();
  });

  test("rejects files with no readable text", async () => {
    extractText.mockResolvedValue("   \n ");

    const response = await request(app)
      .post("/api/notes/upload")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", Buffer.from("empty"), {
        filename: "empty.txt",
        contentType: "text/plain",
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/readable text/i);
  });

  test("returns an error if text extraction fails", async () => {
    extractText.mockRejectedValue(new Error("Extraction failed"));

    const response = await request(app)
      .post("/api/notes/upload")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", Buffer.from("sample"), {
        filename: "broken.txt",
        contentType: "text/plain",
      });

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
  });
});
