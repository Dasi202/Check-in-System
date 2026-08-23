const { redisClient } = require('../utils/redisClient');

// Store active SSE connections
const connections = new Map();

async function sseHandler(req, res) {
  const { attendeeId } = req.params;
  
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  // Send initial status
  const status = await redisClient.get(`status:${attendeeId}`);
  res.write(`data: ${JSON.stringify({ 
    type: 'STATUS_UPDATE', 
    status: status || 'NOT_CHECKED_IN',
    attendeeId
  })}\n\n`);

  // Store connection
  if (!connections.has(attendeeId)) {
    connections.set(attendeeId, new Set());
  }
  connections.get(attendeeId).add(res);

  // Keep connection alive with ping
  const pingInterval = setInterval(() => {
    res.write(': ping\n\n');
  }, 30000);

  // Cleanup on disconnect
  req.on('close', () => {
    clearInterval(pingInterval);
    if (connections.has(attendeeId)) {
      connections.get(attendeeId).delete(res);
      if (connections.get(attendeeId).size === 0) {
        connections.delete(attendeeId);
      }
    }
    res.end();
  });
}

// Function to push status updates
async function pushStatusUpdate(attendeeId, status) {
  if (connections.has(attendeeId)) {
    const data = JSON.stringify({
      type: 'STATUS_UPDATE',
      attendeeId,
      status,
      timestamp: new Date().toISOString()
    });
    
    for (const connection of connections.get(attendeeId)) {
      connection.write(`data: ${data}\n\n`);
    }
  }
}

module.exports = { sseHandler, pushStatusUpdate };