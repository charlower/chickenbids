import * as React from 'react';

interface WinnerEmailProps {
  username: string;
  productName: string;
  productVariant: string;
  finalPrice: number;
  auctionId: string;
}

export const WinnerEmail: React.FC<Readonly<WinnerEmailProps>> = ({
  username,
  productName,
  productVariant,
  finalPrice,
  auctionId,
}) => (
  <html>
    <head>
      <meta charSet='UTF-8' />
      <meta name='viewport' content='width=device-width, initial-scale=1.0' />
    </head>
    <body
      style={{
        margin: 0,
        padding: 0,
        fontFamily: 'monospace',
        backgroundColor: '#0d111b',
      }}
    >
      <table
        width='100%'
        cellPadding='0'
        cellSpacing='0'
        style={{ backgroundColor: '#0d111b' }}
      >
        <tbody>
          <tr>
            <td align='center' style={{ padding: '40px 20px' }}>
              {/* Main Container */}
              <table
                width='600'
                cellPadding='0'
                cellSpacing='0'
                style={{
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  maxWidth: '600px',
                }}
              >
                <tbody>
                  {/* Header */}
                  <tr>
                    <td
                      align='center'
                      style={{
                        padding: '40px 20px',
                        backgroundColor: '#070f1f',
                        borderBottom: '2px solid #3b82f6',
                      }}
                    >
                      <h1
                        style={{
                          margin: 0,
                          fontSize: '28px',
                          fontWeight: 700,
                          letterSpacing: '0.1em',
                          color: '#3b82f6',
                          textTransform: 'uppercase',
                        }}
                      >
                        CHICKENBIDS
                      </h1>
                      <p
                        style={{
                          margin: '10px 0 0 0',
                          fontSize: '11px',
                          letterSpacing: '0.15em',
                          color: '#94a3b8',
                          textTransform: 'uppercase',
                        }}
                      >
                        Descending-Price Auction Platform
                      </p>
                    </td>
                  </tr>

                  {/* Content */}
                  <tr>
                    <td style={{ padding: '40px 30px' }}>
                      {/* Title */}
                      <table width='100%' cellPadding='0' cellSpacing='0'>
                        <tbody>
                          <tr>
                            <td
                              align='center'
                              style={{ paddingBottom: '20px' }}
                            >
                              <h2
                                style={{
                                  margin: 0,
                                  fontSize: '16px',
                                  letterSpacing: '0.1em',
                                  textTransform: 'uppercase',
                                  color: '#22c55e',
                                }}
                              >
                                &gt;&gt; TARGET SECURED &lt;&lt;
                              </h2>
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Message */}
                      <table width='100%' cellPadding='0' cellSpacing='0'>
                        <tbody>
                          <tr>
                            <td align='center' style={{ padding: '20px 0' }}>
                              <p
                                style={{
                                  margin: 0,
                                  fontSize: '14px',
                                  lineHeight: 1.6,
                                  color: '#cbd5e1',
                                }}
                              >
                                Solid play,{' '}
                                <strong style={{ color: '#60a5fa' }}>
                                  @{username}
                                </strong>
                                .
                              </p>
                              <p
                                style={{
                                  margin: '15px 0 0 0',
                                  fontSize: '14px',
                                  lineHeight: 1.6,
                                  color: '#cbd5e1',
                                }}
                              >
                                You secured the loot. Payment confirmed.
                              </p>
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Loot Details */}
                      <table width='100%' cellPadding='0' cellSpacing='0'>
                        <tbody>
                          <tr>
                            <td
                              style={{
                                backgroundColor: '#1e293b',
                                border: '1px solid #334155',
                                padding: '20px',
                              }}
                            >
                              <table
                                width='100%'
                                cellPadding='0'
                                cellSpacing='0'
                              >
                                <tbody>
                                  <tr>
                                    <td
                                      style={{
                                        paddingBottom: '12px',
                                        fontSize: '12px',
                                        letterSpacing: '0.1em',
                                        color: '#60a5fa',
                                        textTransform: 'uppercase',
                                        fontWeight: 'bold',
                                      }}
                                      colSpan={2}
                                    >
                                      TARGET DETAILS
                                    </td>
                                  </tr>
                                  <tr>
                                    <td
                                      style={{
                                        paddingBottom: '8px',
                                        fontSize: '13px',
                                        color: '#94a3b8',
                                      }}
                                    >
                                      LOOT:
                                    </td>
                                    <td
                                      style={{
                                        paddingBottom: '8px',
                                        fontSize: '13px',
                                        color: '#e2e8f0',
                                        textAlign: 'right',
                                        fontWeight: 'bold',
                                      }}
                                    >
                                      {productName}
                                    </td>
                                  </tr>
                                  <tr>
                                    <td
                                      style={{
                                        paddingBottom: '8px',
                                        fontSize: '13px',
                                        color: '#94a3b8',
                                      }}
                                    >
                                      VARIANT:
                                    </td>
                                    <td
                                      style={{
                                        paddingBottom: '8px',
                                        fontSize: '13px',
                                        color: '#e2e8f0',
                                        textAlign: 'right',
                                      }}
                                    >
                                      {productVariant}
                                    </td>
                                  </tr>
                                  <tr>
                                    <td
                                      style={{
                                        fontSize: '13px',
                                        color: '#94a3b8',
                                      }}
                                    >
                                      LOCKED PRICE:
                                    </td>
                                    <td
                                      style={{
                                        fontSize: '16px',
                                        color: '#22c55e',
                                        textAlign: 'right',
                                        fontWeight: 'bold',
                                      }}
                                    >
                                      ${finalPrice.toFixed(2)}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Next Steps */}
                      <table width='100%' cellPadding='0' cellSpacing='0'>
                        <tbody>
                          <tr>
                            <td style={{ paddingTop: '30px' }}>
                              <table
                                width='100%'
                                cellPadding='0'
                                cellSpacing='0'
                              >
                                <tbody>
                                  <tr>
                                    <td
                                      style={{
                                        backgroundColor: '#7f1d1d',
                                        border: '1px solid #991b1b',
                                        padding: '20px',
                                      }}
                                    >
                                      <p
                                        style={{
                                          margin: 0,
                                          fontSize: '12px',
                                          letterSpacing: '0.1em',
                                          color: '#fca5a5',
                                          textTransform: 'uppercase',
                                          fontWeight: 'bold',
                                          paddingBottom: '10px',
                                        }}
                                      >
                                        ⚠️ ACTION REQUIRED
                                      </p>
                                      <p
                                        style={{
                                          margin: 0,
                                          fontSize: '13px',
                                          lineHeight: 1.6,
                                          color: '#fca5a5',
                                        }}
                                      >
                                        We need your{' '}
                                        <strong>DROP ZONE COORDINATES</strong>{' '}
                                        (shipping address) to dispatch your
                                        loot.
                                      </p>
                                      <p
                                        style={{
                                          margin: '10px 0 0 0',
                                          fontSize: '13px',
                                          lineHeight: 1.6,
                                          color: '#fca5a5',
                                        }}
                                      >
                                        Reply to this email with your full
                                        delivery address.
                                      </p>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Contact */}
                      <table width='100%' cellPadding='0' cellSpacing='0'>
                        <tbody>
                          <tr>
                            <td align='center' style={{ paddingTop: '30px' }}>
                              <p
                                style={{
                                  margin: 0,
                                  fontSize: '12px',
                                  color: '#94a3b8',
                                  lineHeight: 1.5,
                                }}
                              >
                                Questions? Contact{' '}
                                <a
                                  href='mailto:ops@chickenbids.com'
                                  style={{
                                    color: '#60a5fa',
                                    textDecoration: 'none',
                                  }}
                                >
                                  ops@chickenbids.com
                                </a>
                              </p>
                              <p
                                style={{
                                  margin: '10px 0 0 0',
                                  fontSize: '11px',
                                  color: '#64748b',
                                }}
                              >
                                Auction ID: {auctionId}
                              </p>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>

                  {/* Footer */}
                  <tr>
                    <td
                      align='center'
                      style={{
                        padding: '30px 20px',
                        borderTop: '1px solid #334155',
                        backgroundColor: '#070f1f',
                      }}
                    >
                      <p
                        style={{
                          margin: '0 0 10px 0',
                          fontSize: '11px',
                          color: '#64748b',
                        }}
                      >
                        © 2025 ChickenBids. All rights reserved.
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: '11px',
                          color: '#64748b',
                        }}
                      >
                        Stay locked in for auction intel.
                      </p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    </body>
  </html>
);
