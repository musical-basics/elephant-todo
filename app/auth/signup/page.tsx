import { signUp } from '@/lib/actions/auth';

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  
  return (
    <div className="form-container">
      <h1>Sign Up</h1>
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
        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input id="username" name="username" type="text" placeholder="Choose a username" />
        </div>
        <div className="form-group">
          <label htmlFor="first_name">First Name</label>
          <input id="first_name" name="first_name" type="text" placeholder="Enter your first name" />
        </div>
        <div className="form-group">
          <label htmlFor="last_name">Last Name</label>
          <input id="last_name" name="last_name" type="text" placeholder="Enter your last name" />
        </div>
        <div className="form-group">
          <label htmlFor="birthdate">Birthdate</label>
          <input id="birthdate" name="birthdate" type="date" />
        </div>
        <div className="form-group">
          <label htmlFor="gender">Gender</label>
          <select id="gender" name="gender">
            <option value="">Select</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div className="form-actions">
          <button type="submit" formAction={signUp} className="btn-primary">Sign Up</button>
        </div>
      </form>
      <div style={{ marginTop: '1rem', textAlign: 'center' }}>
        <a href="/auth/login">Already have an account? Sign in</a>
      </div>
    </div>
  );
}

