import { Router, Request, Response } from 'express';
import { db } from '../db';

const router = Router();

interface ReservationMeta {
  payerName?: string;
  phone?: string;
  peopleCount?: number;
  parkingCount?: number;
  shootingPurpose?: string;
}

interface UpsertReservationRequest {
  reservation: {
    id?: string;
    startAt: string;
    endAt: string;
    people: number;
    channel: 'default' | 'hourplace' | 'spacecloud';
    notes?: string;
    googleCalendarEventId?: string;
  };
  meta?: ReservationMeta;
}

/**
 * POST /api/reservation/upsert
 * 예약 생성/수정
 */
router.post('/upsert', async (req: Request, res: Response) => {
  const client = await db.connect();

  try {
    const { reservation, meta }: UpsertReservationRequest = req.body;

    // 입력 검증
    if (!reservation?.startAt || !reservation?.endAt) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'startAt and endAt are required'
        }
      });
    }

    if (typeof reservation.people !== 'number' || reservation.people < 1) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'people must be a positive number'
        }
      });
    }

    const start = new Date(reservation.startAt);
    const end = new Date(reservation.endAt);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid date format'
        }
      });
    }

    // 최소 2시간 검증
    const durationMs = end.getTime() - start.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);
    if (durationHours < 2) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: '예약은 최소 2시간 이상이어야 합니다'
        }
      });
    }

    await client.query('BEGIN');

    let reservationId: string;

    if (reservation.id) {
      // 기존 예약 수정
      const updateResult = await client.query(
        `UPDATE reservations
         SET start_time = $1,
             end_time = $2,
             initial_headcount = $3,
             channel = $4,
             notes = $5,
             payer_name = $6,
             phone = $7,
             people_count = $8,
             parking_count = $9,
             shooting_purpose = $10,
             needs_correction = $11,
             corrected_at = CASE WHEN $11 = false THEN NOW() ELSE corrected_at END,
             updated_at = NOW()
         WHERE id = $12
         RETURNING id`,
        [
          start,
          end,
          reservation.people,
          reservation.channel || 'default',
          reservation.notes || null,
          meta?.payerName || null,
          meta?.phone || null,
          meta?.peopleCount || null,
          meta?.parkingCount || 0,
          meta?.shootingPurpose || null,
          !meta?.payerName || !meta?.phone, // needs_correction
          reservation.id
        ]
      );

      if (updateResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          ok: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Reservation not found'
          }
        });
      }

      reservationId = updateResult.rows[0].id;

    } else {
      // 신규 예약 생성
      const insertResult = await client.query(
        `INSERT INTO reservations (
          start_time,
          end_time,
          initial_headcount,
          channel,
          notes,
          google_calendar_event_id,
          payer_name,
          phone,
          people_count,
          parking_count,
          shooting_purpose,
          needs_correction
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id`,
        [
          start,
          end,
          reservation.people,
          reservation.channel || 'default',
          reservation.notes || null,
          reservation.googleCalendarEventId || null,
          meta?.payerName || null,
          meta?.phone || null,
          meta?.peopleCount || null,
          meta?.parkingCount || 0,
          meta?.shootingPurpose || null,
          !meta?.payerName || !meta?.phone // needs_correction
        ]
      );

      reservationId = insertResult.rows[0].id;
    }

    await client.query('COMMIT');

    return res.json({
      ok: true,
      data: { reservationId }
    });

  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('upsertReservation error:', error);

    return res.status(500).json({
      ok: false,
      error: {
        code: 'INTERNAL',
        message: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  } finally {
    client.release();
  }
});

/**
 * GET /api/reservation/:id
 * 예약 조회
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT
        id,
        start_time,
        end_time,
        initial_headcount,
        headcount_changes,
        channel,
        status,
        notes,
        needs_correction,
        corrected_at,
        google_calendar_event_id,
        payer_name,
        phone,
        people_count,
        parking_count,
        shooting_purpose,
        created_at,
        updated_at
       FROM reservations
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Reservation not found'
        }
      });
    }

    const row = result.rows[0];
    return res.json({
      ok: true,
      data: {
        id: row.id,
        startAt: row.start_time,
        endAt: row.end_time,
        people: row.initial_headcount,
        headcountChanges: row.headcount_changes,
        channel: row.channel,
        status: row.status,
        notes: row.notes,
        needsCorrection: row.needs_correction,
        correctedAt: row.corrected_at,
        googleCalendarEventId: row.google_calendar_event_id,
        meta: {
          payerName: row.payer_name,
          phone: row.phone,
          peopleCount: row.people_count,
          parkingCount: row.parking_count,
          shootingPurpose: row.shooting_purpose
        },
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }
    });

  } catch (error: any) {
    console.error('getReservation error:', error);
    return res.status(500).json({
      ok: false,
      error: {
        code: 'INTERNAL',
        message: 'Internal server error'
      }
    });
  }
});

export default router;
