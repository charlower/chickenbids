import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover',
});

export async function POST(req: NextRequest) {
  try {
    const { bidId, price, userId, auctionId, productName } = await req.json();

    if (!bidId || !price || !userId || !auctionId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'aud',
            product_data: {
              name: productName || 'Auction Win',
              description: `You won this item at $${price.toFixed(2)}`,
            },
            unit_amount: Math.round(price * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${
        process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
      }?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${
        process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
      }?payment=cancelled`,
      metadata: {
        bidId,
        userId,
        auctionId,
        bidPrice: price.toString(),
      },
      // Optional: Add automatic tax calculation
      // automatic_tax: { enabled: true },
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (error: unknown) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to create checkout session',
      },
      { status: 500 }
    );
  }
}
