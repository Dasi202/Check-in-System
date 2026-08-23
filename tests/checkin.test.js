const { checkinService } = require('../src/services/checkinService');
const { redisClient } = require('../src/utils/redisClient');

describe('Check-in System Tests', () => {
  const testAttendees = [
    { id: 'A001', name: 'Sarah Johnson', company: 'TechCorp', role: 'Engineer' },
    { id: 'A002', name: 'Michael Chen', company: 'DataFlow Inc', role: 'Data Scientist' },
    { id: 'A003', name: 'Emily Rodriguez', company: 'CloudScale', role: 'DevOps Lead' }
  ];

  beforeAll(async () => {
    await checkinService.initializeAttendees(testAttendees);
  });

  afterAll(async () => {
    await redisClient.flushall();
    await redisClient.quit();
  });

  test('Should successfully check in a new attendee', async () => {
    const result = await checkinService.processCheckin('A001');
    expect(result.success).toBe(true);
    expect(result.status).toBe('PENDING');
  });

  test('Should prevent duplicate check-in', async () => {
    const result = await checkinService.processCheckin('A001');
    expect(result.success).toBe(false);
    expect(result.status).toBe('DUPLICATE');
  });

  test('Should handle multiple attendees concurrently', async () => {
    const promises = ['A002', 'A003'].map(id => 
      checkinService.processCheckin(id)
    );
    const results = await Promise.all(promises);
    
    results.forEach(result => {
      expect(result.success).toBe(true);
      expect(result.status).toBe('PENDING');
    });
  });

  test('Should update status on webhook callback', async () => {
    // Simulate webhook completion
    const updated = await checkinService.handlePrintComplete(
      'test-job-001',
      'A002'
    );
    expect(updated).toBe(true);
    
    // Verify status changed
    const status = await checkinService.getAttendeeStatus('A002');
    expect(status.status).toBe('CHECKED_IN');
  });

  test('Should ignore out-of-order duplicate webhook', async () => {
    // Try to update again (should be ignored)
    const updated = await checkinService.handlePrintComplete(
      'test-job-002',
      'A002'
    );
    expect(updated).toBe(false);
  });

  test('Should handle concurrent duplicate scans atomically', async () => {
    // Simulate two simultaneous check-in attempts
    const promises = Array(5).fill().map(() => 
      checkinService.processCheckin('A003')
    );
    const results = await Promise.all(promises);
    
    // Only one should succeed
    const successCount = results.filter(r => r.success).length;
    expect(successCount).toBe(1);
    
    // Others should be duplicate or pending
    const duplicateCount = results.filter(r => r.status === 'DUPLICATE' || r.status === 'PENDING').length;
    expect(duplicateCount).toBe(4);
  });
});