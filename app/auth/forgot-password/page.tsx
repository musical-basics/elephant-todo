import { requestPasswordReset } from '@/lib/actions/auth';

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const params = await searchParams;
  
  return (
    <div className="form-container">
      <h1>Reset Password</h1>
      <p style={{ marginBottom: '1.5rem', color: '#666' }}>
        Enter your email address and we&apos;ll send you a link to reset your password.
      </p>
      
      {params.success && (
        <div style={{ 
          padding: '1rem', 
          marginBottom: '1rem', 
          backgroundColor: '#e8f5e9', 
          border: '1px solid #4caf50', 
          borderRadius: '4px', 
          color: '#2e7d32' 
        }}>
          {params.success}
        </div>
      )}
      
      {params.error && (
        <div style={{ 
          padding: '1rem', 
          marginBottom: '1rem', 
          backgroundColor: '#fee', 
          border: '1px solid #fcc', 
          borderRadius: '4px', 
          color: '#c33' 
        }}>
          {params.error}
        </div>
      )}
      
      <form>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input 
            id="email" 
            name="email" 
            type="email" 
            required 
            placeholder="Enter your email address" 
          />
        </div>
        
        <div className="form-actions">
          <button type="submit" formAction={requestPasswordReset} className="btn-primary">
            Send Reset Link
          </button>
        </div>
      </form>
      
      <div style={{ marginTop: '1rem', textAlign: 'center' }}>
        <a href="/auth/login">Back to Login</a>
      </div>
    </div>
  );
}

