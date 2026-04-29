import { describe, it, expect } from 'vitest';
import { GET } from '@/app/api/config/supported/route';
import { createMockRequest, parseResponse } from './helpers';
import { getSupportedConfig } from '@/lib/backend/config';

describe('GET /api/config/supported', () => {
  it('should return 200 with supported config data', async () => {
    const request = createMockRequest('http://localhost:3000/api/config/supported');
    const response = await GET(request);
    const result = await parseResponse(response);

    expect(result.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.data).toHaveProperty('assets');
    expect(result.data.data).toHaveProperty('riskProfiles');
    expect(result.data.data).toHaveProperty('bounds');
    
    // Bounds consistency check
    const bounds = result.data.data.bounds;
    expect(bounds.durationDays.min).toBeLessThanOrEqual(bounds.durationDays.max);
    expect(bounds.amount.min).toBeLessThanOrEqual(bounds.amount.max);
    expect(bounds.durationDays.min).toBe(1);
    expect(bounds.durationDays.max).toBe(365);
    expect(bounds.amount.min).toBeGreaterThan(0);
  });

  it('should match the source of truth config module', async () => {
    const request = createMockRequest('http://localhost:3000/api/config/supported');
    const response = await GET(request);
    const result = await parseResponse(response);

    const expectedConfig = getSupportedConfig();
    expect(result.data.data).toEqual(expectedConfig);
  });
});
