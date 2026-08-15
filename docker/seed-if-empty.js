// Docker entrypoint helper: tell the container whether the demo catalogue has
// been seeded yet. Exit codes: 0 = data present (skip seed), 2 = empty (seed).
import mongoose from "mongoose";

await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });

const { Admin } = await import("/app/server/src/models/index.js");
const count = await Admin.estimatedDocumentCount();
console.log(`[entrypoint] Admin accounts found: ${count}`);
process.exit(count === 0 ? 2 : 0);