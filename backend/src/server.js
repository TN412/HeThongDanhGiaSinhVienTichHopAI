require('dotenv').config();
const app = require('./app');
const { connectDB, disconnectDB } = require('./config/database');
const { flush: flushAppInsights } = require('./config/appInsights');
const { startMemoryTracking } = require('./middleware/monitoring');

const PORT = process.env.PORT || 5000;

/**
 * Start the server
 */
const startServer = async () => {
  try {
    // Connect to MongoDB (once at startup)
    await connectDB();

    // Start Express server
    const server = app.listen(PORT, () => {
      console.log('');
      console.log('='.repeat(50));
      console.log('🚀 AI Assessment System Backend Server');
      console.log('='.repeat(50));
      console.log(`📍 Server running at: http://localhost:${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
      console.log('='.repeat(50));
      console.log('');

      // Start memory tracking for Application Insights
      startMemoryTracking();
    });

    // Graceful shutdown
    const gracefulShutdown = async signal => {
      console.log(`\n⚠️  Received ${signal}. Starting graceful shutdown...`);

      // Flush Application Insights telemetry
      console.log('📊 Flushing Application Insights telemetry...');
      await flushAppInsights();

      server.close(async () => {
        console.log('🔌 HTTP server closed');
        await disconnectDB();
        console.log('👋 Server shut down successfully');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('⏰ Forced shutdown due to timeout');
        process.exit(1);
      }, 10000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', err => {
      console.error('💥 Uncaught Exception:', err);
      gracefulShutdown('uncaughtException');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('� Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('unhandledRejection');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

// Start the server
startServer();
