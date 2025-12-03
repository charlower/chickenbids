import { motion } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import styles from './AuthModal.module.css';

type VerifyOTPModalProps = {
  isOpen: boolean;
  onClose: () => void;
  phone: string;
  username?: string;
  email?: string;
  marketing?: boolean;
  onVerifySuccess: () => void;
};

export default function VerifyOTPModal({
  isOpen,
  onClose,
  phone,
  username,
  email,
  marketing,
  onVerifySuccess,
}: VerifyOTPModalProps) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    // Focus first input when modal opens
    inputRefs.current[0]?.focus();

    // Start countdown timer
    const interval = setInterval(() => {
      setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      // Focus previous input on backspace if current is empty
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, 6);
    const newOtp = pastedData
      .split('')
      .concat(Array(6 - pastedData.length).fill(''));
    setOtp(newOtp);

    // Focus the next empty input or last input
    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setLoading(true);

    try {
      const phoneDigits = phone.replace(/\D/g, '');

      // Verify OTP with Supabase
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        phone: `+61${phoneDigits.slice(1)}`,
        token: otpCode,
        type: 'sms',
      });

      if (verifyError) {
        setError(verifyError.message);
        setLoading(false);
        return;
      }

      // If this is a new registration (username provided), create profile
      if (username && email && data.user) {
        // Create profile row with email
        const { error: profileError } = await supabase.from('profiles').insert({
          id: data.user.id,
          username,
          email,
          marketing_opt_in: marketing || false,
        });

        if (profileError) {
          setError(
            'Account created but profile setup failed. Please contact support.'
          );
          setLoading(false);
          return;
        }
      }

      // Success!
      setLoading(false);
      onVerifySuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;

    try {
      const phoneDigits = phone.replace(/\D/g, '');
      await supabase.auth.signInWithOtp({
        phone: `+61${phoneDigits.slice(1)}`,
      });
      setResendTimer(60);
    } catch (err) {
      // Silent fail - user can try again
      console.error('Resend failed:', err);
    }
  };

  const maskedPhone = phone.replace(/(\d{4})\s(\d{3})\s(\d{3})/, '$1 XXX $3');

  return (
    <motion.div
      className={styles.overlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className={styles.modal}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          &gt;&gt; VERIFY PHONE NUMBER &lt;&lt;
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.otpInstructions}>
            Enter the code sent to:
            <div className={styles.phoneDisplay}>{maskedPhone}</div>
          </div>

          <div className={styles.otpContainer} onPaste={handlePaste}>
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type='text'
                inputMode='numeric'
                maxLength={1}
                className={styles.otpInput}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
              />
            ))}
          </div>

          <div className={styles.resendSection}>
            {resendTimer > 0 ? (
              <span className={styles.resendTimer}>
                Resend in {resendTimer}s
              </span>
            ) : (
              <button
                type='button'
                onClick={handleResend}
                className={styles.resendButton}
              >
                RESEND CODE
              </button>
            )}
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <button
            type='submit'
            className={styles.submitButton}
            disabled={loading || otp.join('').length !== 6}
          >
            {loading ? 'VERIFYING...' : 'VERIFY'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}
