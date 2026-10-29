
import "dotenv/config";
import request from "supertest";
import app from "../src/app.js";

describe("Authentication API", () => {
  test("POST /api/auth/register rejects invalid email", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Test User",
        email: "invalid-email",
        password: "StrongPass123!",
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  test("POST /api/auth/register rejects short password", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Test User",
        email: "test@example.com",
        password: "123",
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  test("POST /api/auth/login rejects missing credentials", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  test("POST /api/auth/refresh rejects missing refresh cookie", async () => {
    const response = await request(app)
      .post("/api/auth/refresh");

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  test("POST /api/auth/logout succeeds without a refresh cookie", async () => {
    const response = await request(app)
      .post("/api/auth/logout");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
