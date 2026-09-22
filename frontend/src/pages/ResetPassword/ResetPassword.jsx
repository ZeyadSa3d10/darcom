import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import FormField, { mapFieldErrors } from '../../components/FormField/FormField.jsx';
import { authService } from '../../services/authService.js';
import './ResetPassword.css';
import { useSeo } from '../../hooks/useSeo.js';

export default function ResetPassword() {
  useSeo({ title: 'Reset password | Darcom' });
  const [params] = useSearchParams();
  const [form, setForm] = useState({
    email: params.get('email') || '',
    token: params.get('token') || '',
    newPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [general, setGeneral] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setGeneral('');
    try {
      await authService.resetPassword(form);
      setDone(true);
    } catch (err) {
      const fields = mapFieldErrors(err);
      setErrors(fields);
      if (!Object.keys(fields).length) setGeneral(err.message || 'Reset failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main id="main-content" className="container auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <Link to="/" title="Darcom Home">
            <img src="/logo-dark.png" alt="Darcom Real Estate" className="auth-logo" />
          </Link>
        </div>
        <h1 className="font-display">Reset password</h1>
        {done ? (
          <>
            <div className="alert alert-success" role="status">
              Password reset. Please log in with your new password.
            </div>
            <Link to="/login" className="btn btn-brand w-100">Go to login</Link>
          </>
        ) : (
          <>
            {general && <div className="alert alert-danger" role="alert">{general}</div>}
            <form onSubmit={submit} noValidate>
              <FormField id="rp-email" label="Email" required error={errors.email}>
                <input
                  id="rp-email" type="email" autoComplete="email"
                  className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                  value={form.email} onChange={set('email')}
                />
              </FormField>
              <FormField id="rp-token" label="Reset token" required error={errors.token} hint="Paste the token from your reset email.">
                <input
                  id="rp-token"
                  className={`form-control ${errors.token ? 'is-invalid' : ''}`}
                  value={form.token} onChange={set('token')}
                />
              </FormField>
              <FormField id="rp-password" label="New password" required error={errors.newPassword}>
                <input
                  id="rp-password" type="password" autoComplete="new-password"
                  className={`form-control ${errors.newPassword ? 'is-invalid' : ''}`}
                  value={form.newPassword} onChange={set('newPassword')}
                />
              </FormField>
              <button type="submit" className="btn btn-brand w-100" disabled={busy}>
                {busy ? 'Resetting…' : 'Reset password'}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
