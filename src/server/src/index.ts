import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';

const app = express();
const port = process.env.API_PORT || 3000;
const host = process.env.API_HOST || '0.0.0.0';
const prisma = new PrismaClient();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, name);
  }
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } }); // 20MB max

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

// ============================================
// File Upload Endpoint
// ============================================
app.post('/api/upload', upload.array('files', 10), (req, res) => {
  const files = (req.files as Express.Multer.File[]) || [];
  const results = files.map(f => ({
    name: f.originalname,
    url: `/uploads/${f.filename}`,
    size: f.size,
    type: f.mimetype
  }));
  res.json({ success: true, files: results });
});

// ============================================
// AI Model Management Endpoints (CRUD)
// ============================================
app.get('/api/admin/models', async (req, res) => {
    try {
        const models = await prisma.aIModel.findMany();
        res.json({ success: true, models });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Database fetch failed' });
    }
});

app.post('/api/admin/models', async (req, res) => {
    try {
        const { name, modelId, url, sk, temperature, maxTokens, topP } = req.body;
        const newModel = await prisma.aIModel.create({
            data: { 
                name, 
                modelId: modelId || name,
                baseUrl: url, 
                apiKey: sk,
                temperature: temperature !== undefined ? parseFloat(temperature) : 0.7,
                maxTokens: maxTokens !== undefined ? parseInt(maxTokens) : 2048,
                topP: topP !== undefined ? parseFloat(topP) : 1.0
            }
        });
        res.json({ success: true, model: newModel });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Database insert failed' });
    }
});

app.put('/api/admin/models', async (req, res) => {
    try {
        const { id, name, modelId, url, sk, temperature, maxTokens, topP } = req.body;
        const data: any = {};
        if (name !== undefined) data.name = name;
        if (modelId !== undefined) data.modelId = modelId;
        if (url !== undefined) data.baseUrl = url;
        if (sk !== undefined && sk !== '') data.apiKey = sk;
        if (temperature !== undefined) data.temperature = parseFloat(temperature);
        if (maxTokens !== undefined) data.maxTokens = parseInt(maxTokens);
        if (topP !== undefined) data.topP = parseFloat(topP);
        
        const updated = await prisma.aIModel.update({ where: { id }, data });
        res.json({ success: true, model: updated });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Database update failed' });
    }
});

