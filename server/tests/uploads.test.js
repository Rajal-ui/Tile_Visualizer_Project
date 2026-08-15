import { describe, it, mock, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import request from "supertest";
import app from "../src/app.js";
import jwt from "jsonwebtoken";

import { cloudinaryService } from "../src/services/cloudinary.js";
import { Admin } from "../src/models/admin.js";

const JWT_SECRET = process.env.JWT_SECRET || "test_secret";
const generateToken = (role = "admin") => {
  return jwt.sign({ id: "testadminid", role }, JWT_SECRET, { expiresIn: "1h" });
};

describe("POST /api/uploads", () => {
  let originalUpload;
  
  beforeEach(() => {
    mock.method(Admin, "findById", async (id) => {
      if (id === "testadminid") return { _id: "testadminid", role: "superadmin" };
      if (id === "testuserid") return { _id: "testuserid", role: "user" };
      return null;
    });

    originalUpload = cloudinaryService.uploadTileImage;
    cloudinaryService.uploadTileImage = async (buffer, filename) => {
      return {
        url: `https://res.cloudinary.com/test/image/upload/v123/tile-visualizer/tiles/${filename}`,
        thumbnailUrl: `https://res.cloudinary.com/test/image/upload/c_fill,h_300,w_300/v123/tile-visualizer/tiles/${filename}`,
        publicId: `tile-visualizer/tiles/${filename}`,
      };
    };
  });

  afterEach(() => {
    cloudinaryService.uploadTileImage = originalUpload;
  });

  it("should upload a valid PNG image and return URLs", async () => {
    const token = generateToken("superadmin");
    const buffer = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82]); // minimal png signature

    const res = await request(app)
      .post("/api/uploads")
      .set("Cookie", [`jwt=${token}`])
      .attach("image", buffer, { filename: "test-tile.png", contentType: "image/png" });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.url.includes("test-tile.png"), true);
    assert.strictEqual(res.body.thumbnailUrl.includes("c_fill"), true);
  });

  it("should reject invalid file types", async () => {
    const token = generateToken("superadmin");
    const buffer = Buffer.from("hello world");

    const res = await request(app)
      .post("/api/uploads")
      .set("Cookie", [`jwt=${token}`])
      .attach("image", buffer, { filename: "test.txt", contentType: "text/plain" });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.includes("Invalid file type"), true);
  });

  it("should reject oversized payloads exceeding the upload limit", async () => {
    const token = generateToken("superadmin");
    const buffer = Buffer.alloc(11 * 1024 * 1024, "a"); // 11 MB buffer

    const res = await request(app)
      .post("/api/uploads")
      .set("Cookie", [`jwt=${token}`])
      .attach("image", buffer, { filename: "oversized.png", contentType: "image/png" });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(typeof res.body.error, "string");
    assert.strictEqual(res.body.error.includes("File too large"), true);
  });

  it("should accept uploads without authentication (public endpoint)", async () => {
    const buffer = Buffer.from([137, 80, 78, 71]);
    const res = await request(app)
      .post("/api/uploads")
      .attach("image", buffer, { filename: "test.png", contentType: "image/png" });

    assert.strictEqual(res.status, 200);
  });
});
