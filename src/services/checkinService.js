const { redisClient } = require('../utils/redisClient');
const { printQueue } = require('../queue/queueConfig');
const { v4: uuidv4 } = require('uuid');

class CheckinService {
  constructor() {
    this.ATTENDEE_KEY = 'attendee:';
    this.STATUS_KEY = 'status:';
  }

  async processCheckin(attendeeId) {
    // Atomic check for duplicate scan
    const statusKey = `${this.STATUS_KEY}${attendeeId}`;
    const currentStatus = await redisClient.get(statusKey);

    // Handle duplicate scan
    if (currentStatus === 'CHECKED_IN') {
      return {
        success: false,
        message: 'Attendee already checked in',
        status: 'DUPLICATE',
        attendeeId
      };
    }

    if (currentStatus === 'PENDING') {
      return {
        success: false,
        message: 'Print job already in progress',
        status: 'PENDING',
        attendeeId
      };
    }

    // Set status to PENDING atomically
    const setResult = await redisClient.set(
      statusKey,
      'PENDING',
      'NX', // Only set if not exists
      'EX',
      300 // Expire after 5 minutes (safety)
    );

    if (!setResult) {
      // Race condition - another request got here first
      return {
        success: false,
        message: 'Concurrent check-in detected',
        status: 'CONFLICT',
        attendeeId
      };
    }

    // Get attendee details
    const attendeeData = await redisClient.get(
      `${this.ATTENDEE_KEY}${attendeeId}`
    );
    
    if (!attendeeData) {
      await redisClient.del(statusKey);
      throw new Error('Attendee not found');
    }

    const attendee = JSON.parse(attendeeData);

    // Create and queue print job
    const jobId = uuidv4();
    const printJob = {
      id: jobId,
      attendeeId,
      attendeeName: attendee.name,
      badgeData: {
        name: attendee.name,
        company: attendee.company,
        role: attendee.role,
        attendeeId: attendee.id
      },
      timestamp: new Date().toISOString()
    };

    // Add to queue with unique ID to prevent duplicates
    await printQueue.add('print-badge', printJob, {
      jobId,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000
      }
    });

    return {
      success: true,
      message: 'Print job queued',
      status: 'PENDING',
      attendeeId,
      jobId
    };
  }

  async handlePrintComplete(jobId, attendeeId) {
    const statusKey = `${this.STATUS_KEY}${attendeeId}`;
    
    // Only update if still PENDING (handle out-of-order callbacks)
    const currentStatus = await redisClient.get(statusKey);
    
    if (currentStatus === 'PENDING') {
      await redisClient.set(statusKey, 'CHECKED_IN');
      
      // Log completion
      console.log(`✅ Attendee ${attendeeId} checked in successfully`);
      
      return true;
    }
    
    // If already CHECKED_IN or something else, ignore
    console.log(`⚠️ Status not PENDING for ${attendeeId}: ${currentStatus}`);
    return false;
  }

  async getAttendeeStatus(attendeeId) {
    const statusKey = `${this.STATUS_KEY}${attendeeId}`;
    const status = await redisClient.get(statusKey);
    
    if (!status) {
      return { attendeeId, status: 'NOT_CHECKED_IN' };
    }
    
    return { attendeeId, status };
  }

  async initializeAttendees(attendees) {
    // Load test attendees into Redis
    for (const attendee of attendees) {
      await redisClient.set(
        `${this.ATTENDEE_KEY}${attendee.id}`,
        JSON.stringify(attendee)
      );
    }
    console.log(`✅ Loaded ${attendees.length} attendees`);
  }
}

module.exports = { checkinService: new CheckinService() };