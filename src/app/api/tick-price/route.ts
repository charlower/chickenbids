import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Rate limiting: only allow one tick per second globally
let lastTick = 0;
const TICK_INTERVAL = 1000; // 1 second

export async function GET(req: NextRequest) {
  try {
    // Verify request is from Vercel Cron (production only)
    if (process.env.NODE_ENV === 'production') {
      const authHeader = req.headers.get('authorization');
      if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const now = Date.now();

    // Rate limit: skip if called too soon (safety for manual calls)
    if (now - lastTick < TICK_INTERVAL) {
      return NextResponse.json({ skipped: true, reason: 'rate_limited' });
    }

    lastTick = now;

    // Call the database function to drop price
    const { error } = await supabaseAdmin.rpc('tick_auction_price');

    if (error) {
      console.error('Failed to tick auction price:', error);
      return NextResponse.json(
        { error: 'Failed to tick price' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, timestamp: now });
  } catch (error: unknown) {
    console.error('Auction tick error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Auction tick failed',
      },
      { status: 500 }
    );
  }
}
