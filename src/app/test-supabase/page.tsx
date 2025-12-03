'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function TestSupabasePage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading'
  );
  const [message, setMessage] = useState('');
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    async function testConnection() {
      try {
        // Test 1: Check connection
        const { data, error } = await supabase.from('products').select('*');

        if (error) {
          setStatus('error');
          setMessage(`Error: ${error.message}`);
          return;
        }

        // Test 2: Check if sample product exists
        if (data && data.length > 0) {
          setStatus('success');
          setMessage(`✅ Connected! Found ${data.length} product(s)`);
          setProducts(data);
        } else {
          setStatus('success');
          setMessage('✅ Connected, but no products found (run seed data)');
        }
      } catch (err: any) {
        setStatus('error');
        setMessage(`Error: ${err.message}`);
      }
    }

    testConnection();
  }, []);

  return (
    <div
      style={{
        padding: '40px',
        fontFamily: 'monospace',
        maxWidth: '800px',
        margin: '0 auto',
      }}
    >
      <h1 style={{ marginBottom: '20px' }}>🧪 Supabase Connection Test</h1>

      <div
        style={{
          padding: '20px',
          background:
            status === 'loading'
              ? '#333'
              : status === 'success'
              ? '#0a3d0a'
              : '#3d0a0a',
          border: `2px solid ${
            status === 'loading'
              ? '#666'
              : status === 'success'
              ? '#22c55e'
              : '#f87171'
          }`,
          borderRadius: '8px',
          marginBottom: '20px',
        }}
      >
        <p style={{ margin: 0, fontSize: '16px' }}>
          {status === 'loading' && '⏳ Testing connection...'}
          {message}
        </p>
      </div>

      {products.length > 0 && (
        <div>
          <h2>Products in Database:</h2>
          {products.map((product) => (
            <div
              key={product.id}
              style={{
                padding: '15px',
                background: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: '4px',
                marginBottom: '10px',
              }}
            >
              <h3 style={{ margin: '0 0 8px 0' }}>{product.name}</h3>
              <p style={{ margin: '4px 0', color: '#888' }}>
                {product.variant}
              </p>
              <p style={{ margin: '4px 0', color: '#888' }}>
                Condition: {product.condition}
              </p>
              <p style={{ margin: '4px 0', color: '#888' }}>
                Retail: ${product.retail_price}
              </p>
            </div>
          ))}
        </div>
      )}

      <div
        style={{
          marginTop: '40px',
          padding: '20px',
          background: '#1a1a1a',
          borderRadius: '8px',
        }}
      >
        <h3>Environment Variables Check:</h3>
        <ul style={{ lineHeight: '1.8' }}>
          <li>
            NEXT_PUBLIC_SUPABASE_URL:{' '}
            {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}
          </li>
          <li>
            NEXT_PUBLIC_SUPABASE_ANON_KEY:{' '}
            {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
              ? '✅ Set'
              : '❌ Missing'}
          </li>
        </ul>
      </div>
    </div>
  );
}
