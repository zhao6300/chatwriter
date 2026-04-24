import { useState, useEffect } from "react";
import { Trash2, Save, ChevronDown, ChevronUp, Plus, Activity, Cpu, Users, FileText } from "lucide-react";

interface SystemStats {
  userCount: number;
  projectCount: number;
  modelCount: number;
  enabledModelCount: number;
}
interface UserInfo {
  id: string;
  account: string;
  displayName: string;
  role: string;
  createdAt: string;
  projectCount: number;
}

interface ModelConfig {
  id: string;
  name: string;
  modelId: string;
  baseUrl: string;
  apiKey: string;
  temperature: number;
  maxTokens: number;
  topP: number;
}

export default function AdminDashboard() {
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editState, setEditState] = useState<Record<string, Partial<ModelConfig>>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [newModel, setNewModel] = useState({ name: '', modelId: '', url: '', sk: '', temperature: 0.7, maxTokens: 2048, topP: 1.0 });

  const [activeTab, setActiveTab] = useState<'models' | 'system'>('system');
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [users, setUsers] = useState<UserInfo[]>([]);

  const fetchSystemInfo = async () => {
    try {
      const statsRes = await fetch('/api/admin/system_stats');
      const statsData = await statsRes.json();
      if (statsData.success) setStats(statsData.stats);

      const usersRes = await fetch('/api/admin/users');
      const usersData = await usersRes.json();
      if (usersData.success) setUsers(usersData.users);
    } catch (err) { console.error(err); }
  };

  const fetchModels = async () => {
    try {
      const res = await fetch('/api/admin/models');
      const data = await res.json();
      if (data.success) setModels(data.models);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { 
    fetchModels(); 
    fetchSystemInfo();
  }, []);

  const handleAddModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModel.name || !newModel.url || !newModel.sk) return;
    try {
      await fetch('/api/admin/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newModel)
      });
      setNewModel({ name: '', modelId: '', url: '', sk: '', temperature: 0.7, maxTokens: 2048, topP: 1.0 });
      setShowAdd(false);
      fetchModels();
    } catch (err) { console.error(err); }
  };

  const handleUpdateModel = async (id: string) => {
    const changes = editState[id];
    if (!changes) return;
    try {
      await fetch('/api/admin/models', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...changes })
      });
      setEditState(prev => { const n = {...prev}; delete n[id]; return n; });
      fetchModels();
    } catch (err) { console.error(err); }
  };

  const handleDeleteModel = async (id: string) => {
    try {
      await fetch('/api/admin/models', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      fetchModels();
    } catch (err) { console.error(err); }
  };

  const getEditVal = (model: ModelConfig, key: keyof ModelConfig) => {
    return editState[model.id]?.[key] ?? model[key];
  };

  const setEditVal = (id: string, key: string, value: any) => {
    setEditState(prev => ({
      ...prev,
      [id]: { ...prev[id], [key]: value }
    }));
  };

  const labelStyle: React.CSSProperties = { fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' };
  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', fontSize: '0.9rem', borderRadius: '8px', background: 'var(--theme-input-bg, rgba(255,255,255,0.04))', border: '1px solid var(--panel-border)', color: 'var(--text-primary)', outline: 'none' };
  const sliderRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '12px' };
  const sliderLabel: React.CSSProperties = { fontSize: '0.85rem', color: 'var(--text-secondary)', minWidth: '50px', textAlign: 'right' };

  return (
    <main className="animate-fade-in" style={{ paddingBottom: '60px', overflowY: 'auto', flex: 1, padding: '0 20px 60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
       <div style={{ width: '100%', maxWidth: '1000px', margin: '0 auto' }}>
       <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '20px' }}>
          <div>
            <h2 style={{ fontSize: '2rem', marginBottom: '8px', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Activity size={28} /> 系统超级控制台
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>全站大语言模型挂载管理网络与连接池。</p>
          </div>
       </header>

       {/* Tabs */}
       <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '16px' }}>
          <button 
            onClick={() => setActiveTab('system')} 
            style={{ padding: '8px 24px', borderRadius: '8px', border: 'none', background: activeTab === 'system' ? 'var(--accent)' : 'transparent', color: activeTab === 'system' ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.95rem', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Activity size={16} /> 运行大盘
          </button>
          <button 
            onClick={() => setActiveTab('models')} 
            style={{ padding: '8px 24px', borderRadius: '8px', border: 'none', background: activeTab === 'models' ? 'var(--accent)' : 'transparent', color: activeTab === 'models' ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.95rem', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Cpu size={16} /> AI 模型挂载
          </button>
       </div>

       {activeTab === 'system' && (
         <div className="animate-fade-in">
            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
               <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}><Users size={16} /> 平台总用户</div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{stats?.userCount || 0}</div>
               </div>
               <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}><FileText size={16} /> 产生文档总数</div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#10b981' }}>{stats?.projectCount || 0}</div>
               </div>
               <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}><Cpu size={16} /> 活跃 AI 节点</div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#fbbf24' }}>{stats?.enabledModelCount || 0} <span style={{fontSize: '1rem', color: 'var(--text-muted)'}}>/{stats?.modelCount || 0}</span></div>
               </div>
            </div>

            {/* Users Table */}
            <div className="glass-panel" style={{ padding: '24px' }}>
               <h3 style={{ fontSize: '1.2rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '12px', color: 'var(--text-primary)' }}>
                 <Users size={18} /> 所有入住用户 ({users.length})
               </h3>
               <div style={{ overflowX: 'auto' }}>
                 <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', color: 'var(--text-primary)' }}>
                   <thead>
                     <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                       <th style={{ padding: '12px', borderBottom: '1px solid var(--panel-border)', fontWeight: 500, color: 'var(--text-muted)' }}>账号</th>
                       <th style={{ padding: '12px', borderBottom: '1px solid var(--panel-border)', fontWeight: 500, color: 'var(--text-muted)' }}>昵称</th>
                       <th style={{ padding: '12px', borderBottom: '1px solid var(--panel-border)', fontWeight: 500, color: 'var(--text-muted)' }}>权限角色</th>
                       <th style={{ padding: '12px', borderBottom: '1px solid var(--panel-border)', fontWeight: 500, color: 'var(--text-muted)' }}>产出文档数</th>
                       <th style={{ padding: '12px', borderBottom: '1px solid var(--panel-border)', fontWeight: 500, color: 'var(--text-muted)' }}>注册时间</th>
                     </tr>
                   </thead>
                   <tbody>
                     {users.map(u => (
                       <tr key={u.id} style={{ borderBottom: '1px solid var(--panel-border)', background: u.role === 'ADMIN' ? 'rgba(251,191,36,0.05)' : 'transparent' }}>
                         <td style={{ padding: '12px', fontSize: '0.9rem' }}>{u.account}</td>
                         <td style={{ padding: '12px', fontSize: '0.9rem', fontWeight: 500 }}>{u.displayName || '-'}</td>
                         <td style={{ padding: '12px', fontSize: '0.85rem' }}>
                           <span style={{ padding: '4px 8px', borderRadius: '4px', background: u.role === 'ADMIN' ? 'rgba(251,191,36,0.1)' : 'rgba(255,255,255,0.05)', color: u.role === 'ADMIN' ? '#fbbf24' : 'var(--text-secondary)' }}>
                              {u.role === 'ADMIN' ? '👑 超级管理员' : '普通用户'}
                           </span>
                         </td>
                         <td style={{ padding: '12px', fontSize: '0.95rem', fontWeight: 600, color: u.projectCount > 0 ? '#10b981' : 'var(--text-muted)' }}>{u.projectCount} 篇</td>
                         <td style={{ padding: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{new Date(u.createdAt).toLocaleString('zh-CN')}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
         </div>
       )}

       {activeTab === 'models' && (
         <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
              <button onClick={() => setShowAdd(!showAdd)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '8px' }}>
                 <Plus size={18} /> 新增模型节点
              </button>
            </div>

          {/* Add new model form */}
          {showAdd && (
            <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px', borderLeft: '3px solid #fbbf24' }}>
               <h3 style={{ fontSize: '1.1rem', marginBottom: '20px', color: '#fbbf24' }}>新增 AI 模型节点</h3>
               <form onSubmit={handleAddModel}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                     <div>
                       <label style={labelStyle}>显示名称</label>
                       <input style={inputStyle} placeholder="如: GPT-4o" value={newModel.name} onChange={e => setNewModel({...newModel, name: e.target.value})} />
                     </div>
                     <div>
                       <label style={labelStyle}>模型标识符 (Model ID)</label>
                       <input style={inputStyle} placeholder="如: gpt-4o, qwen-turbo" value={newModel.modelId} onChange={e => setNewModel({...newModel, modelId: e.target.value})} />
                     </div>
                     <div>
                       <label style={labelStyle}>Base URL (OpenAI 兼容地址)</label>
                       <input style={inputStyle} placeholder="https://api.openai.com/v1" value={newModel.url} onChange={e => setNewModel({...newModel, url: e.target.value})} />
                     </div>
                     <div>
                       <label style={labelStyle}>API Key (SK)</label>
                       <input style={inputStyle} type="password" placeholder="sk-xxxx" value={newModel.sk} onChange={e => setNewModel({...newModel, sk: e.target.value})} />
                     </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                     <div>
                       <label style={labelStyle}>Temperature: {newModel.temperature}</label>
                       <input type="range" min="0" max="2" step="0.1" value={newModel.temperature} onChange={e => setNewModel({...newModel, temperature: parseFloat(e.target.value)})} style={{ width: '100%', accentColor: '#fbbf24' }} />
                     </div>
                     <div>
                       <label style={labelStyle}>Max Tokens: {newModel.maxTokens}</label>
                       <input type="range" min="256" max="32768" step="256" value={newModel.maxTokens} onChange={e => setNewModel({...newModel, maxTokens: parseInt(e.target.value)})} style={{ width: '100%', accentColor: '#fbbf24' }} />
                     </div>
                     <div>
                       <label style={labelStyle}>Top P: {newModel.topP}</label>
                       <input type="range" min="0" max="1" step="0.05" value={newModel.topP} onChange={e => setNewModel({...newModel, topP: parseFloat(e.target.value)})} style={{ width: '100%', accentColor: '#fbbf24' }} />
                     </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <button type="submit" className="btn-primary" style={{ padding: '10px 28px', borderRadius: '8px' }}>确认挂载</button>
                  </div>
               </form>
            </div>
          )}

          {/* Existing models list */}
          <div className="glass-panel" style={{ padding: '32px' }}>
             <h3 style={{ fontSize: '1.2rem', marginBottom: '20px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '12px' }}>
                全局已配载通信端点 ({models.length} 个活跃节点)
             </h3>
             
             {models.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>系统暂未挂载任何计算节点。请点击右上角按钮新增。</p>
             ) : (
               models.map((model) => {
                 const isExpanded = expandedId === model.id;
                 const hasChanges = !!editState[model.id];
                 return (
                   <div key={model.id} style={{ marginBottom: '12px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', overflow: 'hidden', border: isExpanded ? '1px solid rgba(251,191,36,0.3)' : '1px solid transparent', transition: 'border-color 0.2s' }}>
                     {/* Collapsed header */}
                     <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', cursor: 'pointer' }} onClick={() => setExpandedId(isExpanded ? null : model.id)}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                          <strong style={{ color: 'var(--accent)', fontSize: '1rem' }}>{model.name}</strong>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{model.modelId || model.name}</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', opacity: 0.6 }}>T={model.temperature}</span>
                       </div>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {hasChanges && (
                             <button onClick={(e) => { e.stopPropagation(); handleUpdateModel(model.id); }} style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid #fbbf24', color: '#fbbf24', borderRadius: '6px', padding: '6px 14px', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Save size={14} /> 保存更改
                             </button>
                          )}
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteModel(model.id); }} style={{ background: 'transparent', border: 'none', color: 'var(--error)', cursor: 'pointer', padding: '8px' }}>
                             <Trash2 size={18} />
                          </button>
                          {isExpanded ? <ChevronUp size={18} color="var(--text-muted)" /> : <ChevronDown size={18} color="var(--text-muted)" />}
                       </div>
                     </div>

                     {/* Expanded edit form */}
                     {isExpanded && (
                       <div style={{ padding: '0 20px 20px 20px', borderTop: '1px solid var(--panel-border)' }}>
                         <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px', marginBottom: '16px' }}>
                            <div>
                              <label style={labelStyle}>显示名称</label>
                              <input style={inputStyle} value={getEditVal(model, 'name') as string} onChange={e => setEditVal(model.id, 'name', e.target.value)} />
                            </div>
                            <div>
                              <label style={labelStyle}>模型标识符 (Model ID)</label>
                              <input style={inputStyle} value={getEditVal(model, 'modelId') as string} onChange={e => setEditVal(model.id, 'modelId', e.target.value)} />
                            </div>
                            <div>
                              <label style={labelStyle}>Base URL</label>
                              <input style={inputStyle} value={getEditVal(model, 'baseUrl') as string} onChange={e => setEditVal(model.id, 'url', e.target.value)} />
                            </div>
                            <div>
                              <label style={labelStyle}>API Key (留空不修改)</label>
                              <input style={inputStyle} type="password" placeholder="留空表示不修改密钥" onChange={e => setEditVal(model.id, 'sk', e.target.value)} />
                            </div>
                         </div>

                         <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}>
                            <div>
                              <label style={labelStyle}>Temperature: <strong style={{color: '#fbbf24'}}>{getEditVal(model, 'temperature')}</strong></label>
                              <div style={sliderRow}>
                                <span style={sliderLabel}>0</span>
                                <input type="range" min="0" max="2" step="0.1" value={getEditVal(model, 'temperature') as number} onChange={e => setEditVal(model.id, 'temperature', parseFloat(e.target.value))} style={{ flex: 1, accentColor: '#fbbf24' }} />
                                <span style={sliderLabel}>2.0</span>
                              </div>
                            </div>
                            <div>
                              <label style={labelStyle}>Max Tokens: <strong style={{color: '#fbbf24'}}>{getEditVal(model, 'maxTokens')}</strong></label>
                              <div style={sliderRow}>
                                <span style={sliderLabel}>256</span>
                                <input type="range" min="256" max="32768" step="256" value={getEditVal(model, 'maxTokens') as number} onChange={e => setEditVal(model.id, 'maxTokens', parseInt(e.target.value))} style={{ flex: 1, accentColor: '#fbbf24' }} />
                                <span style={sliderLabel}>32K</span>
                              </div>
                            </div>
                            <div>
                              <label style={labelStyle}>Top P: <strong style={{color: '#fbbf24'}}>{getEditVal(model, 'topP')}</strong></label>
                              <div style={sliderRow}>
                                <span style={sliderLabel}>0</span>
                                <input type="range" min="0" max="1" step="0.05" value={getEditVal(model, 'topP') as number} onChange={e => setEditVal(model.id, 'topP', parseFloat(e.target.value))} style={{ flex: 1, accentColor: '#fbbf24' }} />
                                <span style={sliderLabel}>1.0</span>
                              </div>
                            </div>
                         </div>
                       </div>
                     )}
                   </div>
                 );
               })
             )}
         </div>
         </div>
       )}
       </div>
    </main>
  );
}
