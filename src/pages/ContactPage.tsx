import { Link } from 'react-router-dom';
import { Mail, Phone, Globe, Github, Instagram } from 'lucide-react';

export function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
      <div className="text-center mb-10">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-lavender-600 mb-4 mx-auto">
          <Mail className="h-7 w-7 text-white" fill="white" />
        </div>
        <h1 className="font-display text-4xl font-semibold text-ink-50">Contact</h1>
        <p className="mt-2 text-lg text-ink-300">Get in touch with us</p>
      </div>

      <div className="prose prose-invert max-w-none">
        <p className="text-ink-300 leading-relaxed mb-6">
          YuriOrbit is built and maintained by JoeKym Labs. We welcome your feedback, questions, and reports.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 max-w-2xl mx-auto mb-10">

        <div className="card-surface p-5">
          <Mail className="h-6 w-6 text-rose-400 mb-2" fill="currentColor" />
          <h2 className="font-semibold text-ink-50">Email (Work)</h2>
          <div className="mt-1 text-sm text-ink-400">
            <a href="mailto:mail.jkyme@gmail.com" className="text-rose-300 hover:underline" rel="noopener noreferrer">
              mail.jkyme@gmail.com
            </a>
          </div>
        </div>

        <div className="card-surface p-5">
          <Phone className="h-6 w-6 text-lavender-400 mb-2" fill="currentColor" />
          <h2 className="font-semibold text-ink-50">Phone</h2>
          <p className="mt-1 text-sm text-ink-400">254117412271</p>
        </div>

        <div className="card-surface p-5">
          <Github className="h-6 w-6 text-rose-400 mb-2" fill="currentColor" />
          <h2 className="font-semibold text-ink-50">GitHub</h2>
          <div className="mt-1 text-sm text-ink-400">
            <a href="https://github.com/JoeKym" target="_blank" rel="noopener noreferrer" className="text-rose-300 hover:underline">
              github.com/JoeKym
            </a>
          </div>
        </div>

        <div className="card-surface p-5">
          <Instagram className="h-6 w-6 text-rose-400 mb-2" fill="currentColor" />
          <h2 className="font-semibold text-ink-50">Instagram</h2>
          <div className="mt-1 text-sm text-ink-400">
            <a href="https://instagram.com/ky.money223" target="_blank" rel="noopener noreferrer" className="text-rose-300 hover:underline">
              @ky.money223
            </a>
          </div>
        </div>

      </div>

      <div className="mt-10 card-surface p-5 border-t pt-8">
        <p className="text-sm text-ink-400">
          <Link to="/discover" className="font-medium text-rose-300 hover:underline">Back to Discover</Link>
          your next GL title.
        </p>
      </div>
    </div>
  );
}