app.delete('/api/admin/models', async (req, res) => {
    try {
        const { id } = req.body;
        await prisma.aIModel.delete({ where: { id } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Database delete failed' });
    }
});

// ============================================
// User Profile Endpoints
// ============================================
app.get('/api/user/profile', async (req, res) => {
    try {
        const account = req.query.account as string;
        if (!account) return res.status(400).json({ success: false, error: 'Account is required' });

        // Upsert user to ensure the mock user exists in DB
        const user = await prisma.user.upsert({
            where: { account },
            update: {},
            create: {
                account,
                password: 'mock_password', // default for mocked auth
                role: 'USER',
                displayName: account
            }
        });

        // Strip password
        const { password, ...safeUser } = user;
        res.json({ success: true, user: safeUser });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Failed to fetch user profile' });
    }
});

app.put('/api/user/profile', async (req, res) => {
    try {
        const { account, displayName, avatar } = req.body;
        if (!account) return res.status(400).json({ success: false, error: 'Account is required' });

        const user = await prisma.user.update({
            where: { account },
            data: { displayName, avatar }
        });

        const { password, ...safeUser } = user;
        res.json({ success: true, user: safeUser });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Failed to update user profile' });
    }
});

// ============================================
// Project Management Endpoints
// ============================================
app.get('/api/projects', async (req, res) => {
    try {
        const userId = req.query.userId as string | undefined;
        const where = userId ? { userId } : {};
        const projects = await prisma.project.findMany({ where, orderBy: { updatedAt: 'desc' } });
        res.json({ success: true, projects });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch projects' });
    }
});

app.get('/api/projects/:id', async (req, res) => {
    try {
        const project = await prisma.project.findUnique({ where: { id: req.params.id } });
        if (!project) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }
        res.json({ success: true, project });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch project' });
    }
});

app.post('/api/projects', async (req, res) => {
    try {
        const { title, content, userId } = req.body;
        const project = await prisma.project.create({
            data: { title, content: content || '', userId: userId || 'default' }
        });
        res.json({ success: true, project });
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Failed to create project' });
    }
});

app.put('/api/projects/:id', async (req, res) => {
    try {
        const { title, content } = req.body;
        const data: any = {};
        if (title !== undefined) data.title = title;
        if (content !== undefined) data.content = content;
        const project = await prisma.project.update({ where: { id: req.params.id }, data });
        res.json({ success: true, project });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to update project' });
    }
});

app.delete('/api/projects/:id', async (req, res) => {
    try {
        await prisma.project.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to delete project' });
    }
});

// ============================================
// MCP Tool Plugins Management Endpoints
// ============================================
app.get('/api/tools', async (req, res) => {
    try {
        const tools = await prisma.mCPToolPlugin.findMany({ orderBy: { serverName: 'asc' } });
        res.json({ success: true, tools });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/tools', async (req, res) => {
    try {
        const { serverName, command, args, enabled } = req.body;
        const tool = await prisma.mCPToolPlugin.create({
            data: { serverName, command, args, enabled: enabled ?? true }
        });
        res.json({ success: true, tool });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.put('/api/tools/:id', async (req, res) => {
    try {
        const { serverName, command, args, enabled } = req.body;
        const data: any = {};
        if (serverName !== undefined) data.serverName = serverName;
        if (command !== undefined) data.command = command;
        if (args !== undefined) data.args = args;
        if (enabled !== undefined) data.enabled = enabled;
        
        const tool = await prisma.mCPToolPlugin.update({ where: { id: req.params.id }, data });
        res.json({ success: true, tool });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.delete('/api/tools/:id', async (req, res) => {
    try {
        await prisma.mCPToolPlugin.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ============================================
// Vector DB Global Config (Admin)
// ============================================

app.get('/api/admin/system_config', async (req, res) => {
    try {
        let config = await prisma.systemGlobalConfig.findUnique({ where: { id: 'global-config-1' } });
        if (!config) {
            config = await prisma.systemGlobalConfig.create({ data: { id: 'global-config-1' } });
        }
        res.json({ success: true, config });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/admin/system_config', async (req, res) => {
    try {
        const data = req.body;
        const config = await prisma.systemGlobalConfig.upsert({
            where: { id: 'global-config-1' },
            create: { id: 'global-config-1', ...data },
            update: data
        });
        res.json({ success: true, config });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ============================================
// System Admin Details Endpoints
// ============================================
app.get('/api/admin/users', async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: { id: true, account: true, displayName: true, role: true, createdAt: true },
            orderBy: { createdAt: 'desc' }
        });
        
        // Count projects and knowledge bases per user based on account string
        const usersWithCounts = await Promise.all(users.map(async (user) => {
            const projectCount = await prisma.project.count({
                where: { userId: user.account }
            });
            const kbCount = await prisma.knowledgeBase.count({
                where: { userId: user.account }
            });
            return { ...user, projectCount, kbCount };
        }));

        res.json({ success: true, users: usersWithCounts });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch users' });
    }
});

app.get('/api/admin/system_stats', async (req, res) => {
    try {
        const userCount = await prisma.user.count();
        const projectCount = await prisma.project.count();
        const modelCount = await prisma.aIModel.count();
        const enabledModelCount = await prisma.aIModel.count({ where: { isEnabled: true } });
        res.json({ success: true, stats: { userCount, projectCount, modelCount, enabledModelCount } });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch system stats' });
    }
});

// ============================================
// AI Generation - Streaming SSE Endpoint
// ============================================
app.post('/api/chat/stream', async (req, res) => {
    try {
        const { messages, selectedModelId } = req.body;
        const queryMsg = messages[messages.length - 1].content;
        console.log("-> [Stream] 收到请求:", queryMsg, "模型:", selectedModelId);

        const targetModel = await prisma.aIModel.findUnique({ where: { id: selectedModelId } });

        if (!targetModel) {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.write(`data: ${JSON.stringify({ content: '【系统提示】尚未配置该模型，请先在管理控制台挂载模型。', done: false })}\n\n`);
            res.write(`data: ${JSON.stringify({ content: '', done: true })}\n\n`);
            res.end();
            return;
        }

        // Request streaming from OpenAI-compatible endpoint
        const response = await fetch(`${targetModel.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${targetModel.apiKey}`
            },
            body: JSON.stringify({
                model: targetModel.modelId || targetModel.name,
                messages: messages,
                temperature: targetModel.temperature ?? 0.7,
                max_tokens: targetModel.maxTokens ?? 2048,
                top_p: targetModel.topP ?? 1.0,
                stream: true
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error("Upstream error:", errText);
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.write(`data: ${JSON.stringify({ content: `模型返回异常 (${response.status}): ${errText.substring(0, 200)}`, done: false })}\n\n`);
            res.write(`data: ${JSON.stringify({ content: '', done: true })}\n\n`);
            res.end();
            return;
        }

        // Set up SSE
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
            res.write(`data: ${JSON.stringify({ content: '无法读取模型响应流', done: true })}\n\n`);
            res.end();
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
                const payload = trimmed.slice(6);
                if (payload === '[DONE]') {
                    res.write(`data: ${JSON.stringify({ content: '', done: true })}\n\n`);
                    continue;
                }
                try {
                    const parsed = JSON.parse(payload);
                    const delta = parsed.choices?.[0]?.delta?.content || '';
                    if (delta) {
                        res.write(`data: ${JSON.stringify({ content: delta, done: false })}\n\n`);
                    }
                } catch (e) {
                    // skip malformed JSON chunks
                }
            }
        }

        // Ensure done signal is sent
        res.write(`data: ${JSON.stringify({ content: '', done: true })}\n\n`);
        res.end();

    } catch (error: any) {
        console.error("Stream error:", error);
        // If headers not sent yet, try to send SSE error
        if (!res.headersSent) {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
        }
        res.write(`data: ${JSON.stringify({ content: '服务端流式调用出现内部错误。', done: true })}\n\n`);
        res.end();
    }
});

// Legacy non-stream endpoint (kept for compatibility)
app.post('/api/chat', async (req, res) => {
    try {
        const { messages, selectedModelId } = req.body;
        const targetModel = await prisma.aIModel.findUnique({ where: { id: selectedModelId } });
        if (!targetModel) {
            return res.json({ status: "success", message: "【系统提示】尚未配置该模型。" });
        }
        const response = await fetch(`${targetModel.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${targetModel.apiKey}`
            },
            body: JSON.stringify({
                model: targetModel.modelId || targetModel.name,
                messages,
                temperature: targetModel.temperature ?? 0.7,
                max_tokens: targetModel.maxTokens ?? 2048,
                top_p: targetModel.topP ?? 1.0
            })
        });
        if (!response.ok) {
            return res.json({ status: "success", message: `模型返回异常 (${response.status})` });
        }
        const completion = await response.json();
        const content = completion.choices?.[0]?.message?.content || "模型返回空内容";
        res.json({ status: "success", message: content });
    } catch (error: any) {
        console.error(error);
        res.json({ status: "success", message: '服务端调用外部模型接口时出现错误。' });
    }
});

// ============================================
// Knowledge Base & RAG Endpoints
// ============================================

// Get user Knowledge Bases
app.get('/api/knowledge', async (req, res) => {
    try {
        const userId = req.query.userId as string;
        if (!userId) return res.status(400).json({ success: false, error: 'User ID is required' });
        
        const knowledgeBases = await prisma.knowledgeBase.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            include: { _count: { select: { documents: true } } }
        });
        res.json({ success: true, knowledgeBases });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Create Knowledge Base
app.post('/api/knowledge', async (req, res) => {
    try {
        const { name, description, userId, isPublic } = req.body;
        if (!name || !userId) return res.status(400).json({ success: false, error: 'Name and userId are required' });
        
        const kb = await prisma.knowledgeBase.create({
            data: { name, description, userId, isPublic: isPublic || false }
        });
        res.json({ success: true, kb });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Delete Knowledge Base
app.delete('/api/knowledge/:id', async (req, res) => {
    try {
        await prisma.knowledgeBase.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get Documents inside a Knowledge Base
app.get('/api/knowledge/:id/documents', async (req, res) => {
    try {
        const documents = await prisma.knowledgeDocument.findMany({
            where: { kbId: req.params.id },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, documents });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Upload Document to Knowledge Base (Simulated RAG Ingestion)
app.post('/api/knowledge/:id/documents', async (req, res) => {
    try {
        const { name, content } = req.body;
        const kbId = req.params.id;
        
        // Setup initial state
        const doc = await prisma.knowledgeDocument.create({
            data: { kbId, name, content, status: 'PROCESSING', chunkCount: 0 }
        });
        
        // Mock async background processing (chunking + embedding logic would go here)
        setTimeout(async () => {
             // Fake 10-chunk generation
             await prisma.knowledgeDocument.update({
                 where: { id: doc.id },
                 data: { status: 'DONE', chunkCount: Math.floor(Math.random() * 20) + 1 }
             });
        }, 3000);
        
        res.json({ success: true, doc });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.listen(Number(port), host, () => {
    console.log(`✅ [Server] 流式 OpenAI 标准转发后舱已全量启动于 http://${host}:${port}`);
});
