const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');

// Redis connection
const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null,
});

// Print queue
const printQueue = new Queue('print-queue', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

// Worker to process print jobs
const worker = new Worker(
  'print-queue',
  async (job) => {
    console.log(`🖨️ Processing print job: ${job.id}`);
    
    // Simulate vendor print processing time (1-3 seconds)
    const processingTime = 1000 + Math.random() * 2000;
    await new Promise(resolve => setTimeout(resolve, processingTime));
    
    // Simulate occasional failure (10% chance for testing)
    if (Math.random() < 0.1) {
      throw new Error('Printer temporarily unavailable');
    }
    
    // Simulate successful print
    console.log(`✅ Print job ${job.id} completed`);
    
    // Extract data for webhook
    const { attendeeId, attendeeName } = job.data;
    
    // Send webhook callback
    await sendWebhookCallback({
      jobId: job.id,
      attendeeId,
      attendeeName,
      status: 'COMPLETED',
      timestamp: new Date().toISOString()
    });
    
    return { success: true };
  },
  { connection }
);

// Webhook callback sender
async function sendWebhookCallback(data) {
  const webhookUrl = process.env.WEBHOOK_URL || 'http://localhost:3000/api/webhook/print-complete';
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': generateSignature(data) // Simple security
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      console.error('Webhook delivery failed:', response.status);
    }
  } catch (error) {
    console.error('Webhook delivery error:', error);
  }
}

function generateSignature(data) {
  // Simple signature for webhook verification
  const crypto = require('crypto');
  const secret = process.env.WEBHOOK_SECRET || 'your-secret-key';
  const payload = JSON.stringify(data);
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

// Handle worker events
worker.on('completed', (job) => {
  console.log(`✅ Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`❌ Job ${job.id} failed:`, err.message);
});

module.exports = { printQueue, worker, connection };