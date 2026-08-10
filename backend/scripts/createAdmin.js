/**
 * Creates the single admin account for the system, using credentials from
 * .env (INITIAL_ADMIN_*). Run once: `npm run create-admin`.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { mongoUri, initialAdmin } = require('../src/config/env');
const Admin = require('../src/models/Admin.model');

async function run() {
  if (!initialAdmin.email || !initialAdmin.password) {
    console.error('INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD must be set in .env');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  const existing = await Admin.findOne({ email: initialAdmin.email.toLowerCase() });
  if (existing) {
    console.log(`Admin already exists: ${existing.email}`);
    process.exit(0);
  }

  const admin = await Admin.create({
    name: initialAdmin.name,
    email: initialAdmin.email,
    password: initialAdmin.password,
    role: 'super_admin',
  });

  console.log('✅ Admin account created:');
  console.log(`   Email: ${admin.email}`);
  console.log('   Password: (as set in .env INITIAL_ADMIN_PASSWORD)');
  console.log('   ⚠️  Please log in and change the password immediately.');

  process.exit(0);
}

run().catch((err) => {
  console.error('Failed to create admin:', err);
  process.exit(1);
});
