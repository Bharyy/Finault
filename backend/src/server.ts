import http from 'http';
import app from './app';
import { env } from './config/env';
import { initializeSocket } from './config/socket';

const server = http.createServer(app);

// Initialize Socket.io
const io = initializeSocket(server);

// Export for use in services
export { io };

server.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
  console.log(`API docs: http://localhost:${env.PORT}/api/docs`);
  console.log(`Health check: http://localhost:${env.PORT}/api/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
