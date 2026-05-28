import { useState } from 'react';
import axios from 'axios';
import { User, Lock, Mail, ArrowRight } from 'lucide-react';

function Auth({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    try {
      if (isLogin) {
        const res = await axios.post('http://127.0.0.1:5000/api/auth/login', { username, password });
        onLoginSuccess(res.data.token, res.data.user);
      } else {
        await axios.post('http://127.0.0.1:5000/api/auth/register', { username, email, password });
        setSuccess('Registration successful! Please login.');
        setIsLogin(true);
        setPassword('');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Check if backend is running.');
    }
  };

  return (
    <div className="w-full max-w-md flex flex-col items-center gap-8 my-auto mx-auto">
      {/* Brand Logo on Auth Landing */}
      <div className="flex flex-col items-center text-center">
        <img src="/Logo.jpg" className="h-20 w-auto rounded-xl object-contain shadow-sm border border-slate-100" alt="SkillSwap" />
      </div>

      {/* Auth Form */}
      <div className="w-full card p-8">
        <h2 className="text-2xl font-black text-slate-900 mb-1.5">
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>
        <p className="text-slate-500 text-sm mb-6 leading-relaxed">
          {isLogin ? 'Login to trade skills and learn from experts.' : 'Sign up to start sharing and learning cashless.'}
        </p>

        {error && <div className="p-3.5 bg-red-50 border border-red-100 text-red-700 rounded-xl text-xs font-semibold mb-5">{error}</div>}
        {success && <div className="p-3.5 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl text-xs font-semibold mb-5">{success}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 transition-all text-sm"
                  placeholder="name@university.edu"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Username</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 transition-all text-sm"
                placeholder="Enter your username"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 transition-all text-sm"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button type="submit" className="w-full py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-bold transition-all shadow-sm hover:shadow-md hover:shadow-primary-500/10 flex items-center justify-center gap-1.5 mt-6 cursor-pointer">
            <span>{isLogin ? 'Login to SkillSwap' : 'Create Account'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-xs text-primary-500 hover:text-primary-600 font-bold"
          >
            {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Log In'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Auth;
