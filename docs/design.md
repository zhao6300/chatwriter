# 智能文案平台 - 系统设计文档 (System Design Document)

## 1. 架构概览 (Architecture Overview)
本项目采用以 **Next.js (App Router)** 为核心的全栈化架构。代码文件统一存放在 `src` 目录中，便于源码管理与分离。应用的运行、打包等脚本直接存放在根目录的 `package.json` 中，确保开发者能在根目录以最直接的方式启动服务。

- **前端技术栈**：React (Next.js App Router) + Vanilla CSS/CSS Modules
- **后端架构**：Next.js API Routes (Serverless Functions 风格)
- **数据库组件**：Prisma ORM + SQLite (轻量级，支持项目及配置存储)
- **额外生态支持**：基于 Model Context Protocol (MCP) 构建工具注册层

## 2. 目录结构设计 (Directory Structure)
```
/项目根目录
├── docs/                 # 项目相关业务与设计文档
│   ├── prd.md            # 产品需求说明
│   └── design.md         # 架构与系统设计
├── src/                  # 所有前端和后端的源码存放区
│   ├── app/              # Next.js 页面与 API 路由
│   │   ├── api/          # 后端功能 (e.g., chat, mcp, projects)
│   │   ├── editor/       # 编辑器页面组
│   │   ├── settings/     # 偏好配置及 MCP Server 配置页
│   │   └── page.tsx      # 平台首页界面
│   ├── components/       # UI 组件 (例如编辑器视图、对话视图等)
│   ├── lib/              # 辅助工具和库 (如 prisma client 实例化对象)
│   ├── core/             # AI 智能引擎及 MCP 通信核心逻辑
│   │   ├── registry/     # 内置 Tool 注册表
│   │   └── mcp/          # MCP Client 的底层代理封装
│   └── styles/           # CSS Modules 及全局 CSS 设置
├── prisma/               # ORM 模型定义目录
│   └── schema.prisma     # 数据表模型声明
├── package.json          # 根目录执行主入口与依赖图谱
└── next.config.mjs       # Next.js 配置文件
```

## 3. 工具与 Agentic 系统设计 (MCP & Tooling)
为了保障智能创作平台极高的定制和处理能力，后端的执行循环被设计为“高拦截代理”：
- **Tool Registry (内置模块层)**：为大模型提供内置的基础能力（如文件操作草案读写等）。
- **MCP Client (外置扩展层)**：实现一套标准 MCP (Model Context Protocol) 协议访问接口。在 API 路由调用模型时，如果发现用户绑定了外部 MCP 服务器端口，系统则实时合并所有的 Tool schemas，一并提供给大模型执行环境。
- **Function Calling 流式传输**：前端与后端的交互采用 SSE / ReadableStream，以便让前端边栏获得大语言模型推理及调用工具细节（“思考流”），进而提升可解释性（Explainability）。

## 4. UI 侧的逻辑流与美学规划 (Aesthetics & Flows)
- **无感化使用**：无需复杂的引导，用户首屏就通过一个核心输入框直接调度底层生成系统。
- **三栏协同机制**：页面进入编辑态后分为左中右三区。
  - 左：大纲树实时渲染
  - 中：纯文本与基础 MarkDown 区块支撑起编辑器。
  - 右：独立的 AI 指令面板，接受光标位置指令并将生成文本自动打回去。
- **高端质感 (Premium Feel)**：规避单纯或廉价的单一色彩。采用包含玻璃拟物特效（Glassmorphism）、骨架屏渐变过渡和深邃暗色系的质感风格。所有的微小交互（如点按工具按钮、侧边栏唤出）均带缓动动画补偿。

## 5. 存储模型及应用生命周期 (Data Scheme)
利用 `Prisma` 模型定义三大业务实体：
- `Project` / `Document`：树状关联，承载生成出来的文稿资产。
- `UserPreferences`：本地储存用户的绑定 API 密钥。
- `ToolPlugin` (可选)：用于记录外部接入的具体 MCP Client 配置，当应用启动时从 SQLite 反序列化这些配置进行动态挂载。

由于所有的入口皆设于 Next.js App Router 中，开发者只需要在根目录用 `npm run dev` 即可在一套环境中跑通所有前后台逻辑。
