const dotenv = require('dotenv');
const result = dotenv.config();
console.log('dotenv config result:', result);
console.log('=== ENVIRONMENT VARIABLES AT STARTUP ===');
console.log(process.env);
console.log('========================================');
console.log('GOOGLE_CLOUD_PROJECT_ID:', process.env.GOOGLE_CLOUD_PROJECT_ID);
console.log('GOOGLE_CLOUD_REGION:', process.env.GOOGLE_CLOUD_REGION);
console.log('GOOGLE_CLOUD_KEY_FILE_PATH:', process.env.GOOGLE_CLOUD_KEY_FILE_PATH);
console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY);
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log('GITHUB_APP_ID:', process.env.GITHUB_APP_ID);
console.log('GITHUB_PRIVATE_KEY:', process.env.GITHUB_PRIVATE_KEY ? '***SET***' : '***NOT SET***');
console.log('GITHUB_CLIENT_ID:', process.env.GITHUB_CLIENT_ID);
console.log('GITHUB_CLIENT_SECRET:', process.env.GITHUB_CLIENT_SECRET);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('FRONTEND_URL:', process.env.FRONTEND_URL);
console.log('ENCRYPTION_KEY:', process.env.ENCRYPTION_KEY ? '***SET***' : '***NOT SET***');

import 'dotenv/config';
import app from './app';
import { testConnection } from './config/database';

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('❌ Failed to connect to database');
      process.exit(1);
    }

    // Start the server
    app.listen(PORT, () => {
      console.log(`🚀 MCP Registry API running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`📦 API docs: http://localhost:${PORT}/api/v1/packages`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer(); 