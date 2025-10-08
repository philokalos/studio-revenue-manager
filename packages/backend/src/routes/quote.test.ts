import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import quoteRouter from './quote';

const app = express();
app.use(express.json());
app.use('/api/quote', quoteRouter);

describe('POST /api/quote/calc', () => {
  it('should calculate quote for basic reservation (R1)', async () => {
    const response = await request(app)
      .post('/api/quote/calc')
      .send({
        startAt: '2025-10-09T10:00:00+09:00',
        endAt: '2025-10-09T14:00:00+09:00',
        people: 5,
        channel: 'default'
      });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.data.baseAmount).toBe(160000);
    expect(response.body.data.extraPeopleAmount).toBe(40000);
    expect(response.body.data.finalAmount).toBe(200000);
  });

  it('should calculate quote with rate discount', async () => {
    const response = await request(app)
      .post('/api/quote/calc')
      .send({
        startAt: '2025-10-09T10:00:00+09:00',
        endAt: '2025-10-09T14:00:00+09:00',
        people: 5,
        channel: 'default',
        discount: { type: 'rate', value: 10 }
      });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.data.discountApplied).toEqual({
      type: 'rate',
      value: 10,
      amount: 20000
    });
    expect(response.body.data.finalAmount).toBe(180000);
  });

  it('should calculate quote with amount discount', async () => {
    const response = await request(app)
      .post('/api/quote/calc')
      .send({
        startAt: '2025-10-09T10:00:00+09:00',
        endAt: '2025-10-09T14:00:00+09:00',
        people: 5,
        channel: 'default',
        discount: { type: 'amount', value: 15000 }
      });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.data.discountApplied.amount).toBe(15000);
    expect(response.body.data.finalAmount).toBe(185000);
  });

  it('should reject reservation shorter than 2 hours', async () => {
    const response = await request(app)
      .post('/api/quote/calc')
      .send({
        startAt: '2025-10-09T10:00:00+09:00',
        endAt: '2025-10-09T11:30:00+09:00',
        people: 3,
        channel: 'default'
      });

    expect(response.status).toBe(400);
    expect(response.body.ok).toBe(false);
    expect(response.body.error.code).toBe('INVALID_ARGUMENT');
    expect(response.body.error.message).toContain('최소 2시간');
  });

  it('should reject invalid people count', async () => {
    const response = await request(app)
      .post('/api/quote/calc')
      .send({
        startAt: '2025-10-09T10:00:00+09:00',
        endAt: '2025-10-09T14:00:00+09:00',
        people: 0,
        channel: 'default'
      });

    expect(response.status).toBe(400);
    expect(response.body.ok).toBe(false);
    expect(response.body.error.code).toBe('INVALID_ARGUMENT');
  });

  it('should reject missing required fields', async () => {
    const response = await request(app)
      .post('/api/quote/calc')
      .send({
        people: 5,
        channel: 'default'
      });

    expect(response.status).toBe(400);
    expect(response.body.ok).toBe(false);
    expect(response.body.error.message).toContain('startAt and endAt are required');
  });

  it('should handle overnight reservation (R2)', async () => {
    const response = await request(app)
      .post('/api/quote/calc')
      .send({
        startAt: '2025-10-09T21:00:00+09:00',
        endAt: '2025-10-10T02:00:00+09:00',
        people: 3,
        channel: 'default'
      });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    // Day rate (21:00-22:00) = 40000
    // Night rate (22:00-02:00) = 4 * 25000 = 100000
    expect(response.body.data.baseAmount).toBe(140000);
  });
});
