import { NextResponse } from 'next/server';
import React from 'react';
import { render } from '@react-email/components';
import { WinnerEmail } from '@/lib/emails/winner-notification';

export async function GET() {
  try {
    const emailHtml = await render(
      React.createElement(WinnerEmail, {
        username: 'TestPlayer',
        productName: 'PlayStation 5 Console',
        productVariant: 'Disc Edition · 825GB',
        finalPrice: 299.99,
        auctionId: 'test-auction-123',
      })
    );

    return new NextResponse(emailHtml, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    console.error('Test email error:', error);
    return NextResponse.json(
      { error: 'Failed to render email' },
      { status: 500 }
    );
  }
}
