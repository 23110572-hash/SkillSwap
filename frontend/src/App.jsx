import { useState, useEffect } from 'react';
import axios from 'axios';
import Auth from './pages/Auth';
import Marketplace from './pages/Marketplace';
import Dashboard from './pages/Dashboard';
import SessionRoom from './pages/SessionRoom';
import Messages from './pages/Messages';
import { Coins, LogOut, ShieldAlert, User, MessageSquare } from 'lucide-react';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('marketplace'); // marketplace, dashboard, session-room, messages
  const [activeMatch, setActiveMatch] = useState(null);
  const [backendOnline, setBackendOnline] = useState(false);
  const [activeChatUser, setActiveChatUser] = useState(null);

  useEffect(() => {
    checkBackend();
  }, []);

  useEffect(() => {
    if (token) {
      fetchProfile();
    }
  }, [token, backendOnline]);

  const checkBackend = async () => {
    try {
      await axios.get('http://127.0.0.1:5000/api/health');
      setBackendOnline(true);
    } catch (err) {
      setBackendOnline(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await axios.get('http://127.0.0.1:5000/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(res.data);
    } catch (err) {
      // Only logout if the token is actually invalid/expired (401).
      // Network errors (backend offline/still booting) should NOT clear the session.
      if (err.response && err.response.status === 401) {
        handleLogout();
      }
      // Otherwise: silently keep the token and retry next time backend is reachable
    }
  };

  const handleLoginSuccess = (newToken, loggedUser) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(loggedUser);
    setPage('marketplace');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
    setActiveMatch(null);
    setPage('marketplace');
  };

  const handleUpdateUser = (updatedUser) => {
    setUser(updatedUser);
  };

  return (
    <div className="min-h-screen bg-[#fbfbfe] flex flex-col items-center relative overflow-hidden font-sans">
      {/* Decorative Top Gradient Line */}
      <div className="w-full h-1.5 bg-gradient-to-r from-primary-600 via-indigo-500 to-sky-400 shrink-0 sticky top-0 z-50"></div>

      {/* Aesthetic Background Glow Blobs - will-change forces GPU layer to avoid layout repaints */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-200/30 rounded-full blur-[130px] pointer-events-none z-0" style={{willChange:'transform'}}></div>
      <div className="absolute bottom-[20%] right-[-10%] w-[45%] h-[45%] bg-primary-100/40 rounded-full blur-[120px] pointer-events-none z-0" style={{willChange:'transform'}}></div>
      <div className="absolute top-[35%] right-[10%] w-[35%] h-[35%] bg-sky-100/30 rounded-full blur-[100px] pointer-events-none z-0" style={{willChange:'transform'}}></div>

      {/* Navigation Header */}
      <header className="w-full bg-white/80 backdrop-blur-md border-b border-slate-200/80 py-3.5 sticky top-[6px] z-45 shadow-sm shadow-slate-100/50">
        <div className="max-w-[1600px] mx-auto w-full px-6 md:px-10 flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setPage('marketplace')}>
            <img src="/Logo.jpg" className="h-10 w-auto rounded-lg object-contain" alt="SkillSwap Logo" />
          </div>

          {user && (
            <nav className="hidden md:flex items-center gap-8">
              <button
                onClick={() => setPage('marketplace')}
                className={`text-sm font-bold transition-colors duration-150 ${page === 'marketplace' ? 'text-primary-600' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Marketplace
              </button>
              <button
                onClick={() => setPage('dashboard')}
                className={`text-sm font-bold transition-colors duration-150 ${page === 'dashboard' ? 'text-primary-600' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setPage('messages')}
                className={`text-sm font-bold transition-colors duration-150 flex items-center gap-1.5 ${page === 'messages' ? 'text-primary-600' : 'text-slate-500 hover:text-slate-900'}`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Messages</span>
              </button>
              <button
                onClick={() => setPage('session-room')}
                className={`text-sm font-bold transition-colors duration-150 ${page === 'session-room' ? 'text-primary-600' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Auditor Room
              </button>
            </nav>
          )}

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                {/* Coin Counter */}
                <div className="flex items-center gap-1.5 bg-primary-50 border border-primary-100 px-3.5 py-1.5 rounded-xl shadow-sm shadow-primary-500/5">
                  <Coins className="text-primary-500 w-4 h-4" />
                  <span className="text-sm font-black text-primary-700">{user.credits} Coins</span>
                </div>
                
                {/* Profile Menu */}
                <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
                  <div 
                    className="flex items-center gap-2.5 cursor-pointer hover:opacity-85 transition-opacity" 
                    onClick={() => setPage('dashboard')}
                    title="Go to Dashboard"
                  >
                    {user.profile_pic ? (
                      <img
                        src={user.profile_pic}
                        alt="Profile"
                        className="h-8 w-8 rounded-full object-cover border border-slate-200"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs border border-primary-200 shadow-sm">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="hidden lg:block text-left">
                      <div className="text-xs font-black text-slate-800 leading-none">{user.username}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5 font-semibold">{user.email}</div>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2 hover:bg-slate-100 text-slate-400 hover:text-red-500 rounded-xl transition-colors duration-150 ml-1 cursor-pointer"
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full flex-1 flex flex-col items-center p-6 md:p-10 max-w-[1600px] z-10 relative">
        {!backendOnline && (
          <div className="w-full max-w-2xl bg-red-50 border border-red-100 p-5 rounded-2xl mb-8 flex gap-4 items-start shadow-sm">
            <ShieldAlert className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-red-950 mb-1">Backend Server Disconnected</h3>
              <p className="text-red-800 text-xs leading-normal">
                SkillSwap cannot query database records or run the AI auditor because the Flask API is offline. Please run the <code className="bg-white/80 px-1 py-0.5 rounded border border-red-200 font-semibold">start.bat</code> script to boot the backend server.
              </p>
            </div>
          </div>
        )}

        {!user ? (
          <Auth onLoginSuccess={handleLoginSuccess} />
        ) : (
          <>
            {/* Mobile Navigation bar */}
            <div className="w-full max-w-[1600px] flex md:hidden bg-white border border-slate-200 rounded-xl p-1 mb-6 justify-around text-xs font-semibold shadow-sm">
              <button
                onClick={() => setPage('marketplace')}
                className={`flex-1 py-2 text-center rounded-lg transition-colors ${page === 'marketplace' ? 'bg-slate-100 text-primary-600' : 'text-slate-500'}`}
              >
                Marketplace
              </button>
              <button
                onClick={() => setPage('dashboard')}
                className={`flex-1 py-2 text-center rounded-lg transition-colors ${page === 'dashboard' ? 'bg-slate-100 text-primary-600' : 'text-slate-500'}`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setPage('messages')}
                className={`flex-1 py-2 text-center rounded-lg transition-colors ${page === 'messages' ? 'bg-slate-100 text-primary-600' : 'text-slate-500'}`}
              >
                Messages
              </button>
              <button
                onClick={() => setPage('session-room')}
                className={`flex-1 py-2 text-center rounded-lg transition-colors ${page === 'session-room' ? 'bg-slate-100 text-primary-600' : 'text-slate-500'}`}
              >
                Auditor Room
              </button>
            </div>

            {page === 'marketplace' && (
              <Marketplace 
                user={user} 
                token={token} 
                onUpdateUser={handleUpdateUser} 
                onStartChat={(instructor) => {
                  setActiveChatUser(instructor);
                  setPage('messages');
                }}
              />
            )}
            
            {page === 'dashboard' && (
              <Dashboard
                user={user}
                token={token}
                onUpdateUser={handleUpdateUser}
                onSelectMatch={(match) => {
                  setActiveMatch(match);
                  setPage('session-room');
                }}
                setPage={setPage}
              />
            )}
            
            {page === 'session-room' && (
              <SessionRoom
                user={user}
                token={token}
                activeMatch={activeMatch}
                onUpdateUser={handleUpdateUser}
                setPage={setPage}
              />
            )}
            
            {page === 'messages' && (
              <Messages
                user={user}
                token={token}
                activeChatUser={activeChatUser}
                setActiveChatUser={setActiveChatUser}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
