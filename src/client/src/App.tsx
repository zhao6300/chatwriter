import { useState, useEffect, createContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { User } from 'lucide-react';
import Home from './pages/Home';
import Editor from './pages/Editor';
import Settings from './pages/Settings';
import Login from './pages/Login';
import AdminDashboard from './pages/Admin';
import Tools from './pages/Tools';
import KnowledgeBase from './pages/KnowledgeBase';

export const ProfileContext = createContext<{displayName: string, avatar: string, theme: string}>({displayName: '', avatar: '', theme: 'dark'});

function App() {
  const [authRole, setAuthRole] = useState<string | null>(() => {
    return localStorage.getItem('authRole');
  });
  const [profile, setProfile] = useState<{displayName: string, avatar: string}>({displayName: '', avatar: ''});
  const [menuOpen, setMenuOpen] = useState(false);
  const [appTheme, setAppTheme] = useState(() => localStorage.getItem('app_theme') || 'dark');

  useEffect(() => {
    const syncTheme = () => setAppTheme(localStorage.getItem('app_theme') || 'dark');
    window.addEventListener('themeUpdated', syncTheme);
    return () => window.removeEventListener('themeUpdated', syncTheme);
  }, []);

  useEffect(() => {
    document.body.setAttribute('data-theme', appTheme);
    document.documentElement.setAttribute('data-color-mode', appTheme);
  }, [appTheme]);

  const loadProfile = () => {
    const account = localStorage.getItem('authAccount');
    if (!account) return;
    fetch(`/api/user/profile?account=${encodeURIComponent(account)}`)
      .then(r => r.json())
      .then(d => {
        if (d.success && d.user) setProfile({ displayName: d.user.displayName || account, avatar: d.user.avatar || '' });
      }).catch(() => {});
  };

  useEffect(() => {
    loadProfile();
    window.addEventListener('profileUpdated', loadProfile);
    return () => window.removeEventListener('profileUpdated', loadProfile);
  }, []);

  const handleSetAuthRole = (role: string) => {
    setAuthRole(role);
    localStorage.setItem('authRole', role);
  };

  const handleLogout = () => {
    setAuthRole(null);
    localStorage.removeItem('authRole');
    localStorage.removeItem('authAccount');
  };

  return (
    <ProfileContext.Provider value={{...profile, theme: appTheme}}>
      <Router>
        <div className="container">
          <header className="top-bar">
          <Link to="/" style={{textDecoration: 'none'}}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
                疯狂的<span style={{color: 'var(--accent)'}}>文案</span>
              </h1>
          </Link>
          
          <nav style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {authRole && (
              <>
                {/* Fixed Workspace Link */}
                <Link to="/" className="nav-link" style={{ fontSize: '0.95rem', fontWeight: 500 }}>工作台</Link>
                {authRole === 'ADMIN' && (
                  <Link to="/admin" className="nav-link" style={{ fontSize: '0.95rem', fontWeight: 500, color: '#fbbf24' }}>系统监控</Link>
                )}

                <div style={{ position: 'relative' }}>
                  {/* Avatar Button */}
                <div 
                  onClick={() => setMenuOpen(!menuOpen)}
                  style={{ 
                    width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                    cursor: 'pointer', border: `2px solid ${menuOpen ? 'var(--accent)' : 'transparent'}`,
                    transition: 'all 0.2s', boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = menuOpen ? 'var(--accent)' : 'transparent'; }}
                >
                  {profile.avatar ? <img src={profile.avatar} alt="Avatar" style={{width: '100%', height: '100%', objectFit: 'cover'}} /> : <User size={20} color="var(--text-muted)" />}
                </div>

                {/* Dropdown Menu */}
                {menuOpen && (
                  <>
                    {/* Invisible backdrop to close menu when clicking outside */}
                    <div 
                      style={{ position: 'fixed', inset: 0, zIndex: 90 }} 
                      onClick={() => setMenuOpen(false)} 
                    />
                    
                    <div style={{
                      position: 'absolute', top: '56px', right: '0', background: 'var(--panel-bg)',
                      border: '1px solid var(--panel-border)', borderRadius: '12px', padding: '16px',
                      minWidth: '220px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)', zIndex: 100,
                      backdropFilter: 'blur(20px)'
                    }}>
                      {/* User Info Header in Dropdown */}
                      <div style={{ paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                           <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', overflow: 'hidden', flexShrink: 0 }}>
                              {profile.avatar ? <img src={profile.avatar} alt="Avatar" style={{width: '100%', height: '100%', objectFit: 'cover'}} /> : <User size={24} color="var(--text-muted)" style={{margin: '8px'}} />}
                           </div>
                           <div style={{ overflow: 'hidden' }}>
                              <div style={{ fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {profile.displayName || localStorage.getItem('authAccount')}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: authRole === 'ADMIN' ? '#fbbf24' : 'var(--text-muted)', marginTop: '4px' }}>
                                 {authRole === 'ADMIN' ? '👑 超级管理员' : '普通创作者'}
                              </div>
                           </div>
                        </div>
                      </div>

                      {/* Links */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <Link to="/settings" onClick={() => setMenuOpen(false)} style={{ display: 'block', color: 'var(--text-primary)', textDecoration: 'none', padding: '10px 12px', borderRadius: '8px', transition: 'background 0.2s', fontSize: '0.95rem' }} onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)' }} onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>👤 个人资料偏好</Link>
                        <Link to="/knowledge" onClick={() => setMenuOpen(false)} style={{ display: 'block', color: 'var(--text-primary)', textDecoration: 'none', padding: '10px 12px', borderRadius: '8px', transition: 'background 0.2s', fontSize: '0.95rem' }} onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)' }} onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>📚 知识库管理</Link>
                        <Link to="/tools" onClick={() => setMenuOpen(false)} style={{ display: 'block', color: 'var(--text-primary)', textDecoration: 'none', padding: '10px 12px', borderRadius: '8px', transition: 'background 0.2s', fontSize: '0.95rem' }} onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)' }} onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>🔧 MCP 工具管理</Link>
                        
                        <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '8px 0' }} />
                        
                        <button onClick={() => { setMenuOpen(false); handleLogout(); }} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '10px 12px', fontSize: '0.95rem', borderRadius: '8px', transition: 'background 0.2s' }} onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)'; }} onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>退出登录</button>
                      </div>
                    </div>
                  </>
                )}
              </div>
              </>
            )}
          </nav>
        </header>

          <Routes>
            <Route path="/login" element={ <Login setAuthRole={handleSetAuthRole} /> } />
            <Route path="/" element={ authRole ? <Home /> : <Navigate to="/login" /> } />
            <Route path="/editor/:id" element={ authRole ? <Editor /> : <Navigate to="/login" /> } />
            <Route path="/settings" element={ authRole ? <Settings /> : <Navigate to="/login" /> } />
            <Route path="/knowledge" element={ authRole ? <KnowledgeBase /> : <Navigate to="/login" /> } />
            <Route path="/tools" element={ authRole ? <Tools /> : <Navigate to="/login" /> } />
            <Route path="/admin" element={ authRole === 'ADMIN' ? <AdminDashboard /> : <Navigate to="/" /> } />
          </Routes>
        </div>
      </Router>
    </ProfileContext.Provider>
  );
}

export default App;
