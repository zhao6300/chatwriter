import { useState, useEffect } from "react";
import { Trash2, Save, Plus, Wrench, Server, Code, Power, PowerOff } from "lucide-react";

interface MCPTool {
  id: string;
  serverName: string;
  command: string;
  args: string;
  enabled: boolean;
}

export default function Tools() {
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newTool, setNewTool] = useState({ serverName: '', command: '', args: '{}', enabled: true });
  const [editState, setEditState] = useState<Record<string, Partial<MCPTool>>>({});

  const fetchTools = async () => {
    try {
      const res = await fetch('/api/tools');
      const data = await res.json();
      if (data.success) setTools(data.tools);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchTools(); }, []);

  const handleAddTool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTool.serverName || !newTool.command) return;
    try {
      await fetch('/api/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTool)
      });
      setNewTool({ serverName: '', command: '', args: '{}', enabled: true });
      setShowAdd(false);
      fetchTools();
    } catch (err) { console.error(err); }
  };

  const handleUpdateTool = async (id: string, directChanges?: Partial<MCPTool>) => {
    const changes = directChanges || editState[id];
    if (!changes) return;
    try {
      await fetch(`/api/tools/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...changes })
      });
      if (!directChanges) {
        setEditState(prev => { const n = {...prev}; delete n[id]; return n; });
      }
      fetchTools();
    } catch (err) { console.error(err); }
  };

  const handleDeleteTool = async (id: string) => {
    try {
      await fetch(`/api/tools/${id}`, { method: 'DELETE' });
      fetchTools();
    } catch (err) { console.error(err); }
  };

  const getEditVal = (tool: MCPTool, key: keyof MCPTool) => {
    return editState[tool.id]?.[key] ?? tool[key];
  };

  const setEditVal = (id: string, key: string, value: any) => {
    setEditState(prev => ({
      ...prev,
      [id]: { ...prev[id], [key]: value }
    }));
  };

  const labelStyle: React.CSSProperties = { fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' };
  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', fontSize: '0.9rem', borderRadius: '8px', background: 'var(--theme-input-bg, rgba(255,255,255,0.04))', border: '1px solid var(--panel-border)', color: 'var(--text-primary)', outline: 'none' };

  return (
    <main className="animate-fade-in" style={{ paddingBottom: '60px', overflowY: 'auto', flex: 1, padding: '0 20px 60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
       <div style={{ width: '100%', maxWidth: '1000px', margin: '0 auto' }}>
       <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '20px' }}>
          <div>
            <h2 style={{ fontSize: '2rem', marginBottom: '8px', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Wrench size={28} /> MCP 智能工具扩展
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>挂载外部 Model Context Protocol (MCP) 服务器以扩充大模型的能力边界。</p>
          </div>
          <button onClick={() => setShowAdd(!showAdd)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '8px' }}>
             <Plus size={18} /> 新增 MCP 工具
          </button>
       </header>

          {/* Add new MCP tool form */}
          {showAdd && (
            <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px', borderLeft: '3px solid var(--accent)' }}>
               <h3 style={{ fontSize: '1.1rem', marginBottom: '20px', color: 'var(--accent)' }}>新增 MCP 工具节点</h3>
               <form onSubmit={handleAddTool}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                     <div>
                       <label style={labelStyle}>工具/服务器名称</label>
                       <input style={inputStyle} placeholder="如: Github Search, Weather API" value={newTool.serverName} onChange={e => setNewTool({...newTool, serverName: e.target.value})} />
                     </div>
                     <div>
                       <label style={labelStyle}>执行指令 (Command)</label>
                       <input style={inputStyle} placeholder="如: npx, node, python" value={newTool.command} onChange={e => setNewTool({...newTool, command: e.target.value})} />
                     </div>
                  </div>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={labelStyle}>启动参数 (Args) - JSON 数组格式</label>
                    <input style={inputStyle} placeholder={'如: ["-y", "@modelcontextprotocol/server-github"]'} value={newTool.args} onChange={e => setNewTool({...newTool, args: e.target.value})} />
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <button type="submit" className="btn-primary" style={{ padding: '10px 28px', borderRadius: '8px' }}>保存绑定</button>
                  </div>
               </form>
            </div>
          )}

          {/* Existing tools list */}
          <div className="glass-panel" style={{ padding: '32px' }}>
             <h3 style={{ fontSize: '1.2rem', marginBottom: '20px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Server size={18} color="var(--accent)" /> 已挂载 MCP 服务节点 ({tools.length})
             </h3>
             
             {tools.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                  <Wrench size={48} style={{ margin: '0 auto 16px auto', opacity: 0.2 }} />
                  <p>当前暂未挂载任何 MCP 服务。点击右上角新增。</p>
                </div>
             ) : (
                tools.map(tool => {
                  const isEditing = !!editState[tool.id];
                  return (
                    <div key={tool.id} style={{ 
                      background: 'rgba(255,255,255,0.02)', border: '1px solid var(--panel-border)', 
                      borderRadius: '12px', padding: '20px', marginBottom: '16px',
                      opacity: tool.enabled ? 1 : 0.6, transition: 'opacity 0.2s'
                    }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isEditing ? '20px' : '0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: tool.enabled ? '#10b981' : '#ef4444', boxShadow: `0 0 8px ${tool.enabled ? '#10b981' : '#ef4444'}` }}></div>
                            <span style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)' }}>{tool.serverName}</span>
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <button 
                              onClick={() => handleUpdateTool(tool.id, { enabled: !tool.enabled })} 
                              style={{ background: 'transparent', border: '1px solid var(--panel-border)', color: tool.enabled ? 'var(--text-secondary)' : '#10b981', cursor: 'pointer', padding: '6px 12px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
                            >
                              {tool.enabled ? <><PowerOff size={14} /> 停用</> : <><Power size={14} /> 启用</>}
                            </button>
                            
                            {!isEditing ? (
                              <button onClick={() => setEditState(p => ({...p, [tool.id]: {}}))} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '6px 12px', borderRadius: '6px', fontSize: '0.9rem' }}>编辑</button>
                            ) : (
                              <button onClick={() => handleUpdateTool(tool.id)} style={{ background: 'var(--success)', border: 'none', color: '#000', cursor: 'pointer', padding: '6px 12px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.9rem', fontWeight: 600 }}><Save size={14} /> 保存</button>
                            )}
                            <button onClick={() => handleDeleteTool(tool.id)} style={{ background: 'transparent', border: 'none', color: 'var(--error)', cursor: 'pointer', padding: '6px 6px' }} title="删除配置">
                              <Trash2 size={18} />
                            </button>
                          </div>
                       </div>

                       {!isEditing ? (
                          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                             <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                <Code size={16} /> 
                                <span style={{ fontFamily: 'monospace', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px' }}>
                                  {tool.command} {tool.args}
                                </span>
                             </div>
                          </div>
                       ) : (
                         <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                              <div>
                                <label style={labelStyle}>工具名称</label>
                                <input style={inputStyle} value={getEditVal(tool, 'serverName') as string} onChange={e => setEditVal(tool.id, 'serverName', e.target.value)} />
                              </div>
                              <div>
                                <label style={labelStyle}>执行指令 (Command)</label>
                                <input style={inputStyle} value={getEditVal(tool, 'command') as string} onChange={e => setEditVal(tool.id, 'command', e.target.value)} />
                              </div>
                            </div>
                            <div>
                               <label style={labelStyle}>启动参数 (Args)</label>
                               <input style={inputStyle} value={getEditVal(tool, 'args') as string} onChange={e => setEditVal(tool.id, 'args', e.target.value)} />
                            </div>
                         </div>
                       )}
                    </div>
                  );
                })
             )}
         </div>
       </div>
    </main>
  );
}
