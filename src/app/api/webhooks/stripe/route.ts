import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import React from 'react';
import { render } from '@react-email/components';
import { resend } from '@/lib/resend';
import { WinnerEmail } from '@/lib/emails/winner-notification';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Create Supabase admin client
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Handle payment_intent.succeeded (embedded payment form)
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const { bidId, userId, auctionId, bidPrice } =
        paymentIntent.metadata || {};

      if (!bidId || !userId || !auctionId) {
        console.error('Missing metadata:', paymentIntent.metadata);
        return NextResponse.json(
          { error: 'Missing metadata' },
          { status: 400 }
        );
      }

      console.log('Processing payment:', {
        bidId,
        auctionId,
        userId,
        bidPrice,
      });

      // 1. Mark bid as won
      const { error: bidError } = await supabaseAdmin.rpc(
        'complete_bid_for_winner',
        { p_bid_id: bidId }
      );

      if (bidError) {
        console.error('Failed to update bid:', bidError);
        return NextResponse.json(
          { error: 'Failed to update bid' },
          { status: 500 }
        );
      }

      // 2. Complete auction
      const { error: auctionError } = await supabaseAdmin
        .from('auctions')
        .update({
          status: 'completed',
          winner_id: userId,
          winning_price: parseFloat(bidPrice || '0'),
          ended_at: new Date().toISOString(),
          locked_by: null,
          locked_at: null,
          lock_expires_at: null,
        })
        .eq('id', auctionId);

      if (auctionError) {
        console.error('Failed to complete auction:', auctionError);
        return NextResponse.json(
          { error: 'Failed to complete auction' },
          { status: 500 }
        );
      }

      // 3. Award XP and update winner stats
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('xp, auctions_won, total_spent')
        .eq('id', userId)
        .single();

      if (profile) {
        await supabaseAdmin
          .from('profiles')
          .update({
            xp: profile.xp + 10,
            auctions_won: profile.auctions_won + 1,
            total_spent: profile.total_spent + parseFloat(bidPrice || '0'),
          })
          .eq('id', userId);
      }

      // 4. Award 1 XP to all losers (other participants)
      const { data: loserBids } = await supabaseAdmin
        .from('bids')
        .select('user_id')
        .eq('auction_id', auctionId)
        .neq('user_id', userId)
        .neq('status', 'won');

      if (loserBids && loserBids.length > 0) {
        const loserIds = [...new Set(loserBids.map((b) => b.user_id))]; // Unique user IDs

        for (const loserId of loserIds) {
          const { data: loserProfile } = await supabaseAdmin
            .from('profiles')
            .select('xp, total_bids')
            .eq('id', loserId)
            .single();

          if (loserProfile) {
            await supabaseAdmin
              .from('profiles')
              .update({
                xp: loserProfile.xp + 1,
                total_bids: loserProfile.total_bids + 1,
              })
              .eq('id', loserId);
          }
        }

        console.log(`Awarded 1 XP to ${loserIds.length} losers`);
      }

      // 5. Reset all credits for users who participated
      const { data: allBids } = await supabaseAdmin
        .from('bids')
        .select('user_id')
        .eq('auction_id', auctionId);

      if (allBids && allBids.length > 0) {
        const participantIds = [...new Set(allBids.map((b) => b.user_id))];

        await supabaseAdmin
          .from('credits')
          .update({ balance: 0 })
          .in('user_id', participantIds);

        console.log(`Reset credits for ${participantIds.length} participants`);
      }

      // 6. Send winner email
      try {
        console.log('📧 Starting email send process...');

        // Fetch winner profile and email from auth.users
        const { data: winnerProfile, error: profileError } = await supabaseAdmin
          .from('profiles')
          .select('username')
          .eq('id', userId)
          .single();

        const { data: authUser, error: authError } =
          await supabaseAdmin.auth.admin.getUserById(userId);

        console.log('Winner profile:', winnerProfile, 'Error:', profileError);
        console.log(
          'Auth user email:',
          authUser?.user?.email,
          'Error:',
          authError
        );

        const { data: auction, error: auctionError } = await supabaseAdmin
          .from('auctions')
          .select('product_id')
          .eq('id', auctionId)
          .single();

        console.log('Auction data:', auction, 'Error:', auctionError);

        if (auction) {
          const { data: product, error: productError } = await supabaseAdmin
            .from('products')
            .select('name, variant')
            .eq('id', auction.product_id)
            .single();

          console.log('Product data:', product, 'Error:', productError);

          const winnerEmail = authUser?.user?.email;

          if (winnerEmail && winnerProfile && product) {
            console.log('Rendering email...');
            const emailHtml = await render(
              React.createElement(WinnerEmail, {
                username: winnerProfile.username,
                productName: product.name,
                productVariant: product.variant || 'Standard',
                finalPrice: parseFloat(bidPrice || '0'),
                auctionId: auctionId,
              })
            );

            console.log('Sending email to:', winnerEmail);
            const { data: emailData, error: emailError } =
              await resend.emails.send({
                from: 'ChickenBids <ops@chickenbids.com>',
                to: winnerEmail,
                subject: 'Your ChickenBids Auction Win - Action Required',
                html: emailHtml,
                text: `Congratulations @${winnerProfile.username}!\n\nYou won the auction for ${product.name} (${product.variant || 'Standard'}) at $${parseFloat(bidPrice || '0').toFixed(2)}.\n\nWe need your shipping address to deliver your item. Please reply to this email with your full delivery address.\n\nQuestions? Contact ops@chickenbids.com\n\nAuction ID: ${auctionId}`,
              });

            console.log('Email result:', emailData, 'Error:', emailError);
            console.log(`✅ Winner email sent to ${winnerEmail}`);
          } else {
            console.log(
              '❌ Missing data - email:',
              winnerEmail,
              'profile:',
              !!winnerProfile,
              'product:',
              !!product
            );
          }
        } else {
          console.log('❌ No auction found');
        }
      } catch (emailError) {
        // Don't fail the webhook if email fails
        console.error('❌ Failed to send winner email:', emailError);
      }

      console.log('Payment processed successfully:', {
        auctionId,
        userId,
        bidPrice,
      });

      return NextResponse.json({ received: true });
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Webhook handler failed',
      },
      { status: 500 }
    );
  }
}
