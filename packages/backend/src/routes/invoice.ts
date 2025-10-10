import { Router, Request, Response } from 'express';
import { db } from '../db';
import { computeQuote, type QuoteInput, DiscountType } from '@studio-morph/shared-pricing';
import { authenticateToken } from '../middleware/auth';

const router = Router();

interface CreateInvoiceRequest {
  reservationId: string;
  discount?: {
    type: 'rate' | 'amount';
    value: number;
  } | null;
}

/**
 * @swagger
 * /api/invoice/create:
 *   post:
 *     summary: Create invoice for reservation
 *     description: Generate an invoice with calculated pricing for a reservation (requires authentication)
 *     tags: [Invoice]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reservationId
 *             properties:
 *               reservationId:
 *                 type: string
 *                 format: uuid
 *               discount:
 *                 type: object
 *                 nullable: true
 *                 properties:
 *                   type:
 *                     type: string
 *                     enum: [rate, amount]
 *                   value:
 *                     type: number
 *     responses:
 *       200:
 *         description: Invoice created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     invoiceId:
 *                       type: string
 *                       format: uuid
 *                     finalAmount:
 *                       type: number
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Reservation not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/create', authenticateToken, async (req: Request, res: Response) => {
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
          req.user?.id || 'system', // Track 1: Use authenticated user ID
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
 * @swagger
 * /api/invoice/{id}:
 *   get:
 *     summary: Get invoice details
 *     description: Retrieve detailed information about a specific invoice including discount logs
 *     tags: [Invoice]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Invoice ID
 *     responses:
 *       200:
 *         description: Invoice details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     reservationId:
 *                       type: string
 *                       format: uuid
 *                     expectedAmount:
 *                       type: number
 *                     discount:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         type:
 *                           type: string
 *                         value:
 *                           type: number
 *                         amount:
 *                           type: number
 *                     finalAmount:
 *                       type: number
 *                     status:
 *                       type: string
 *                     discountLogs:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           appliedBy:
 *                             type: string
 *                           appliedAt:
 *                             type: string
 *                             format: date-time
 *                           type:
 *                             type: string
 *                           value:
 *                             type: number
 *                     reservation:
 *                       type: object
 *                       properties:
 *                         startAt:
 *                           type: string
 *                           format: date-time
 *                         endAt:
 *                           type: string
 *                           format: date-time
 *                         payerName:
 *                           type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: Invoice not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
