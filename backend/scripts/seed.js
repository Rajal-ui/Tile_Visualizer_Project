/**
 * Seeds the 5 fixed rooms (Living Room, Kitchen, Bedroom, Balcony, Bathroom).
 * Layouts and tiles are created via the admin panel/API since they require
 * uploaded images. Run: `npm run seed`.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { mongoUri } = require('../src/config/env');
const Room = require('../src/models/Room.model');

const ROOMS = [
  { name: 'Living Room', displayOrder: 1, description: 'Spacious layouts for living and family rooms' },
  { name: 'Kitchen', displayOrder: 2, description: 'Backsplash, flooring, and countertop-adjacent tile layouts' },
  { name: 'Bedroom', displayOrder: 3, description: 'Flooring and accent wall layouts for bedrooms' },
  { name: 'Balcony', displayOrder: 4, description: 'Weather-resistant flooring layouts for balconies' },
  { name: 'Bathroom', displayOrder: 5, description: 'Wall, floor, and ceiling layouts for bathrooms' },
];

async function run() {
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  for (const roomData of ROOMS) {
    const existing = await Room.findOne({ name: roomData.name });
    if (existing) {
      console.log(`- Room already exists: ${roomData.name}`);
      continue;
    }
    await Room.create(roomData);
    console.log(`✅ Created room: ${roomData.name}`);
  }

  console.log('Seeding complete.');
  process.exit(0);
}

run().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
