import app from './app';
import { testConnection } from './config/database';

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (dbConnected) {
      console.log('✅ Database connection successful');
    } else {
      console.warn('⚠️ Database connection failed, but continuing...');
    }

    // Start the server
    app.listen(PORT, () => {
      console.log(`🚀 Sigyl Registry API running on https://api.sigyl.dev`);
      console.log(`📊 Health check: https://api.sigyl.dev/health`);
      console.log(`📦 API docs: https://api.sigyl.dev/api/v1/packages`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer(); 