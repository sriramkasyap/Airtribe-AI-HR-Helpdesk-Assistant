import mongoose from 'mongoose';
import { seedDatabase } from './seed';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hr-helpdesk';

async function main(): Promise<void> {
  await mongoose.connect(uri);
  await seedDatabase();
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error('Seeding failed:', error);
  process.exit(1);
});
