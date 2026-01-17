'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/auth/forgot-password?error=' + encodeURIComponent('Password reset link is invalid or has expired. Please request a new one.'));
      } else {
        setSessionChecked(true);
      }
    };

    checkSession();
  }, [router, supabase.auth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!password || !confirmPassword) {
      setError('All fields are required');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: password,
    });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    await supabase.auth.signOut();
    router.push('/auth/login?success=' + encodeURIComponent('Password updated successfully. Please login with your new password.'));
  };

  if (!sessionChecked) {
    return (
      <div className="form-container">
        <h1>Loading...</h1>
        <p>Please wait while we verify your reset link...</p>
      </div>
    );
  }

  return (
    <div className="form-container">
      <h1>Set New Password</h1>
      <p style={{ marginBottom: '1.5rem', color: '#666' }}>
        Enter your new password below.
      </p>
      
      {error && (
        <div style={{ 
          padding: '1rem', 
          marginBottom: '1rem', 
          backgroundColor: '#fee', 
          border: '1px solid #fcc', 
          borderRadius: '4px', 
          color: '#c33' 
        }}>
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="password">New Password</label>
          <input 
            id="password" 
            name="password" 
            type="password" 
            required 
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter new password (min 6 characters)"
            disabled={loading}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm New Password</label>
          <input 
            id="confirmPassword" 
            name="confirmPassword" 
            type="password" 
            required 
            minLength={6}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            disabled={loading}
          />
        </div>
        
        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </form>
      
      <div style={{ marginTop: '1rem', textAlign: 'center' }}>
        <a href="/auth/login">Back to Login</a>
      </div>
    </div>
  );
}

