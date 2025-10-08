import { Router, Request, Response } from 'express';
import { computeQuote, type QuoteInput, DiscountType } from '@studio-morph/shared-pricing';

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
 * POST /api/quote/calc
 * 요금 미리보기 계산
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

    // 요금 계산 엔진 입력 준비
    const input: QuoteInput = {
      startTime: start,
      endTime: end,
      initialHeadcount: people,
      headcountChanges: [],
      discount: discount ? {
        type: discount.type === 'rate' ? DiscountType.PERCENTAGE : DiscountType.FIXED,
        value: discount.value
      } : undefined
    };

    // 요금 계산
    const result = computeQuote(input);

    // 응답
    return res.json({
      ok: true,
      data: {
        startTime: result.startTime.toISOString(),
        endTime: result.endTime.toISOString(),
        totalMinutes: result.totalMinutes,
        details: result.details,
        subtotal: result.subtotal,
        discountAmount: result.discountAmount,
        total: result.total,
        appliedDiscount: result.appliedDiscount || null
      }
    });

  } catch (error: any) {
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
