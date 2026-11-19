import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ArrowUpRight, Check, HardHat, ShieldCheck, Sun } from 'lucide-react'
import { LoginForm } from '@/components/login-form'

export default async function LoginPage() {
  // 🚀 Check if the Express backend auth cookie exists
  const cookieStore = await cookies();
  const token = cookieStore.get('authToken');
  
  if (token) {
    redirect('/dashboard');
  }

  return (
    <main className="login-shell">
      <section aria-label="NTPL project management" className="brand-panel">
        <div className="brand-image" />
        <div className="brand-overlay" />
        <div className="brand-content">
          <a aria-label="NTPL home" className="brand-lockup" href="/login">
            <span className="brand-mark"><Sun aria-hidden="true" size={23} strokeWidth={2.2} /></span>
            <span className="brand-name">NTPL<span>PROJECTS</span></span>
          </a>

          <div className="brand-message">
            <span className="brand-kicker"><span className="live-dot" /> PROJECT OPERATIONS, CONNECTED</span>
            <h2>Build with<br />clarity.</h2>
            <p>One workspace for every site, structure, and solar milestone.</p>
          </div>

          <div className="brand-footer">
            <div className="team-stack" aria-hidden="true">
              <span><HardHat size={15} /></span>
              <span><Sun size={15} /></span>
              <span><Check size={15} /></span>
            </div>
            <p>Built for the people<br />who build what&apos;s next.</p>
            <ArrowUpRight aria-hidden="true" className="brand-footer-arrow" size={18} />
          </div>
        </div>
      </section>

      <section aria-labelledby="login-title" className="form-panel">
        <div className="panel-topline">
          <span>NTPL PROJECT MANAGEMENT SYSTEM</span>
          <span className="security-badge"><ShieldCheck aria-hidden="true" size={14} /> SECURE PORTAL</span>
        </div>
        <div className="form-content">
          <LoginForm />
          <div className="trust-note">
            <ShieldCheck aria-hidden="true" size={16} />
            <p>Your account is protected with encrypted, secure sign-in.</p>
          </div>
        </div>
        <footer className="panel-footer">
          <span>© {new Date().getFullYear()} NTPL</span>
          <span>Solar <i /> Civil <i /> Structure</span>
        </footer>
      </section>
    </main>
  )
}