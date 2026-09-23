import { Link } from 'react-router-dom';
import { Activity, Mail, Heart } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const Github = (props) => (
  <svg
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const Twitter = (props) => (
  <svg
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
  </svg>
);

const Linkedin = (props) => (
  <svg
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);


const Footer = () => {
  const { isDark } = useTheme();

  const links = {
    Product: ['Features', 'AI Analyzer', 'Dashboard', 'Hospitals', 'Pricing'],
    Company: ['About Us', 'Careers', 'Blog', 'Press Kit', 'Partners'],
    Resources: ['Documentation', 'API Reference', 'Help Center', 'Community', 'Status'],
    Legal: ['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'HIPAA Compliance'],
  };

  return (
    <footer className={`border-t ${isDark ? 'bg-[#0B1120] border-[#1E293B]' : 'bg-white border-[#E2E8F0]'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8">
          {/* Brand */}
          <div className="col-span-2">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">
                <span className="gradient-text">Medi</span>
                <span className={isDark ? 'text-white' : 'text-[#0F172A]'}>Nova</span>
                <span className="text-[#06B6D4] text-sm ml-1">AI</span>
              </span>
            </Link>
            <p className={`text-sm leading-relaxed mb-6 max-w-xs ${isDark ? 'text-[#94A3B8]' : 'text-[#475569]'}`}>
              AI-powered emergency healthcare platform that saves lives through intelligent triage and real-time hospital routing.
            </p>
            <div className="flex gap-3">
              {[Twitter, Github, Linkedin, Mail].map((Icon, i) => (
                <a key={i} href="#" className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110 ${
                  isDark ? 'bg-[#1E293B] text-[#94A3B8] hover:text-white hover:bg-[#2563EB]' : 'bg-[#F1F5F9] text-[#475569] hover:text-white hover:bg-[#2563EB]'
                }`}>
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          {Object.entries(links).map(([title, items]) => (
            <div key={title}>
              <h4 className={`font-semibold text-sm mb-4 ${isDark ? 'text-white' : 'text-[#0F172A]'}`}>{title}</h4>
              <ul className="space-y-2.5">
                {items.map(item => (
                  <li key={item}>
                    <a href="#" className={`text-sm transition-colors ${
                      isDark ? 'text-[#94A3B8] hover:text-[#06B6D4]' : 'text-[#475569] hover:text-[#2563EB]'
                    }`}>
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className={`mt-12 pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-4 ${
          isDark ? 'border-[#1E293B]' : 'border-[#E2E8F0]'
        }`}>
          <p className={`text-sm ${isDark ? 'text-[#94A3B8]' : 'text-[#475569]'}`}>
            © 2024 Every Second Counts. All rights reserved.
          </p>
          <p className={`text-sm flex items-center gap-1 ${isDark ? 'text-[#94A3B8]' : 'text-[#475569]'}`}>
            Made with <Heart className="w-4 h-4 text-red-500 fill-red-500" /> for healthcare
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
