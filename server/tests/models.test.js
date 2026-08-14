import test from "node:test";
import assert from "node:assert/strict";

// Model registration must not require a live MongoDB connection.
test("Mongoose models define without a live connection", async () => {
  const { Admin, CategoryTemplate, Tile, Project, Room } = await import(
    "../src/models/index.js"
  );
  assert.equal(Admin.modelName, "Admin");
  assert.equal(CategoryTemplate.modelName, "CategoryTemplate");
  assert.equal(Tile.modelName, "Tile");
  assert.equal(Project.modelName, "Project");
  assert.equal(Room.modelName, "Room");
});

test("model references and security defaults are wired", async () => {
  const { Admin, CategoryTemplate, Tile, Project, Room } = await import(
    "../src/models/index.js"
  );
  assert.equal(Tile.schema.paths.category.options.ref, "CategoryTemplate");
  assert.equal(Project.schema.paths.adminId.options.ref, "Admin");
  assert.equal(Tile.schema.paths.title.options.required, true);
  assert.equal(Admin.schema.paths.password.options.select, false);
  assert.equal(CategoryTemplate.schema.paths.room.options.enum.includes("kitchen"), true);
  assert.equal(Room.schema.paths.id.options.required, true);
  assert.equal(Room.schema.paths.isActive.options.default, true);
});
