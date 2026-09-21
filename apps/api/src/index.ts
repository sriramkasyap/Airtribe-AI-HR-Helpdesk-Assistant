import 'dotenv/config';
import app from './app';
import { connectDB } from './db/connection';

async function main() {
  await connectDB();
  
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

main();
