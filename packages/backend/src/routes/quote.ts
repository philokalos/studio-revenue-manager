import { Router, Request, Response } from 'express';
import { computeQuote, type QuoteInput } from '@studio-morph/shared-pricing';

const router = Router();

interface CalcQuoteRequest {
  startAt: string;
  endAt: string;
  people: number;
  channel: 'default' | 'hourplace' | 'spacecloud';
  discount?: {
    type: 'rate' | 'amount';
    value: number;
  } | null;
}

/**
 * @swagger
 * /api/quote/calc:
 *   post:
 *     summary: Calculate quote preview
 *     description: Calculate pricing quote based on time period, people count, and optional discount
 *     tags: [Quote]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - startAt
 *               - endAt
 *               - people
 *             properties:
 *               startAt:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-01-15T10:00:00Z"
 *               endAt:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-01-15T14:00:00Z"
 *               people:
 *                 type: number
 *                 minimum: 1
 *                 example: 5
 *               channel:
 *                 type: string
 *                 enum: [default, hourplace, spacecloud]
 *                 default: default
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
 *         description: Quote calculated successfully
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
 *                     startTime:
 *                       type: string
 *                       format: date-time
 *                     endTime:
 *                       type: string
 *                       format: date-time
 *                     totalMinutes:
 *                       type: number
 *                     baseAmount:
 *                       type: number
 *                     extraPeopleAmount:
 *                       type: number
 *                     discountApplied:
 *                       type: object
 *                       nullable: true
 *                     finalAmount:
 *                       type: number
 *       400:
 *         description: Invalid input
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
router.post('/calc', async (req: Request, res: Response) => {
  try {
    const { startAt, endAt, people, discount }: CalcQuoteRequest = req.body;

    // 입력 검증
    if (!startAt || !endAt) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'startAt and endAt are required'
        }
      });
    }

    if (typeof people !== 'number' || people < 1) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'people must be a positive number'
        }
      });
    }

    const start = new Date(startAt);
    const end = new Date(endAt);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid date format'
        }
      });
    }

    // 요금 계산 엔진 입력 준비 (기본 3명 기준으로 계산)
    const baseHeadcount = 3;
    const basePeople = Math.min(people, baseHeadcount);

    const input: QuoteInput = {
      startTime: start,
      endTime: end,
      initialHeadcount: basePeople, // 3명까지만 기본 요금 계산
      headcountChanges: [],
      discount: undefined // 할인은 나중에 적용
    };

    // 기본 요금 계산 (3명 기준)
    const baseResult = computeQuote(input);

    // 추가 인원 요금 계산 (4명부터)
    const extraPeople = Math.max(0, people - baseHeadcount);
    const extraPeopleAmount = extraPeople * 20000; // 1인당 20,000원 (예약 전체)

    // 소계 (기본 요금 + 추가 인원 요금)
    const subtotal = baseResult.subtotal + extraPeopleAmount;

    // 할인 적용
    let discountAmount = 0;
    let finalAmount = subtotal;
    let appliedDiscount = null;

    if (discount) {
      if (discount.type === 'rate') {
        discountAmount = Math.floor(subtotal * (discount.value / 100));
        appliedDiscount = {
          type: 'rate' as const,
          value: discount.value,
          amount: discountAmount
        };
      } else {
        discountAmount = discount.value;
        appliedDiscount = {
          type: 'amount' as const,
          value: discount.value,
          amount: discountAmount
        };
      }
      finalAmount = subtotal - discountAmount;
    }

    // 응답
    return res.json({
      ok: true,
      data: {
        startTime: baseResult.startTime.toISOString(),
        endTime: baseResult.endTime.toISOString(),
        totalMinutes: baseResult.totalMinutes,
        baseAmount: baseResult.subtotal,
        extraPeopleAmount: extraPeopleAmount,
        discountApplied: appliedDiscount,
        finalAmount: finalAmount
      }
    });

  } catch (error: any) {
    console.error('calcQuote error:', error);
    // 검증 에러 처리
    if (error.message?.includes('Minimum') ||
        error.message?.includes('최소') ||
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

    // 기타 에러
    console.error('calcQuote error:', error);
    return res.status(500).json({
      ok: false,
      error: {
        code: 'INTERNAL',
        message: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
});

export default router;
