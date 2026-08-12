// Stub Cloudinary credentials BEFORE importing the service.
// In CI the real secrets are absent; these dummy values let the guard
// pass so the mocked cloudinary.uploader methods handle every call.
process.env.CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || "test_cloud";
process.env.CLOUDINARY_API_KEY    = process.env.CLOUDINARY_API_KEY    || "test_key";
process.env.CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || "test_secret";

import { describe, it, mock, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { v2 as cloudinary } from "cloudinary";
import { cloudinaryService } from "../src/services/cloudinary.js";

describe("Cloudinary Service", () => {
  let uploadStreamMock;
  let destroyMock;

  beforeEach(() => {
    // Mock the cloudinary uploader methods so no real HTTP calls are made.
    uploadStreamMock = mock.method(cloudinary.uploader, "upload_stream", (options, callback) => {
      return {
        end: (buffer) => {
          if (buffer.toString() === "FAIL") {
            callback(new Error("Cloudinary error"));
          } else {
            callback(null, {
              secure_url: "https://res.cloudinary.com/test/image/upload/v123/original.png",
              eager: [{ secure_url: "https://res.cloudinary.com/test/image/upload/c_fill/v123/thumb.webp" }],
              public_id: "test/original",
            });
          }
        },
      };
    });

    destroyMock = mock.method(cloudinary.uploader, "destroy", async () => {
      return { result: "ok" };
    });
  });

  afterEach(() => {
    uploadStreamMock.mock.restore();
    destroyMock.mock.restore();
  });

  it("should successfully upload an image and return urls", async () => {
    const buffer = Buffer.from("valid_image_data");
    const result = await cloudinaryService.uploadTileImage(buffer, "test.png");

    assert.strictEqual(result.url, "https://res.cloudinary.com/test/image/upload/v123/original.png");
    assert.strictEqual(result.thumbnailUrl, "https://res.cloudinary.com/test/image/upload/c_fill/v123/thumb.webp");
    assert.strictEqual(result.publicId, "test/original");

    // Verify eager transform options were passed correctly
    const callArgs = uploadStreamMock.mock.calls[0].arguments[0];
    assert.strictEqual(callArgs.folder, "tile-visualizer/tiles");
    assert.strictEqual(callArgs.eager[0].width, 300);
    assert.strictEqual(callArgs.eager[0].format, "webp");
  });

  it("should fallback to secure_url if eager transformation is missing", async () => {
    // Override the mock just for this test — no eager array returned
    uploadStreamMock.mock.restore();
    uploadStreamMock = mock.method(cloudinary.uploader, "upload_stream", (options, callback) => {
      return {
        end: (buffer) => {
          callback(null, {
            secure_url: "https://res.cloudinary.com/test/image/upload/v123/original.png",
            public_id: "test/original",
            // eager intentionally absent
          });
        },
      };
    });

    const buffer = Buffer.from("valid_image_data");
    const result = await cloudinaryService.uploadTileImage(buffer, "test.png");

    assert.strictEqual(result.url, "https://res.cloudinary.com/test/image/upload/v123/original.png");
    assert.strictEqual(result.thumbnailUrl, "https://res.cloudinary.com/test/image/upload/v123/original.png");
  });

  it("should throw an error if the upload stream fails", async () => {
    const buffer = Buffer.from("FAIL"); // triggers the error branch in the mock
    await assert.rejects(
      async () => cloudinaryService.uploadTileImage(buffer, "test.png"),
      /Cloudinary upload failed: Cloudinary error/
    );
  });

  it("should successfully delete an image", async () => {
    await cloudinaryService.deleteTileImage("test/original");
    assert.strictEqual(destroyMock.mock.calls.length, 1);
    assert.strictEqual(destroyMock.mock.calls[0].arguments[0], "test/original");
  });

  it("should not attempt to delete if publicId is missing", async () => {
    await cloudinaryService.deleteTileImage(null);
    assert.strictEqual(destroyMock.mock.calls.length, 0);
  });
});
