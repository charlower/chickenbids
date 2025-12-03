import { NextResponse } from 'next/server';
import React from 'react';
import { render } from '@react-email/components';
import { resend } from '@/lib/resend';
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

    const { data, error } = await resend.emails.send({
      from: 'ChickenBids <ops@chickenbids.com>',
      to: 'charlowspam@gmail.com', // Replace with your test email
      subject: 'Your ChickenBids Auction Win - Action Required',
      html: emailHtml,
      text: `Congratulations @TestPlayer!\n\nYou won the auction for PlayStation 5 Console (Disc Edition · 825GB) at $299.99.\n\nWe need your shipping address to deliver your item. Please reply to this email with your full delivery address.\n\nQuestions? Contact ops@chickenbids.com\n\nAuction ID: test-auction-123`,
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Test email sent!',
      data,
    });
  } catch (error) {
    console.error('Test email error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to send email',
      },
      { status: 500 }
    );
  }
}
