import { useState, useEffect, useRef, useMemo, useCallback, useContext } from "react";
import { useParams, useLocation, Link, useNavigate } from "react-router-dom";
import MDEditor from '@uiw/react-md-editor';
import { ArrowLeft, Check, X, Paperclip, FileImage, FileText, Trash2, User, ChevronDown, ChevronRight, ChevronUp, BrainCircuit, Menu } from 'lucide-react';
import { ProfileContext } from '../App';

// Parse structured diff blocks from AI response
function parseDiffBlocks(aiResponse: string): { find: string; replace: string }[] {
  const blocks: { find: string; replace: string }[] = [];
  const regex = /<<<FIND>>>\s*([\s\S]*?)\s*<<<REPLACE>>>\s*([\s\S]*?)\s*<<<END>>>/g;
  let match;
  while ((match = regex.exec(aiResponse)) !== null) {
    blocks.push({ find: match[1].trim(), replace: match[2].trim() });
  }
  return blocks;
}

// Highlight markers for modified content
const HL_START = '<!-- HL_START -->';
const HL_END = '<!-- HL_END -->';
const HL_DIV_START = '<div style="background-color: rgba(251,191,36,0.15); padding: 8px 12px; border-radius: 6px; border: 1px dashed rgba(251,191,36,0.5);">';
const HL_DIV_END = '</div>';

// Wrap text block in highlight markers
function wrapHighlight(text: string): string {
  return `${HL_START}\n${HL_DIV_START}\n\n${text}\n\n${HL_DIV_END}\n${HL_END}`;
}

// Apply diff blocks to document with visual highlighting
function applyDiffWithHighlight(doc: string, blocks: { find: string; replace: string }[]): string {
  let result = doc;
  for (const block of blocks) {
    if (block.find === '') {
      // Pure insertion — append highlighted content
      result += '\n\n' + wrapHighlight(block.replace);
    } else {
      // Find and replace with highlight wrapping
      const idx = result.indexOf(block.find);
      if (idx !== -1) {
        result = result.substring(0, idx) + wrapHighlight(block.replace) + result.substring(idx + block.find.length);
      } else {
        // Fuzzy: try matching the first line
        const firstLine = block.find.split('\n')[0].trim();
        const lineIdx = result.indexOf(firstLine);
        if (lineIdx !== -1) {
          const endIdx = lineIdx + block.find.length;
          const safeEnd = Math.min(endIdx, result.length);
          result = result.substring(0, lineIdx) + wrapHighlight(block.replace) + result.substring(safeEnd);
        } else {
          // Fallback: append as new highlighted section
          result += '\n\n' + wrapHighlight(block.replace);
        }
      }
    }
  }
  return result;
}

// Strip highlight wrappers and convert lines back to normal
function stripHighlights(doc: string): string {
  if (!doc) return '';
  let result = doc;
  
  // Safely remove the structural wrappers we added
  result = result.replace(new RegExp(`<!-- HL_START -->\\n<div style="background-color: rgba\\(251,191,36,0\\.15\\); padding: 8px 12px; border-radius: 6px; border: 1px dashed rgba\\(251,191,36,0\\.5\\);">\\n\\n`, 'g'), '');
  result = result.replace(new RegExp(`\\n\\n</div>\\n<!-- HL_END -->`, 'g'), '');
  
  // Fallback cleanup in case of partial edits by user
  result = result.replace(/<!-- HL_START -->\n?/g, '');
  result = result.replace(/\n?<!-- HL_END -->/g, '');
  result = result.replace(/<div style="background-color: rgba\(251,191,36,0\.15\); padding: 8px 12px; border-radius: 6px; border: 1px dashed rgba\(251,191,36,0\.5\);">\n?/g, '');
  result = result.replace(/\n?<\/div>/g, '');
  
  // Clean up legacy spherical yellow ball markers if they were leftover
  result = result.replace(/^> 🟡 /gm, '');
  
  return result;
}

