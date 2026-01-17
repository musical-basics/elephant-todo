import { signIn } from '@/lib/actions/auth';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const params = await searchParams;
  
  return (
    <div className="form-container">
      <h1>Login</h1>
      {params.success && (
        <div style={{ padding: '1rem', marginBottom: '1rem', backgroundColor: '#e8f5e9', border: '1px solid #4caf50', borderRadius: '4px', color: '#2e7d32' }}>
          {params.success}
        </div>
      )}
      {params.error && (
        <div style={{ padding: '1rem', marginBottom: '1rem', backgroundColor: '#fee', border: '1px solid #fcc', borderRadius: '4px', color: '#c33' }}>
          {params.error}
        </div>
      )}
      <form>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required placeholder="Enter your email" />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" required placeholder="Enter your password" />
        </div>
        <div style={{ marginBottom: '1rem', textAlign: 'right' }}>
          <a href="/auth/forgot-password" style={{ fontSize: '0.9rem', color: '#666' }}>Forgot Password?</a>
        </div>
        <div className="form-actions">
          <button type="submit" formAction={signIn} className="btn-primary">Sign In</button>
        </div>
      </form>
      <div style={{ marginTop: '1rem', textAlign: 'center' }}>
        <a href="/auth/signup">Do not have an account? Sign up</a>
      </div>
    </div>
  );
}

