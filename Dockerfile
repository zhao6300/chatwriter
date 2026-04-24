FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 为了更好的 Docker 缓存构建机制，先拷贝根级别的 package.json
COPY package.json ./

# 拷贝子模块目录及其声明文件
COPY src/client/package.json ./src/client/
COPY src/server/package.json ./src/server/

# 同步安装全局所有依赖组件
RUN npm run install:all

# 拷贝全量源代码
COPY . .

# 执行 Prisma DB 生成
RUN cd src/server && npx prisma generate

# 暴露给宿主机的端口（客户端 Vite 5173 / 服务端 Express 3000）
EXPOSE 3000
EXPOSE 5173

# 启动项目的单体并发开发环境 (Monolithic Hot-Reload)
CMD ["npm", "run", "dev"]
