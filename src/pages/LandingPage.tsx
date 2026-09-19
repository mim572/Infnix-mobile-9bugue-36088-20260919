import { ArrowRight, CheckCircle, Gift, Shield, Smartphone, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  const features = [
    {
      icon: Shield,
      title: 'Secure Platform',
      text: 'Safe account access and trusted transactions built for everyday users.',
    },
    {
      icon: TrendingUp,
      title: 'Daily Earnings',
      text: 'Grow your investments with transparent returns and flexible package options.',
    },
    {
      icon: Smartphone,
      title: 'Mobile Friendly',
      text: 'Fast, clean, and responsive for customers using their phones across Uganda.',
    },
  ];

  const stats = [
    { value: '7,000', label: 'UGX Welcome Bonus' },
    { value: '24/7', label: 'Access Anytime' },
    { value: 'Fast', label: 'Withdrawals' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white">
      <header className="mx-auto max-w-6xl px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center font-bold text-lg">
            S
          </div>
          <div>
            <div className="font-bold">Samsung Earnings</div>
            <div className="text-xs text-slate-400">Invest with confidence</div>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm text-slate-300">
          <a href="#features">Features</a>
          <a href="#about">About</a>
          <a href="#plans">Plans</a>
        </nav>

        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm text-slate-300 hover:text-white">
            Login
          </Link>
          <Link
            to="/register"
            className="rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-4 py-2 text-sm font-semibold"
          >
            Create Account
          </Link>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl gap-12 px-6 py-16 md:grid-cols-2 md:py-20">
          <div className="flex flex-col justify-center">
            <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-sm text-orange-300">
              <Gift className="h-4 w-4" />
              Get 7,000 UGX registration bonus
            </div>

            <h1 className="text-4xl font-black leading-tight md:text-6xl">
              Uganda’s most trusted <span className="text-orange-400">investment platform</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg text-slate-300">
              Invest in Samsung products and digital packages, grow your earnings, and withdraw
              with MTN or Airtel Money.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-6 py-3 font-bold"
              >
                Start Now <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                to="/login"
                className="rounded-xl border border-slate-700 bg-slate-900 px-6 py-3 font-bold text-white"
              >
                Login
              </Link>
            </div>

            <div className="mt-8 flex gap-6 text-sm text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                Instant sign-up
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                Secure withdrawals
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <div className="w-full max-w-lg rounded-3xl border border-slate-700 bg-slate-900/80 p-6 shadow-2xl">
              <div className="rounded-2xl bg-gradient-to-br from-orange-500 via-red-500 to-purple-600 p-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-orange-100">Portfolio</span>
                  <span className="rounded-full bg-white/10 px-2 py-1 text-xs">Live</span>
                </div>

                <div className="mt-8">
                  <div className="text-sm text-orange-100">Available Balance</div>
                  <div className="mt-2 text-4xl font-black">UGX 302,400</div>
                </div>

                <div className="mt-8 grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl bg-black/10 p-3">
                    <div className="text-xl font-bold">+18%</div>
                    <div className="text-xs text-orange-100">This Month</div>
                  </div>
                  <div className="rounded-xl bg-black/10 p-3">
                    <div className="text-xl font-bold">12</div>
                    <div className="text-xs text-orange-100">Products</div>
                  </div>
                  <div className="rounded-xl bg-black/10 p-3">
                    <div className="text-xl font-bold">4.9</div>
                    <div className="text-xs text-orange-100">Rating</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-6 py-16">
          <div className="mb-10 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-400">
              Why Choose Us
            </p>
            <h2 className="mt-3 text-3xl font-bold">A platform built for growth</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {features.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/15 text-orange-400">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-xl font-bold">{title}</h3>
                <p className="text-slate-300">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="about" className="bg-slate-950">
          <div className="mx-auto grid max-w-6xl gap-8 px-6 py-16 md:grid-cols-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-400">
                About us
              </p>
              <h2 className="mt-3 text-3xl font-bold">Built for smart investors</h2>
              <p className="mt-4 text-slate-300">
                We offer a digital investment ecosystem that blends product ownership, daily
                returns, and easy withdrawals. Our mission is to help users grow wealth through a
                simple and transparent platform.
              </p>
            </div>

            <div className="grid gap-4">
              {[
                'Transparent income model',
                'User-friendly dashboard',
                'Referral rewards',
                'Trusted mobile money payments',
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4"
                >
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="plans" className="mx-auto max-w-6xl px-6 py-16">
          <div className="mb-10 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-400">
              Packages
            </p>
            <h2 className="mt-3 text-3xl font-bold">Choose the right plan</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              { name: 'Starter', price: 'UGX 20,000', desc: 'Great for beginners' },
              { name: 'Growth', price: 'UGX 50,000', desc: 'Best for steady growth' },
              { name: 'Premium', price: 'UGX 100,000', desc: 'For serious investors' },
            ].map((plan) => (
              <div key={plan.name} className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <div className="text-sm text-orange-300">{plan.name}</div>
                <div className="mt-3 text-3xl font-black">{plan.price}</div>
                <p className="mt-3 text-slate-300">{plan.desc}</p>

                <ul className="mt-6 space-y-3 text-sm text-slate-300">
                  <li>✔ Daily returns</li>
                  <li>✔ Referral bonus</li>
                  <li>✔ Instant support</li>
                </ul>

                <Link
                  to="/register"
                  className="mt-6 inline-flex w-full justify-center rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-4 py-3 font-bold"
                >
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="rounded-3xl border border-orange-500/20 bg-gradient-to-r from-orange-500/10 to-red-500/10 p-8 text-center">
            <h2 className="text-3xl font-bold">Ready to start earning?</h2>
            <p className="mt-3 text-slate-300">
              Create your account today and claim your welcome bonus.
            </p>

            <Link
              to="/register"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-6 py-3 font-bold"
            >
              Create Account <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
