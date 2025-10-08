import { Router, Request, Response } from 'express';
import { db } from '../db';
import { computeQuote, type QuoteInput, DiscountType } from '@studio-morph/shared-pricing';

const router = Router();

interface CreateInvoiceRequest {
  reservationId: string;
  discount?: {
    type: 'rate' | 'amount';
    value: number;
  } | null;
}

/**
 * POST /api/invoice/create
 * 예약에 대한 인보이스 생성
 */
router.post('/create', async (req: Request, res: Response) => {
  const client = await db.connect();

  try {
    const { reservationId, discount }: CreateInvoiceRequest = req.body;

    if (!reservationId) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'reservationId is required'
        }
      });
    }

    await client.query('BEGIN');

    // 예약 정보 조회
    const resResult = await client.query(
      `SELECT
        id,
        start_time,
        end_time,
        initial_headcount,
        headcount_changes,
        channel
       FROM reservations
       WHERE id = $1`,
      [reservationId]
    );

    if (resResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Reservation not found'
        }
      });
    }

    const reservation = resResult.rows[0];

    // 요금 계산
    const quoteInput: QuoteInput = {
      startTime: reservation.start_time,
      endTime: reservation.end_time,
      initialHeadcount: reservation.initial_headcount,
      headcountChanges: reservation.headcount_changes || [],
      discount: discount ? {
        type: discount.type === 'rate' ? DiscountType.PERCENTAGE : DiscountType.FIXED,
        value: discount.value
      } : undefined
    };

    const quote = computeQuote(quoteInput);

    // 인보이스 생성
    const invoiceResult = await client.query(
      `INSERT INTO invoices (
        reservation_id,
        expected_amount,
        discount_type,
        discount_value,
        discount_amount,
        final_amount,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id`,
      [
        reservationId,
        quote.subtotal,
        quote.appliedDiscount?.type || null,
        quote.appliedDiscount?.value || null,
        quote.discountAmount,
        quote.total,
        'OPEN'
      ]
    );

    const invoiceId = invoiceResult.rows[0].id;

    // 할인 로그 기록 (할인이 적용된 경우)
    if (quote.appliedDiscount) {
      await client.query(
        `INSERT INTO discount_logs (
          invoice_id,
          applied_by,
          discount_type,
          discount_value
        ) VALUES ($1, $2, $3, $4)`,
        [
          invoiceId,
          'system', // TODO: 실제 사용자 정보로 대체
          quote.appliedDiscount.type,
          quote.appliedDiscount.value
        ]
      );
    }

    await client.query('COMMIT');

    return res.json({
      ok: true,
      data: {
        invoiceId,
        finalAmount: quote.total
      }
    });

  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('createInvoice error:', error);

    // 검증 에러 처리
    if (error.message?.includes('최소 2시간') ||
        error.message?.includes('할인') ||
        error.message?.includes('인원수')) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: error.message
        }
      });
    }

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
 * GET /api/invoice/:id
 * 인보이스 조회
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT
        i.id,
        i.reservation_id,
        i.expected_amount,
        i.discount_type,
        i.discount_value,
        i.discount_amount,
        i.final_amount,
        i.status,
        i.created_at,
        i.updated_at,
        r.start_time,
        r.end_time,
        r.payer_name
       FROM invoices i
       JOIN reservations r ON i.reservation_id = r.id
       WHERE i.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Invoice not found'
        }
      });
    }

    const row = result.rows[0];

    // 할인 로그 조회
    const logsResult = await db.query(
      `SELECT
        applied_by,
        applied_at,
        discount_type,
        discount_value
       FROM discount_logs
       WHERE invoice_id = $1
       ORDER BY applied_at DESC`,
      [id]
    );

    return res.json({
      ok: true,
      data: {
        id: row.id,
        reservationId: row.reservation_id,
        expectedAmount: parseFloat(row.expected_amount),
        discount: row.discount_type ? {
          type: row.discount_type,
          value: parseFloat(row.discount_value),
          amount: parseFloat(row.discount_amount)
        } : null,
        finalAmount: parseFloat(row.final_amount),
        status: row.status,
        discountLogs: logsResult.rows.map(log => ({
          appliedBy: log.applied_by,
          appliedAt: log.applied_at,
          type: log.discount_type,
          value: parseFloat(log.discount_value)
        })),
        reservation: {
          startAt: row.start_time,
          endAt: row.end_time,
          payerName: row.payer_name
        },
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }
    });

  } catch (error: any) {
    console.error('getInvoice error:', error);
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
