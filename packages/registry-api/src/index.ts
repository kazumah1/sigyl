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