import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login({ setAuthRole }: { setAuthRole: (role: string) => void }) {
  const navigate = useNavigate();
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");

  const handleAuth = (e: React.FormEvent, roleMock: string) => {
    e.preventDefault();
    if (!account) return;
    
    // Save account for document isolation
    localStorage.setItem('authAccount', account);
    setAuthRole(roleMock);
    navigate('/');
  };

  return (
    <main className="animate-fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '40px' }}>
         <h2 style={{ fontSize: '1.8rem', textAlign: 'center', marginBottom: '8px' }}>平台登录</h2>
         <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '32px' }}>使用您的专有账户进入全流生态</p>

         <form onSubmit={(e) => handleAuth(e, (account === 'admin' && password === 'admin') ? 'ADMIN' : 'USER')}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>账号 (邮箱 / 手机号 / 用户名)</label>
              <input 
                type="text" 
                className="input-elegant"
                style={{ padding: '12px', fontSize: '1rem', borderRadius: '8px' }}
                placeholder="请输入邮箱、手机号或用户名"
                required
                value={account}
                onChange={(e) => setAccount(e.target.value)}
              />
            </div>
            
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>安全密码</label>
              <input 
                type="password" 
                className="input-elegant"
                style={{ padding: '12px', fontSize: '1rem', borderRadius: '8px' }}
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', padding: '14px', fontSize: '1.1rem' }}>
              登 入
            </button>
         </form>
      </div>
    </main>
  );
}
