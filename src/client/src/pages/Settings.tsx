import { useState, useEffect, useRef } from "react";
import { Camera, User } from "lucide-react";

export default function Settings() {
  const [theme, setTheme] = useState(() => localStorage.getItem("app_theme") || "dark");
  const [fontSize, setFontSize] = useState(() => localStorage.getItem("app_fontsize") || "medium");
  
  // Profile State
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const account = localStorage.getItem('authAccount') || '';

  // Load user profile
  useEffect(() => {
    if (!account) return;
    fetch(`/api/user/profile?account=${encodeURIComponent(account)}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.user) {
          setDisplayName(data.user.displayName || '');
          setAvatarUrl(data.user.avatar || '');
        }
      })
      .catch(console.error);
  }, [account]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const formData = new FormData();
    formData.append('files', e.target.files[0]);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success && data.files.length > 0) {
        setAvatarUrl(data.files[0].url);
      }
    } catch (err) {
      console.error('Avatar upload failed:', err);
    }
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;
    setSavingProfile(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account, displayName, avatar: avatarUrl })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem("app_theme", theme);
        localStorage.setItem("app_fontsize", fontSize);
        // Dispatch custom event to notify App.tsx to reload header DB data
        window.dispatchEvent(new Event('profileUpdated'));
        window.dispatchEvent(new Event('themeUpdated'));
        alert("个人资料及偏好已保存！");
      }
    } catch (err) {
      console.error('Save failed:', err);
    }
    setSavingProfile(false);
  };

  return (
    <main className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '60px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '8px' }}>账户界面偏好</h2>
        <p style={{ color: 'var(--text-secondary)' }}>设置编辑器的主题及日常使用习惯。大模型底层配置已由管理员在后台全局接管。</p>
      </div>

      <form onSubmit={saveProfile}>
        {/* Profile Settings Section */}
        <div className="glass-panel" style={{ padding: '32px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '20px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '12px' }}>
             个人资料设置
          </h3>
          <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start' }}>
            {/* Avatar Upload */}
            <div style={{ flexShrink: 0, textAlign: 'center' }}>
              <div 
                style={{ 
                  width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)',
                  border: '2px dashed var(--panel-border)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '12px', cursor: 'pointer', overflow: 'hidden', position: 'relative'
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <User size={40} color="var(--text-muted)" />
                )}
                {/* Hover overlay */}
                <div style={{
                  position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s'
                }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0'; }}
                >
                  <Camera size={24} color="#fff" />
                </div>
              </div>
              <input 
                type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*"
                onChange={handleAvatarUpload}
              />
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>点击修改头像</div>
            </div>

            {/* Display Name */}
            <div style={{ flex: 1 }}>
               <div style={{ marginBottom: '20px' }}>
                 <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>标识符 (账号)</label>
                 <input 
                    type="text" 
                    className="input-elegant" 
                    value={account} 
                    disabled
                    style={{ padding: '12px 16px', fontSize: '1rem', borderRadius: '8px', opacity: 0.5, cursor: 'not-allowed' }} 
                 />
                 <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px' }}>登录凭证不可修改。</div>
               </div>
               <div style={{ marginBottom: '20px' }}>
                 <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>姓名/昵称</label>
                 <input 
                    type="text" 
                    className="input-elegant" 
                    placeholder="请输入对您的称呼..."
                    value={displayName} 
                    onChange={(e) => setDisplayName(e.target.value)}
                    style={{ padding: '12px 16px', fontSize: '1rem', borderRadius: '8px' }} 
                 />
               </div>
            </div>
          </div>
        </div>

        {/* View Settings Section */}
        <div className="glass-panel" style={{ padding: '32px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '20px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '12px' }}>
             编辑器视图设为
          </h3>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>平台主色调</label>
            <select className="input-elegant" style={{ padding: '12px 16px', fontSize: '1rem', borderRadius: '8px', appearance: 'none' }} value={theme} onChange={(e) => setTheme(e.target.value)}>
                <option value="dark">全局黑透极夜模式 (默认高配)</option>
                <option value="light">刺眼白炽日间模式</option>
            </select>
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>字号排版</label>
            <select className="input-elegant" style={{ padding: '12px 16px', fontSize: '1rem', borderRadius: '8px', appearance: 'none' }} value={fontSize} onChange={(e) => setFontSize(e.target.value)}>
                <option value="small">紧凑打字机</option>
                <option value="medium">流式顺滑 (推荐)</option>
                <option value="large">宽大阅读流</option>
            </select>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
           <button type="submit" disabled={savingProfile} className="btn-primary" style={{ padding: '12px 32px', fontSize: '1rem' }}>
              {savingProfile ? '正在保存...' : '保存修改'}
           </button>
        </div>
      </form>
    </main>
  );
}