const ChatBubble = ({ log, isStreaming, profileContext }: any) => {
  const [collapsed, setCollapsed] = useState(false);
  const isAssistant = log.role === 'assistant';

  const { think, response, isCurrentlyThinking } = useMemo(() => {
     if (!isAssistant || !log.content) return { think: '', response: log.content || '', isCurrentlyThinking: false };
     
     const content = log.content;
     const thinkStart = content.indexOf('<think>');
     if (thinkStart === -1) return { think: '', response: content, isCurrentlyThinking: false };
     
     const thinkEnd = content.indexOf('</think>');
     if (thinkEnd === -1) {
       return { 
         think: content.substring(thinkStart + 7).trim(), 
         response: content.substring(0, thinkStart).trim(),
         isCurrentlyThinking: true
       };
     } else {
       return {
         think: content.substring(thinkStart + 7, thinkEnd).trim(),
         response: (content.substring(0, thinkStart) + content.substring(thinkEnd + 9)).trim(),
         isCurrentlyThinking: false
       };
     }
  }, [log.content, isAssistant]);

  return (
    <div style={{ 
      display: 'flex', flexDirection: 'column', padding: '20px', 
      borderBottom: '1px solid rgba(255,255,255,0.03)',
      background: log.role === 'user' ? 'transparent' : 'rgba(255,255,255,0.02)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: log.role === 'user' ? '#e2e8f0' : '#fbbf24', fontSize: '0.8rem', fontWeight: 600 }}>
           {log.role === 'user' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {profileContext.avatar ? <img src={profileContext.avatar} alt="Avatar" style={{width: '100%', height: '100%', objectFit: 'cover'}} /> : <User size={12} color="var(--text-muted)" />}
                </div>
                <span>{profileContext.displayName || localStorage.getItem('authAccount') || 'You'}</span>
              </div>
           ) : "小文"}
        </div>
        
        {/* Collapse toggle for AI results */}
        {isAssistant && (log.content || log.action) && (
          <div 
            onClick={() => setCollapsed(!collapsed)} 
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px' }}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            {collapsed ? '展开执行结果' : '折叠'}
          </div>
        )}
      </div>

      {isAssistant && think && (
        <div className="animate-fade-in" style={{ 
            fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: collapsed ? '0' : '12px', 
            background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', 
            borderLeft: '2px solid #8b5cf6',
            opacity: collapsed ? 0.7 : 1, transition: 'all 0.2s',
            whiteSpace: 'pre-wrap', lineHeight: 1.6
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#8b5cf6', marginBottom: collapsed ? '0' : '6px', fontSize: '0.8rem' }}>
            <BrainCircuit size={14} />
            {isCurrentlyThinking && isStreaming ? '正在深度推演思考中...' : '深度思考完成'}
          </div>
          {!collapsed && think}
        </div>
      )}
      
      {log.action && (
        <div className="animate-fade-in" style={{ 
            fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: collapsed ? '0' : '12px', 
            background: '#000', padding: '10px', borderRadius: '6px', 
            borderLeft: '2px solid #fbbf24', fontFamily: 'monospace',
            opacity: collapsed ? 0.7 : 1, transition: 'all 0.2s'
        }}>
          {log.action}
        </div>
      )}
      
      {!collapsed && (
        <div className="animate-fade-in">
          <div style={{ fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
             {response}
             {isStreaming && (!think || !isCurrentlyThinking) && (
                <span className="cursor-blink" style={{ display: 'inline-block', width: '8px', height: '16px', background: '#fbbf24', marginLeft: '2px', verticalAlign: 'middle' }} />
             )}
          </div>
        </div>
      )}
    </div>
  );
};

export default function Editor() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [dbModels, setDbModels] = useState<any[]>([]);
  const [selectedModelId, setSelectedModelId] = useState("");
  const profileContext = useContext(ProfileContext);

  const initialIdea = location.state?.idea || '';
  const [documentText, setDocumentText] = useState('');
  // Snapshot of document before AI changes (for revert)
  const [docBeforeEdit, setDocBeforeEdit] = useState<string | null>(null);
  // Whether we're in "review highlighted changes" mode
  const [hasHighlights, setHasHighlights] = useState(false);
  
  const [chatInput, setChatInput] = useState("");
  const [selectedText, setSelectedText] = useState("");
  const [isThinkingMode, setIsThinkingMode] = useState(false);
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const [chatLogs, setChatLogs] = useState<{role: string, content: string, action?: string}[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const hasGeneratedRef = useRef(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Collapsed H1 sections (tracked by H1 index)
  const [collapsedSections, setCollapsedSections] = useState<Set<number>>(new Set());

  // Uploaded files for AI context (pre-loaded from Home page or added in Editor)
  const [attachments, setAttachments] = useState<{name: string, url: string, type: string, size: number}[]>(
    () => location.state?.attachments || []
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Layout dragging / collapsing state
  const [leftWidth, setLeftWidth] = useState(220);
  const [rightWidth, setRightWidth] = useState(380);
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [resizingPanel, setResizingPanel] = useState<'left' | 'right' | null>(null);
  const resizeRef = useRef({ startX: 0, startWidth: 0 });

  useEffect(() => {
    if (!resizingPanel) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - resizeRef.current.startX;
      if (resizingPanel === 'left') {
        setLeftWidth(Math.max(150, Math.min(500, resizeRef.current.startWidth + delta)));
      } else if (resizingPanel === 'right') {
        setRightWidth(Math.max(250, Math.min(800, resizeRef.current.startWidth - delta)));
      }
    };
    const handleMouseUp = () => setResizingPanel(null);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingPanel]);

  const startResize = (e: React.MouseEvent, panel: 'left' | 'right', currentWidth: number) => {
    e.preventDefault();
    resizeRef.current = { startX: e.clientX, startWidth: currentWidth };
    setResizingPanel(panel);
  };

  // Listen to text selection in the editor to bind AI command context
  const handleSelectionChange = useCallback(() => {
    setTimeout(() => {
      const activeEl = document.activeElement;
      // If user is interacting with the chat panel or sidebar, do not interfere
      if (activeEl?.closest('.editor-chat') || activeEl?.closest('.editor-sidebar')) {
        return;
      }

      let text = '';
      
      // Ensure selection actually originates inside the MDEditor region
      const selection = window.getSelection();
      const isInsideEditor = selection && selection.rangeCount > 0 && 
        (editorRef.current?.contains(selection.anchorNode) || editorRef.current?.contains(selection.focusNode));

      if (isInsideEditor) {
         text = selection.toString();
      }

      // Fallback for raw textarea (which getSelection may not cover in some browsers)
      if (!text) {
        const textarea = editorRef.current?.querySelector('textarea');
        if (textarea && textarea.selectionStart !== textarea.selectionEnd) {
          text = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd);
        }
      }
      setSelectedText(text.trim());
    }, 50);
  }, []);

  useEffect(() => {
    document.addEventListener('mouseup', handleSelectionChange);
    document.addEventListener('keyup', handleSelectionChange);
    return () => {
      document.removeEventListener('mouseup', handleSelectionChange);
      document.removeEventListener('keyup', handleSelectionChange);
    };
  }, [handleSelectionChange]);

  // Parse headings from markdown for outline with line numbers
  const outlineItems = useMemo(() => {
    const clean = stripHighlights(documentText);
    if (!clean) return [];
    const lines = clean.split('\n');
    const items: { level: number; text: string; lineIndex: number }[] = [];
    lines.forEach((l, idx) => {
      const match = l.match(/^(#{1,4})\s+(.+)/);
      if (match) {
        items.push({ level: match[1].length, text: match[2].replace(/[*_`]/g, ''), lineIndex: idx });
      }
    });
    return items;
  }, [documentText]);

  // Toggle collapse for an H1 section
  const toggleCollapse = (h1Index: number) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(h1Index)) next.delete(h1Index);
      else next.add(h1Index);
      return next;
    });
  };

  // Jump to heading line in editor
  const jumpToHeading = (lineIndex: number) => {
    const textarea = editorRef.current?.querySelector('textarea');
    if (textarea) {
      const lines = textarea.value.split('\n');
      let pos = 0;
      for (let i = 0; i < Math.min(lineIndex, lines.length); i++) {
        pos += lines[i].length + 1;
      }
      textarea.focus();
      textarea.setSelectionRange(pos, pos);
    }
    
    // Force DOM scrolling since the textarea focus might be visually hidden/unscrollable
    const lineHeight = 24; // Approx line height 
    const scrollAmount = Math.max(0, lineIndex * lineHeight - 60); // give some top padding
    
    // Support uiw MDEditor wrappers
    requestAnimationFrame(() => {
      const textScroll = editorRef.current?.querySelector('.w-md-editor-text');
      if (textScroll) textScroll.scrollTop = scrollAmount;
      
      const previewScroll = editorRef.current?.querySelector('.w-md-editor-preview');
      if (previewScroll) previewScroll.scrollTop = scrollAmount;
    });
  };

  // Scroll chat to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLogs]);

  // Load models, trigger auto-draft
  useEffect(() => {
    // If opening an existing project (no initialIdea), load its content from DB
    if (!initialIdea && id) {
      fetch(`/api/projects/${id}`)
        .then(r => r.json())
        .then(d => {
          if (d.success && d.project && d.project.content) {
            setDocumentText(d.project.content);
          }
        })
        .catch(() => {});
    }

    fetch('/api/admin/models')
      .then(r => r.json())
      .then(d => {
        if (d.models && d.models.length > 0) {
           setDbModels(d.models);
           const initialModelId = d.models[0].id;
           setSelectedModelId(initialModelId);
           
           if (initialIdea && !hasGeneratedRef.current) {
               hasGeneratedRef.current = true;
               streamRequest(
                 [
                   { role: 'system', content: '你是文案专家，直接用 Markdown 格式写出大纲及框架草稿内容，不需要说多余的解释。使用标题、列表等清晰排版。' },
                   { role: 'user', content: initialIdea }
                 ],
                 initialModelId,
                 true
               );
           }
        }
      })
      .catch(e => console.error(e));
  }, []);

  // Core streaming function
  const streamRequest = useCallback(async (
    messages: {role: string, content: string}[], 
    modelId: string, 
    isInitialDraft: boolean = false
  ) => {
    setIsStreaming(true);
    
    setChatLogs(prev => [...prev, { 
      role: 'assistant', 
      content: '', 
      action: isInitialDraft ? '⚡ 正在生成初始草案...' : '🔧 正在分析并生成修改...'
    }]);

    let fullContent = '';

    // Create abort controller for this request
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, selectedModelId: modelId }),
        signal: controller.signal
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        setChatLogs(prev => {
          const n = [...prev];
          n[n.length - 1] = { role: 'assistant', content: '无法建立流式连接。' };
          return n;
        });
        setIsStreaming(false);
        return;
      }

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          try {
            const payload = JSON.parse(trimmed.slice(6));
            if (payload.done) continue;
            if (payload.content) {
              fullContent += payload.content;
              setChatLogs(prev => {
                const n = [...prev];
                n[n.length - 1] = { 
                  role: 'assistant', 
                  content: fullContent, 
                  action: isInitialDraft ? '⚡ 正在生成初始草案...' : '🔧 正在分析并生成修改...'
                };
                return n;
              });
            }
          } catch (e) { /* skip */ }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User stopped — keep partial content
        setChatLogs(prev => {
          const n = [...prev];
          n[n.length - 1] = { role: 'assistant', content: fullContent + '\n\n*━━ 已停止生成 ━━*' };
          return n;
        });
      } else {
        console.error(err);
        fullContent = '连接后端 API 失败，请确保 Express 已启动。';
      }
    }

    abortRef.current = null;

    // Finalize
    setChatLogs(prev => {
      const n = [...prev];
      n[n.length - 1] = { role: 'assistant', content: fullContent };
      return n;
    });
    setIsStreaming(false);

    if (isInitialDraft) {
      setDocumentText(fullContent);
      try {
        await fetch(`/api/projects/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: fullContent })
        });
      } catch (e) {}
    } else {
      // Parse structured diff blocks from AI response
      const diffBlocks = parseDiffBlocks(fullContent);
      
      if (diffBlocks.length > 0) {
        // Save snapshot for revert
        setDocBeforeEdit(documentText);
        // Apply diffs with blockquote highlighting
        const highlighted = applyDiffWithHighlight(documentText, diffBlocks);
        setDocumentText(highlighted);
        setHasHighlights(true);
        setChatLogs(prev => [...prev, { 
          role: 'assistant', 
          action: '📋 修改已高亮标注',
          content: `已在文档中定位并标记了 ${diffBlocks.length} 处修改（黄色高亮）。请检查后点击「确认合并」采纳，或「撤销」恢复原文。` 
        }]);
      } else {
        // Fallback: AI didn't use structured format, treat whole response as highlighted addition
        setDocBeforeEdit(documentText);
        setDocumentText(documentText + '\n\n' + wrapHighlight(fullContent));
        setHasHighlights(true);
        setChatLogs(prev => [...prev, { 
          role: 'assistant', 
          action: '📋 草稿已生成',
          content: '修改内容已高亮显示在编辑器中，请检查后点击「确认合并」或「撤销」。' 
        }]);
      }
    }
  }, [id, documentText]);

  const handleCommandSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isStreaming) return;
    
    const userMsg = chatInput;
    setChatInput("");
    setChatLogs(prev => [...prev, { role: 'user', content: userMsg }]);

    // Clean document before sending to AI (remove any lingering marks)
    const cleanDoc = stripHighlights(documentText);

    // Build attachment context for AI
    const attachmentContext = attachments.length > 0 
      ? `\n\n用户附带了以下参考文件：\n${attachments.map(a => `- ${a.name} (${a.type}, ${(a.size / 1024).toFixed(1)}KB)`).join('\n')}\n请参考这些文件内容来完成用户的要求。`
      : '';

    const thinkContext = isThinkingMode
      ? `\n\n【重要要求！！！】当前已经启用了「深度思考模式」。在回答前，你必须先进行多步骤的深度推理，并将推理过程完整地放置在回复的最开头，并使用 <think> 和 </think> 标签包裹。思考完毕后，再输出最终的修改块结果。`
      : '';

    const selectionContext = selectedText 
      ? `\n\n【🎯 强制执行范围：用户当前高亮选中了以下段落】\n\`\`\`\n${selectedText}\n\`\`\`\n请你**必须仅针对这段被选中的文本**执行指令。对于非选中的其余部分，绝不能做出除错别字外的任何修改！在返回结果时，<<<FIND>>> 块内的原文应当精确来源于（或等于）这一段选中文本。`
      : '';

    const messages = [
      { role: 'system' as const, content: `你是文案专家。当前文档内容如下：

${cleanDoc}${attachmentContext}${selectionContext}${thinkContext}

用户接下来会给你修改指令。请只输出需要修改的部分，使用以下严格格式：

<<<FIND>>>
要被替换的原文片段（精确匹配文档中的文字）
<<<REPLACE>>>
替换后的新内容
<<<END>>>

如果有多处修改，请输出多个这样的块。如果是纯新增内容（不替换任何原文），在 FIND 中留空。
不要输出任何其他解释文字，只输出修改块。`
      },
      { role: 'user' as const, content: userMsg }
    ];

    await streamRequest(messages, selectedModelId, false);
  };

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    Array.from(files).forEach(f => formData.append('files', f));

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        setAttachments(prev => [...prev, ...data.files]);
        setChatLogs(prev => [...prev, { 
          role: 'assistant', 
          content: `📎 已上传 ${data.files.length} 个文件：${data.files.map((f: any) => f.name).join('、')}` 
        }]);
      }
    } catch (err) {
      console.error('Upload failed:', err);
    }
    // Reset input so same file can be re-uploaded
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (idx: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  // Accept highlighted changes — strip highlight markers
  const acceptChanges = () => {
    const clean = stripHighlights(documentText);
    setDocumentText(clean);
    setDocBeforeEdit(null);
    setHasHighlights(false);
    fetch(`/api/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: clean })
    }).catch(() => {});
    setChatLogs(prev => [...prev, { role: 'assistant', content: '✅ 所有修改已确认合并，高亮已清除。' }]);
  };

  // Reject changes — revert to snapshot
  const rejectChanges = () => {
    if (docBeforeEdit !== null) {
      setDocumentText(docBeforeEdit);
    }
    setDocBeforeEdit(null);
    setHasHighlights(false);
    setChatLogs(prev => [...prev, { role: 'assistant', content: '🗑️ 修改已撤销，文档已恢复原样。' }]);
  };

  return (
    <main className="animate-fade-in editor-layout" style={{ userSelect: resizingPanel ? 'none' : 'auto' }}>
      {/* Column 1: Sidebar with outline */}
      {!isLeftCollapsed && (
        <aside className="glass-panel editor-sidebar" style={{ padding: '16px', flex: `0 0 ${leftWidth}px`, width: leftWidth }}>
          <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <Link to="/" style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}>
                <ArrowLeft size={14} /> 返回首页
             </Link>
             <button 
               onClick={() => setIsLeftCollapsed(true)} 
               style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: '4px', borderRadius: '4px', transition: 'background 0.2s' }}
               onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)' }}
               onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
               title="折叠大纲"
             >
                <ArrowLeft size={14} />
             </button>
          </div>

        <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>文档大纲</h4>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {outlineItems.length === 0 ? (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>尚无标题结构</p>
          ) : (() => {
            let h1Counter = -1;
            return (
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {outlineItems.map((item, idx) => {
                  if (item.level === 1) h1Counter++;
                  const currentH1 = h1Counter;
                  const isCollapsed = collapsedSections.has(currentH1);
                  // Hide sub-items if parent H1 is collapsed
                  if (item.level > 1 && isCollapsed) return null;
                  return (
                    <li key={idx} style={{ 
                      fontSize: item.level === 1 ? '0.88rem' : '0.78rem',
                      color: item.level === 1 ? 'var(--accent)' : 'var(--text-secondary)',
                      paddingLeft: `${(item.level - 1) * 14}px`,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      display: 'flex', alignItems: 'center', gap: '4px',
                      padding: '4px 6px', borderRadius: '4px', cursor: 'pointer',
                      transition: 'background 0.15s',
                      marginLeft: `${(item.level - 1) * 14}px`,
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      {item.level === 1 ? (
                        <span 
                          onClick={(e) => { e.stopPropagation(); toggleCollapse(currentH1); }}
                          style={{ cursor: 'pointer', userSelect: 'none', display: 'inline-block', width: '14px', flexShrink: 0, transition: 'transform 0.2s', transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)' }}
                        >▶</span>
                      ) : (
                        <span style={{ width: '14px', flexShrink: 0, textAlign: 'center' }}>•</span>
                      )}
                      <span onClick={() => jumpToHeading(item.lineIndex)} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        {item.text}
                      </span>
                    </li>
                  );
                })}
              </ul>
            );
          })()}
        </div>
      </aside>
      )}

      {/* Left Resizer Drag Handle */}
      {!isLeftCollapsed && (
        <div 
          onMouseDown={(e) => startResize(e, 'left', leftWidth)}
          style={{ width: '8px', cursor: 'col-resize', background: resizingPanel === 'left' ? 'var(--accent)' : 'transparent', transition: 'background 0.2s', margin: '0 -4px', zIndex: 10, alignSelf: 'stretch' }}
          onMouseEnter={(e) => { if (resizingPanel !== 'left') (e.currentTarget as HTMLElement).style.background = 'rgba(59,130,246,0.3)' }}
          onMouseLeave={(e) => { if (resizingPanel !== 'left') (e.currentTarget as HTMLElement).style.background = 'transparent' }}
        />
      )}

      {/* Collapsed Left Sidebar Strip */}
      {isLeftCollapsed && (
         <div className="glass-panel" style={{ width: '45px', flex: '0 0 45px', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 0', zIndex: 10 }}>
             <button 
               onClick={() => setIsLeftCollapsed(false)} 
               style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '8px', borderRadius: '6px', transition: 'all 0.2s', alignSelf: 'center' }}
               title="展开大纲"
               onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
               onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
             >
                <Menu size={18} />
             </button>
         </div>
      )}

      {/* Column 2: Markdown Editor with highlight banner */}
      <section className="glass-panel editor-main" style={{ position: 'relative' }}>
        {/* Highlighted changes review banner */}
        {hasHighlights && (
          <div style={{ 
            margin: '12px 16px 0 16px',
            padding: '8px 16px', 
            background: 'var(--theme-banner-bg, rgba(251,191,36,0.08))', 
            border: '1px solid rgba(251,191,36,0.3)',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(251,191,36,0.04)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
          }}>
            <span style={{ fontSize: '0.8rem', color: '#fbbf24', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#fbbf24', boxShadow: '0 0 6px rgba(251,191,36,0.6)' }}></span>
              框选高亮部分为 AI 的重写方案，请确认是否采纳
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={rejectChanges} 
                style={{ background: 'var(--theme-btn-err-bg, rgba(239,68,68,0.1))', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', padding: '4px 12px', cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', transition: 'all 0.2s' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.2)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--theme-btn-err-bg, rgba(239,68,68,0.1))' }}
              >
                <X size={12} /> 撤销还原
              </button>
              <button 
                onClick={acceptChanges} 
                style={{ background: 'var(--theme-btn-succ-bg, rgba(16,185,129,0.15))', color: '#10b981', border: '1px solid rgba(16,185,129,0.4)', borderRadius: '6px', padding: '4px 12px', cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', transition: 'all 0.2s' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(16,185,129,0.25)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--theme-btn-succ-bg, rgba(16,185,129,0.15))' }}
              >
                <Check size={12} /> 确认留存
              </button>
            </div>
          </div>
        )}

        <div ref={editorRef} data-color-mode={profileContext.theme || 'dark'} style={{ flex: '1', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <MDEditor 
            value={documentText}
            onChange={(v) => setDocumentText(v || '')}
            height="100%"
            style={{ 
              flex: 1, 
              background: 'transparent',
              border: 'none',
              boxShadow: 'none'
            }}
            textareaProps={{
              placeholder: '在此处键入 Markdown 富文本...'
            }}
          />
        </div>
      </section>

      {/* Right Resizer Drag Handle */}
      <div 
        onMouseDown={(e) => startResize(e, 'right', rightWidth)}
        style={{ width: '8px', cursor: 'col-resize', background: resizingPanel === 'right' ? 'var(--accent)' : 'transparent', transition: 'background 0.2s', margin: '0 -4px', zIndex: 10, alignSelf: 'stretch' }}
        onMouseEnter={(e) => { if (resizingPanel !== 'right') (e.currentTarget as HTMLElement).style.background = 'rgba(59,130,246,0.3)' }}
        onMouseLeave={(e) => { if (resizingPanel !== 'right') (e.currentTarget as HTMLElement).style.background = 'transparent' }}
      />

      {/* Column 3: 让我帮助你 */}
      <aside className="glass-panel editor-chat" style={{ flex: `0 0 ${rightWidth}px`, width: rightWidth }}>
        <div style={{ padding: '14px 20px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--panel-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1rem', color: '#fbbf24' }}>让我帮助你</h3>
          <select 
             className="input-elegant" 
             style={{ width: 'auto', padding: '4px 8px', fontSize: '0.8rem', borderRadius: '4px', background: 'var(--bg-color)', maxWidth: '150px' }}
             value={selectedModelId}
             onChange={(e) => setSelectedModelId(e.target.value)}
          >
             {dbModels.length === 0 ? <option>暂无可选模型</option> : dbModels.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
             ))}
          </select>
        </div>
        
        <div style={{ flex: '1', padding: '0', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
           {chatLogs.length === 0 && (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                 {initialIdea ? '正在等待 AI 生成初始草案...' : '输入指令，AI 将为您修改文案并生成草稿供您确认。'}
              </div>
           )}
           {chatLogs.map((log, idx) => (
             <ChatBubble 
               key={idx} 
               log={log} 
               profileContext={profileContext} 
               isStreaming={isStreaming && idx === chatLogs.length - 1 && log.role === 'assistant'} 
             />
           ))}
           <div ref={chatEndRef} />
        </div>

        <form onSubmit={handleCommandSend} style={{ padding: '16px', borderTop: '1px solid var(--panel-border)', background: 'rgba(0,0,0,0.2)' }}>
          {/* Hidden file input */}
          <input 
            ref={fileInputRef}
            type="file" 
            multiple 
            accept="image/*,.pdf,.doc,.docx,.txt,.md,.csv,.xlsx,.pptx"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
          
          {/* Attachment pills */}
          {attachments.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
              {attachments.map((a, idx) => (
                <div key={idx} style={{ 
                  display: 'flex', alignItems: 'center', gap: '4px',
                  background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)',
                  borderRadius: '6px', padding: '4px 8px', fontSize: '0.75rem', color: 'var(--accent)'
                }}>
                  {a.type.startsWith('image/') ? <FileImage size={12} /> : <FileText size={12} />}
                  <span style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                  <button 
                    type="button" 
                    onClick={() => removeAttachment(idx)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0', display: 'flex' }}
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Selected Text context pill */}
          {selectedText && (
             <div className="animate-fade-in" style={{ padding: '8px 12px', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '8px', fontSize: '0.8rem', color: '#8b5cf6', marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                   <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                      <Check size={14} /> 已锁定选中的 {selectedText.length} 个字符进行针对编辑
                   </span>
                   <button type="button" onClick={() => setSelectedText('')} style={{ background: 'none', border: 'none', color: '#8b5cf6', cursor: 'pointer', padding: 0, display: 'flex' }} title="清除高亮锁定">
                      <X size={14}/>
                   </button>
                </div>
                <div style={{ fontSize: '0.75rem', opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontStyle: 'italic', paddingLeft: '18px' }}>
                   "{selectedText}"
                </div>
             </div>
          )}

          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', border: '1px solid var(--panel-border)', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Layer 1: Input text wrapper */}
            <input 
               type="text" 
               style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', fontSize: '0.9rem', padding: '4px 0' }}
               placeholder={isStreaming ? "生成中，可点击停止..." : attachments.length > 0 ? `已附加 ${attachments.length} 个文件，输入指令...` : "发送指令或要求..."}
               value={chatInput}
               disabled={isStreaming}
               onChange={(e) => setChatInput(e.target.value)}
            />

            {/* Layer 2: Tools and Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()}
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--panel-border)', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px 10px', borderRadius: '6px', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }}
                    title="上传文件/图片"
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
                  >
                    <Paperclip size={14} />
                  </button>

                  <div style={{ position: 'relative' }}>
                     <button
                        type="button" 
                        onClick={() => setModeMenuOpen(!modeMenuOpen)} 
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--panel-border)', padding: '6px 10px', borderRadius: '6px', color: isThinkingMode ? 'var(--accent)' : 'var(--text-muted)', fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
                     >
                        {isThinkingMode ? <><BrainCircuit size={14}/> 思考模式</> : '快速模式'}
                        <ChevronUp size={14} />
                     </button>

                     {modeMenuOpen && (
                        <>
                           <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={() => setModeMenuOpen(false)} />
                           <div className="animate-fade-in" style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, background: 'rgba(15,20,25,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '6px', zIndex: 100, minWidth: '140px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)' }}>
                               <div 
                                 onClick={() => { setIsThinkingMode(false); setModeMenuOpen(false); }} 
                                 style={{ padding: '8px 12px', fontSize: '0.85rem', color: !isThinkingMode ? 'var(--accent)' : 'var(--text-primary)', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'background 0.2s' }}
                                 onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
                                 onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                               >
                                  快速模式 {!isThinkingMode && <Check size={14} />}
                               </div>
                               <div 
                                 onClick={() => { setIsThinkingMode(true); setModeMenuOpen(false); }} 
                                 style={{ padding: '8px 12px', fontSize: '0.85rem', color: isThinkingMode ? 'var(--accent)' : 'var(--text-primary)', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'background 0.2s' }}
                                 onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
                                 onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                               >
                                  <span style={{display: 'flex', alignItems: 'center', gap: '6px'}}><BrainCircuit size={14}/> 思考模式</span> {isThinkingMode && <Check size={14} />}
                               </div>
                           </div>
                        </>
                     )}
                  </div>
               </div>

               <div>
                 {isStreaming ? (
                   <button 
                     type="button" 
                     onClick={() => abortRef.current?.abort()}
                     style={{ background: 'var(--error)', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '6px 16px', fontWeight: 600, fontSize: '0.85rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}
                   >
                     ■ 停止
                   </button>
                 ) : (
                   <button 
                     type="submit" 
                     disabled={!chatInput.trim()}
                     style={{ background: chatInput.trim() ? 'var(--accent)' : 'rgba(255,255,255,0.1)', border: 'none', color: chatInput.trim() ? '#fff' : 'rgba(255,255,255,0.3)', cursor: chatInput.trim() ? 'pointer' : 'not-allowed', padding: '6px 16px', fontWeight: 600, fontSize: '0.85rem', borderRadius: '6px', transition: 'all 0.2s' }}
                   >
                      SEND
                   </button>
                 )}
               </div>
            </div>
          </div>
        </form>
      </aside>
    </main>
  );
}
