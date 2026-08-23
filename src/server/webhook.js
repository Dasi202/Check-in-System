const express = require('express');
const { checkinService } = require('../services/checkinService');
const router = express.Router();

// Webhook endpoint for print completion
router.post('/print-complete', async (req, res) => {
  try {
    const { jobId, attendeeId, status, timestamp } = req.body;
    
    // Verify webhook signature (security)
    const signature = req.headers['x-webhook-signature'];
    if (!verifySignature(req.body, signature)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    console.log(`📨 Webhook received: Job ${jobId} for ${attendeeId}`);
    
    if (status === 'COMPLETED') {
      // Update attendee status to CHECKED_IN
      const updated = await checkinService.handlePrintComplete(jobId, attendeeId);
      
      if (updated) {
        // Could trigger SSE update here
        console.log(`✅ Status updated for ${attendeeId}`);
        res.status(200).json({ success: true });
      } else {
        // Already checked in or status mismatch
        console.log(`ℹ️ No update needed for ${attendeeId}`);
        res.status(200).json({ success: true, message: 'No update needed' });
      }
    } else {
      // Handle failure case
      console.log(`❌ Print failed for ${attendeeId}`);
      res.status(200).json({ success: true });
    }
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

function verifySignature(payload, signature) {
  // Implement webhook signature verification
  const crypto = require('crypto');
  const secret = process.env.WEBHOOK_SECRET || 'your-secret-key';
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature || ''),
    Buffer.from(expectedSignature)
  );
}

module.exports = router;