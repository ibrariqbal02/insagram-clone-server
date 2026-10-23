import request from "supertest";
import app from "../../src/app";
import { getAccessTokenFromRequest, hashToken } from "../../src/utils/authTokens";

describe("security middleware", () => {
  it("sets security headers", async () => {
    const res = await request(app).get("/api/unknown");

    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });

  it("returns JSON 404 for unknown routes", async () => {
    const res = await request(app).get("/api/unknown");

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("rejects a login body that tries to inject a MongoDB operator", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ login: { $ne: null }, password: "anything123" });

    expect(res.status).toBe(400);
  });

  it("validates register input before touching the database", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "A", username: "ab", email: "not-an-email", password: "short" });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ success: false, message: expect.any(String) });
  });

  it("returns 400 for malformed JSON instead of 500", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send("{bad json");

    expect(res.status).toBe(400);
  });

  it("blocks CORS requests from unknown origins", async () => {
    const res = await request(app).get("/api/unknown").set("Origin", "https://evil.example");

    expect(res.status).toBe(403);
  });
});

describe("auth token helpers", () => {
  it("prefers the Bearer header over the cookie", () => {
    const req: any = {
      headers: { authorization: "Bearer header_token" },
      cookies: { accessToken: "cookie_token" },
    };

    expect(getAccessTokenFromRequest(req)).toBe("header_token");
  });

  it("falls back to the cookie", () => {
    const req: any = { headers: {}, cookies: { accessToken: "cookie_token" } };

    expect(getAccessTokenFromRequest(req)).toBe("cookie_token");
  });

  it("hashes deterministically without returning the input", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"));
    expect(hashToken("abc")).not.toBe("abc");
  });
});
