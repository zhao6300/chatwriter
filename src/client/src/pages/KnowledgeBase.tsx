import { useState, useEffect } from "react";
import { Folder, FileText, Upload, Plus, Search, Trash2, Library, BookOpen, Clock, Activity, Settings2, LayoutGrid, List } from "lucide-react";

interface Document {
  id: string;
  name: string;
  status: string;
  chunkCount: number;
  createdAt: string;
}

interface KB {
  id: string;
  name: string;
  description: string;
  isPublic: boolean;
  createdAt: string;
  _count?: { documents: number };
}

export default function KnowledgeBase() {
  const [kbs, setKbs] = useState<KB[]>([]);
  const [activeKb, setActiveKb] = useState<KB | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  
  const [showAddKb, setShowAddKb] = useState(false);
  const [newKbData, setNewKbData] = useState({ name: '', description: '', isPublic: false });
  const [isUploading, setIsUploading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const currentUser = localStorage.getItem('authAccount') || '';

  const fetchKbs = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/knowledge?userId=${encodeURIComponent(currentUser)}`);
      const data = await res.json();
      if (data.success) setKbs(data.knowledgeBases);
    } catch (err) { console.error(err); }
  };

  const fetchDocs = async (kbId: string) => {
    try {
      const res = await fetch(`/api/knowledge/${kbId}/documents`);
      const data = await res.json();
      if (data.success) setDocuments(data.documents);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchKbs(); }, [currentUser]);
  useEffect(() => {
     if (activeKb) {
         fetchDocs(activeKb.id);
         // Auto refresh docs state if something is PROCESSING
         const interval = setInterval(() => fetchDocs(activeKb.id), 3000);
         return () => clearInterval(interval);
     }
  }, [activeKb]);

  const handleCreateKb = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKbData.name) return;
    try {
      const res = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newKbData, userId: currentUser })
      });
      const data = await res.json();
      if (data.success) {
        setShowAddKb(false);
        setNewKbData({ name: '', description: '', isPublic: false });
        fetchKbs();
      }
    } catch (err) { console.error(err); }
  };

  const handleDeleteKb = async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!confirm("确认删除该知识库？内部所有解析的切片向量均会销毁。")) return;
      try {
         await fetch(`/api/knowledge/${id}`, { method: 'DELETE' });
         if (activeKb?.id === id) setActiveKb(null);
         fetchKbs();
      } catch (err) { console.error(err); }
  };

  const handleUploadDoc = async () => {
     const input = window.document.createElement('input');
     input.type = 'file';
     input.multiple = true;
     // Allow standard docs
     input.accept = '.txt,.md,.json,.pdf,.docx,.csv';
     input.onchange = async (e: any) => {
        const files = Array.from(e.target.files) as File[];
        if (!files.length || !activeKb) return;
        setIsUploading(true);
        for (const file of files) {
           // Read content text for naive simulation
           const text = await file.text().catch(() => 'BINARY_OR_PDF_CONTENT');
           await fetch(`/api/knowledge/${activeKb.id}/documents`, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ name: file.name, content: text.substring(0, 10000) })
           });
        }
        setIsUploading(false);
        fetchDocs(activeKb.id);
        fetchKbs();
     };
     input.click();
  };

  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', fontSize: '0.9rem', borderRadius: '8px', background: 'var(--theme-input-bg, rgba(255,255,255,0.04))', border: '1px solid var(--panel-border)', color: 'var(--text-primary)', outline: 'none', marginBottom: '16px' };

  return (
    <main className="animate-fade-in" style={{ paddingBottom: '60px', overflowY: 'auto', flex: 1, padding: '0 20px 60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
       <div style={{ width: '100%', maxWidth: '1100px', margin: '0 auto' }}>
          <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '20px' }}>
            <div>
              <h2 style={{ fontSize: '2rem', marginBottom: '8px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Library size={28} color="var(--accent)" /> 知识库
              </h2>
              <p style={{ color: 'var(--text-secondary)' }}>构建并管理您的私有文档库。这些文档将在您进行 AI 创作时作为知识补充背景。</p>
            </div>
            {!activeKb && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                 <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: '6px', border: '1px solid var(--panel-border)', overflow: 'hidden' }}>
                    <button type="button" onClick={() => setViewMode('grid')} style={{ padding: '8px 10px', background: viewMode === 'grid' ? 'var(--accent)' : 'transparent', border: 'none', color: viewMode === 'grid' ? '#fff' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><LayoutGrid size={16} /></button>
                    <button type="button" onClick={() => setViewMode('list')} style={{ padding: '8px 10px', background: viewMode === 'list' ? 'var(--accent)' : 'transparent', border: 'none', color: viewMode === 'list' ? '#fff' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><List size={16} /></button>
                 </div>
                 <button onClick={() => setShowAddKb(!showAddKb)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '8px' }}>
                    <Plus size={18} /> 新建知识库
                 </button>
              </div>
            )}
          </header>

          {showAddKb && !activeKb && (
            <div className="glass-panel animate-fade-in" style={{ padding: '24px', marginBottom: '32px', borderLeft: '3px solid var(--accent)' }}>
               <h3 style={{ fontSize: '1.1rem', marginBottom: '20px', color: 'var(--text-primary)' }}>新建知识库</h3>
               <form onSubmit={handleCreateKb}>
                  <input style={inputStyle} placeholder="知识库名称 (例如: 公司规章制度、2025项目资料)" value={newKbData.name} onChange={e => setNewKbData({...newKbData, name: e.target.value})} />
                  <input style={inputStyle} placeholder="一两句话描述该知识库的内容..." value={newKbData.description} onChange={e => setNewKbData({...newKbData, description: e.target.value})} />
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" className="btn-primary" style={{ padding: '10px 28px', borderRadius: '8px' }}>确认创建</button>
                  </div>
               </form>
            </div>
          )}

          {!activeKb ? (
            <>
             {kbs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                  <Folder size={48} style={{ margin: '0 auto 16px auto', opacity: 0.2 }} />
                  <p>暂无知识库，请点击上方按钮新建。</p>
                </div>
             ) : viewMode === 'grid' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                {kbs.map(kb => (
                  <div 
                    key={kb.id} 
                    className="glass-panel"
                    onClick={() => setActiveKb(kb)}
                    style={{ padding: '24px', cursor: 'pointer', transition: 'all 0.2s', position: 'relative', overflow: 'hidden' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 10px 30px rgba(0,0,0,0.1)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--panel-border)'; }}
                  >
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                           <BookOpen size={20} color="var(--accent)" /> {kb.name}
                        </h3>
                        <button 
                          onClick={(e) => handleDeleteKb(kb.id, e)}
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                          onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = '#ef4444'}
                          onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'}
                        >
                           <Trash2 size={16} />
                        </button>
                     </div>
                     <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '24px', minHeight: '40px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {kb.description || '无描述信息'}
                     </p>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', borderTop: '1px solid var(--panel-border)', paddingTop: '16px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><FileText size={14} /> {kb._count?.documents || 0} 个文档</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={14} /> {new Date(kb.createdAt).toLocaleDateString()}</span>
                     </div>
                  </div>
                ))}
              </div>
             ) : (
              /* List View */
              <div className="glass-panel" style={{ overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', color: 'var(--text-primary)' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                      <th style={{ padding: '14px 20px', borderBottom: '1px solid var(--panel-border)', fontWeight: 500, color: 'var(--text-muted)' }}>知识库名称</th>
                      <th style={{ padding: '14px', borderBottom: '1px solid var(--panel-border)', fontWeight: 500, color: 'var(--text-muted)' }}>描述</th>
                      <th style={{ padding: '14px', borderBottom: '1px solid var(--panel-border)', fontWeight: 500, color: 'var(--text-muted)', textAlign: 'center' }}>文档数</th>
                      <th style={{ padding: '14px', borderBottom: '1px solid var(--panel-border)', fontWeight: 500, color: 'var(--text-muted)' }}>创建时间</th>
                      <th style={{ padding: '14px', borderBottom: '1px solid var(--panel-border)', fontWeight: 500, color: 'var(--text-muted)', textAlign: 'center' }}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kbs.map(kb => (
                      <tr 
                        key={kb.id} 
                        onClick={() => setActiveKb(kb)} 
                        style={{ cursor: 'pointer', borderBottom: '1px solid var(--panel-border)', transition: 'background 0.2s' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.03)'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background='transparent'}
                      >
                        <td style={{ padding: '14px 20px', fontSize: '0.95rem', fontWeight: 500 }}>
                           <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><BookOpen size={16} color="var(--accent)" /> {kb.name}</span>
                        </td>
                        <td style={{ padding: '14px', fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{kb.description || '-'}</td>
                        <td style={{ padding: '14px', fontSize: '0.95rem', textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>{kb._count?.documents || 0}</td>
                        <td style={{ padding: '14px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{new Date(kb.createdAt).toLocaleDateString()}</td>
                        <td style={{ padding: '14px', textAlign: 'center' }}>
                           <button 
                             onClick={(e) => handleDeleteKb(kb.id, e)}
                             style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                             onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = '#ef4444'}
                             onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'}
                           >
                              <Trash2 size={16} />
                           </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
             )}
            </>
          ) : (
             <div className="animate-fade-in glass-panel" style={{ padding: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', marginBottom: '24px', cursor: 'pointer', width: 'fit-content' }} onClick={() => setActiveKb(null)}>
                  <Folder size={16} /> 知识库 <span style={{color: 'var(--text-muted)'}}>/</span> <strong style={{color: 'var(--text-primary)'}}>{activeKb.name}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                  <h3 style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}>文档列表</h3>
                  <div style={{ display: 'flex', gap: '12px' }}>
                     <button onClick={handleUploadDoc} disabled={isUploading} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '8px', opacity: isUploading ? 0.7 : 1 }}>
                       {isUploading ? <Activity size={18} className="spin" /> : <Upload size={18} />} 
                       上传文档
                     </button>
                     <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '8px' }}>
                       <Settings2 size={18} /> 设置
                     </button>
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', color: 'var(--text-primary)' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                        <th style={{ padding: '14px', borderBottom: '1px solid var(--panel-border)', fontWeight: 500, color: 'var(--text-muted)' }}>文件名</th>
                        <th style={{ padding: '14px', borderBottom: '1px solid var(--panel-border)', fontWeight: 500, color: 'var(--text-muted)' }}>分块数量</th>
                        <th style={{ padding: '14px', borderBottom: '1px solid var(--panel-border)', fontWeight: 500, color: 'var(--text-muted)' }}>处理状态</th>
                        <th style={{ padding: '14px', borderBottom: '1px solid var(--panel-border)', fontWeight: 500, color: 'var(--text-muted)' }}>上传时间</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.length === 0 ? (
                        <tr><td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>本知识库中暂无文档。</td></tr>
                      ) : (
                        documents.map(doc => (
                          <tr key={doc.id} style={{ borderBottom: '1px solid var(--panel-border)', transition: 'background 0.2s' }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.02)'} onMouseLeave={e => (e.currentTarget as HTMLElement).style.background='transparent'}>
                            <td style={{ padding: '14px', fontSize: '0.95rem' }}><span style={{display: 'flex', alignItems: 'center', gap: '8px'}}><FileText size={16} color="var(--accent)"/> {doc.name}</span></td>
                            <td style={{ padding: '14px', fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{doc.chunkCount > 0 ? doc.chunkCount : '--'}</td>
                            <td style={{ padding: '14px', fontSize: '0.85rem' }}>
                               {doc.status === 'PROCESSING' ? (
                                  <span style={{ padding: '4px 8px', borderRadius: '4px', background: 'rgba(251,191,36,0.1)', color: '#fbbf24', display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Activity size={12} className="spin" /> 正在处理...</span>
                               ) : doc.status === 'DONE' ? (
                                  <span style={{ padding: '4px 8px', borderRadius: '4px', background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>处理完成</span>
                               ) : (
                                  <span style={{ padding: '4px 8px', borderRadius: '4px', background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>处理失败</span>
                               )}
                            </td>
                            <td style={{ padding: '14px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{new Date(doc.createdAt).toLocaleString('zh-CN')}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
             </div>
          )}
       </div>
       <style dangerouslySetInnerHTML={{__html:`
         @keyframes spin { 100% { transform: rotate(360deg); } }
         .spin { animation: spin 2s linear infinite; }
       `}} />
    </main>
  );
}
