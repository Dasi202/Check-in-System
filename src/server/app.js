const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { checkinService } = require('../services/checkinService');
const { sseHandler } = require('./sse');
const webhookRoutes = require('./webhook');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.post('/api/checkin', async (req, res) => {
  try {
    const { attendeeId } = req.body;
    
    if (!attendeeId) {
      return res.status(400).json({ error: 'Attendee ID required' });
    }

    const result = await checkinService.processCheckin(attendeeId);
    res.json(result);
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/attendees/:id/status', async (req, res) => {
  try {
    const status = await checkinService.getAttendeeStatus(req.params.id);
    res.json(status);
  } catch (error) {
    res.status(404).json({ error: 'Attendee not found' });
  }
});

// SSE endpoint for real-time updates
app.get('/api/events/:attendeeId', sseHandler);

// Webhook routes
app.use('/api/webhook', webhookRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});