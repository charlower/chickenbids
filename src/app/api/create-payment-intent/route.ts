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

    // Create Stripe PaymentIntent (for embedded form)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(price * 100), // Convert to cents
      currency: 'aud',
      description: `${productName || 'Auction Win'} - $${price.toFixed(2)}`,
      payment_method_types: ['card'], // Only allow cards for MVP
      metadata: {
        bidId,
        userId,
        auctionId,
        bidPrice: price.toString(),
        productName: productName || 'Auction Win',
      },
      // Automatically capture payment when confirmed
      capture_method: 'automatic',
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error: unknown) {
    console.error('Stripe PaymentIntent error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to create payment intent',
      },
      { status: 500 }
    );
  }
}
