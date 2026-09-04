// backend/sync-db.js  (temporary, not part of any service, delete after use)
import 'dotenv/config';
import db from './models/index.js';

try {
  await db.sequelize.authenticate();
  console.log('Connected to Cloud SQL');
  await db.sequelize.sync();
  console.log('All tables created successfully');
} catch (err) {
  console.error('Sync failed:', err);
} finally {
  process.exit();
}