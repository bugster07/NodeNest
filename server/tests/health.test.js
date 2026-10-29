
import "dotenv/config";
import request from "supertest";
import app from "../src/app.js";

describe("Health Check API", () => {
  test("GET /api/health should return 200", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe(
      "NoteNest API is running!"
    );
  });
});
