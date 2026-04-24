import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Terminal, Lightbulb, FileText, FileImage, Trash2 } from "lucide-react";

export default function Home() {
  const navigate = useNavigate();
  const [idea, setIdea] = useState("");
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const currentUser = localStorage.getItem('authAccount') || 'anonymous';

  // Upload state
  const [attachments, setAttachments] = useState<{name: string, url: string, type: string, size: number}[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    fetch(`/api/projects?userId=${encodeURIComponent(currentUser)}`).then(r => r.json()).then(d => {
      if (d.success) setProjects(d.projects);
    }).catch(() => {});
  }, []);

  const uploadFiles = async (files: FileList | File[]) => {
    const formData = new FormData();
    Array.from(files).forEach(f => formData.append('files', f));
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        setAttachments(prev => [...prev, ...data.files]);
      }
    } catch (err) {
      console.error('Upload failed:', err);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(e.target.files);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files);
    }
  };

  const removeAttachment = (idx: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idea.trim() || loading) return;
    setLoading(true);

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: idea.substring(0, 60), content: '', userId: currentUser })
      });
      const data = await res.json();
      if (data.success && data.project) {
        // Pass idea AND uploaded attachments to Editor
        navigate(`/editor/${data.project.id}`, { state: { idea, attachments } });
      }
    } catch (err) {
      console.error("Failed to create project:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="animate-fade-in" style={{ paddingBottom: '20px', overflow: 'auto' }}>
      <section style={{ textAlign: 'center', marginTop: '4vh', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '2.5rem', marginBottom: '12px', letterSpacing: '-1px', color: 'var(--text-primary)' }}>
          有什么灵感我们<span style={{ color: 'var(--accent)' }}>立刻拉取模型实现？</span>
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '1rem' }}>
          抛弃冗余操作，输入指令直击创作源泉核心。
        </p>

        <form onSubmit={handleGenerate} style={{ maxWidth: 'min(850px, 90%)', margin: '0 auto' }}>
          {/* Hidden file input */}
          <input 
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.txt,.md,.csv,.xlsx,.pptx"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />

          {/* Unified input container */}
          <div 
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            style={{
              background: 'rgba(15, 20, 25, 0.8)',
              border: `1px solid ${isDragOver ? 'var(--accent)' : 'var(--panel-border)'}`,
              borderRadius: '20px',
              boxShadow: isDragOver ? '0 0 0 3px var(--accent-glow)' : '0 4px 20px rgba(0, 0, 0, 0.2)',
              transition: 'all 0.3s ease',
              overflow: 'hidden'
            }}
          >
            {/* Text input row */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '4px 8px 4px 4px' }}>
              <input 
                type="text"
                style={{
                  flex: 1, background: 'transparent', border: 'none', color: 'var(--text-primary)',
                  padding: '16px 20px', fontSize: '1.05rem', outline: 'none'
                }}
                placeholder={attachments.length > 0 ? `已附加 ${attachments.length} 个参考文件，输入创作指令...` : "例如：帮我设计一个关于「春季露营」的营销策划案..."}
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
              />
              <button 
                type="submit" 
                className="btn-primary" 
                disabled={loading}
                style={{ borderRadius: '99px', padding: '10px 24px', fontSize: '1rem', width: '100px', flexShrink: 0 }}>
                {loading ? '...' : '开  始'}
              </button>
            </div>

            {/* Bottom toolbar — extensible action row */}
            <div style={{ 
              display: 'flex', alignItems: 'center', gap: '6px', 
              padding: '6px 12px 10px 12px',
              borderTop: '1px solid rgba(255,255,255,0.04)'
            }}>
              {/* + Upload button */}
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{ 
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: 'rgba(255,255,255,0.06)', border: '1px solid var(--panel-border)',
                  color: 'var(--text-muted)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s', flexShrink: 0, fontSize: '1.1rem', fontWeight: 300
                }}
                onMouseEnter={(e) => { 
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = 'rgba(59,130,246,0.15)'; 
                  el.style.borderColor = 'var(--accent)';
                  el.style.color = 'var(--accent)';
                }}
                onMouseLeave={(e) => { 
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = 'rgba(255,255,255,0.06)'; 
                  el.style.borderColor = 'var(--panel-border)';
                  el.style.color = 'var(--text-muted)';
                }}
                title="上传参考文件"
              >
                +
              </button>

              {/* Attachment pills inline */}
              {attachments.map((a, idx) => (
                <div key={idx} style={{ 
                  display: 'flex', alignItems: 'center', gap: '5px',
                  background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)',
                  borderRadius: '14px', padding: '4px 10px', fontSize: '0.78rem', color: 'var(--accent)'
                }}>
                  {a.type.startsWith('image/') ? <FileImage size={12} /> : <FileText size={12} />}
                  <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                  <button 
                    type="button"
                    onClick={() => removeAttachment(idx)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0', display: 'flex', lineHeight: 1 }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--error)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              ))}

              {/* Placeholder hint when no attachments */}
              {attachments.length === 0 && (
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: '4px' }}>
                  添加参考文件
                </span>
              )}
            </div>
          </div>
        </form>
      </section>

      {/* Project list below input */}
      {projects.length > 0 && (
        <section style={{ maxWidth: 'min(900px, 92%)', margin: '0 auto 32px auto' }}>
          <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileText size={15} /> 最近的项目 — 点击继续编辑
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '10px' }}>
            {projects.slice(0, 12).map(p => (
              <div 
                key={p.id}
                onClick={() => navigate(`/editor/${p.id}`)}
                className="glass-panel"
                style={{ 
                  padding: '14px 16px', cursor: 'pointer', 
                  display: 'flex', alignItems: 'center', gap: '10px',
                  transition: 'all 0.2s', borderColor: 'transparent'
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(251,191,36,0.4)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'transparent'; }}
              >
                <FileText size={16} color="#fbbf24" style={{ flexShrink: 0 }} />
                <div style={{ overflow: 'hidden', flex: 1 }}>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{p.title}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {new Date(p.updatedAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!confirm('确定删除该项目？')) return;
                    fetch(`/api/projects/${p.id}`, { method: 'DELETE' })
                      .then(() => setProjects(prev => prev.filter(x => x.id !== p.id)))
                      .catch(err => console.error(err));
                  }}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', flexShrink: 0, transition: 'color 0.2s' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--error)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
                  title="删除项目"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section style={{ maxWidth: 'min(900px, 92%)', margin: '0 auto' }}>
        <div className="glass-panel" style={{ padding: '24px' }}>
           <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Terminal size={20} color="var(--accent)" /> 官方引擎操作规范指南
           </h3>
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '8px' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <Lightbulb size={18} color="#fbbf24" />
                    <strong style={{ fontSize: '1rem' }}>切换您的大模型底座</strong>
                 </div>
                 <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                    您可以在建立文档后，在右侧面板的 AI 区域中随心切换在管理员面板预留注入的多种不同性格的大语言模型，应对不同需求的撰写标准。
                 </p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '8px' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <Terminal size={18} color="var(--success)" />
                    <strong style={{ fontSize: '1rem' }}>无缝连贯指引式编辑</strong>
                 </div>
                 <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                    直接在 AI 对话窗中说出你的二次要求（例如："把第三段修改得更有侵略性"），AI 会生成一份草稿供您预览，确认后合并到正式文档中。
                 </p>
              </div>
           </div>
        </div>
      </section>
    </main>
  );
}
