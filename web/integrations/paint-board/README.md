# 手绘画板集成

主应用路由为 `/hand-drawing`，独立画板入口为 `/paint-board/index.html`。
画板使用自己的 React 18、Tailwind 3、Zustand 4 和 pnpm 8，不向主应用添加运行时依赖。

## 源码与边界

- 上游：[LHRUN/paint-board](https://github.com/LHRUN/paint-board)
- 固定提交：`97b53345ed0234c8d34eefa51941831c65606553`（3.1.0）
- `vendor/` 是该提交的 `src/`、`public/` 和根目录文件快照，保留原有 MIT `LICENSE`。源文件已经按 Git blob SHA-1 校验；上游 `.github/`、`.husky/`、多语言 README 目录及构建缓存不参与集成。
- `adapter/` 负责嵌入启动、资产操作、主题、语言和 IndexedDB 适配。`bridge.ts` 是两边唯一共享的消息协议；不导入两边的 React 或 store。
- 未修改上游源码，不需要维护补丁。嵌入入口不执行上游 `main.tsx`，因此不加载演示站统计；独立 Vite 配置不启用上游 PWA 插件。
- 模板弹窗入口映射至 `adapter/template-prompt-modal.tsx`，保留上游模板选择与创建流程，标题使用“手绘画板”及产品说明，不显示上游仓库推广。升级上游时同步核对此适配组件。
- Vite 仅将上游 `@/components/toolPanel` 根入口替换为 `adapter/tool-panel.tsx`：左侧保留选择、绘画、橡皮擦、文字和平移，详细设置默认收起至右下角。设置内容直接复用上游子组件；平移使用 Fabric 视口并保存至当前本地工程，不添加画作对象或撤销记录。
- `@/components/helpArea` 根入口直接映射至上游帮助弹窗，移除左下角入口组；帮助、重置缩放和摄像头集中在设置面板底部。摄像头沿用上游组件，面板收起时保持挂载，保留其倒计时等状态。
- 左下角缩放滑条使用上游 30%–500% 范围和缩放持久化逻辑，以画布中心缩放；百分比从实际视口同步，点击百分比恢复 100%。移动端滑条置于底部操作栏上方。
- 不共享登录凭据。下载、上传和资产落库由父页面通过项目现有接口完成；画板只接收或返回图片 Blob。

## 开发、构建与部署

在 `web/` 中照常执行 `pnpm dev` 或 `pnpm build`。`prepare.mjs` 会使用固定 `pnpm@8.15.9` 安装本目录的锁定依赖，然后生成 `web/public/paint-board/`。
依赖和源码使用内容哈希缓存；内容未变化时不重复安装或构建。所有源码随仓库提供，构建不访问 GitHub，也不依赖演示站。
首次安装需要 npm 仓库可用，本目录默认沿用项目的 npmmirror 镜像；可通过 npm/pnpm 的 registry 配置覆盖。

画板产物不提交。现有 Docker 构建调用同一主构建命令，并将 `public/` 复制进运行镜像，无需新服务、端口或后端配置。
`.dockerignore` 排除本地画板依赖缓存和生成目录，镜像内按源码重新构建。

主应用仅在导航注册、双语资源注册、该路由的外壳显示、构建脚本和入口响应头处接入。
`/paint-board/index.html` 允许同源嵌入；其他页面继续使用 `DENY` 和 `frame-ancestors 'none'`。

## 数据与通信

- `init` 在动态加载画板及其 store **之前**传入用户和团队作用域，防止在默认空间恢复工程。
- 工程、背景图片和缩略图使用 `localforage` 的独立 IndexedDB 库，并以 `[userId, teamId]` 为键前缀隔离。
- 简单画笔设置继续沿用上游偏好存储；主应用主题和语言为显示状态的来源，不改变画作的颜色和背景。
- 透明绘图区和工程缩略图使用独立的浅灰棋盘底衬，深色界面下也能辨认黑色笔迹。底衬只参与 CSS 预览，不写入工程或 PNG；实际背景仍由画板设置决定。
- 消息校验 `origin`、`source`、协议及操作类型。请求按唯一 ID 关联，超时或页面卸载会拒绝等待中的请求。
- 资产插入使用图片实际内容，避免签名地址过期和 Canvas 跨域污染；复用上游的尺寸和历史逻辑。
- 保存资产使用当前画布可视范围，合成画布设置的背景并导出 PNG；不压缩上传，等待资产落库后才发布列表更新和成功提示。
- 离开页面前刷新当前工程并等待本地保存。页面隐藏或关闭时额外尝试刷新；浏览器强制终止、清理站点数据仍可能删除本地工程，可使用上游工程导出保留文件。
- 云端资产只保存 PNG，不包含可继续编辑的工程，不提供多人协作或工程云同步。摄像头仍遵循主应用既有权限策略。

## AI 美化

- 导出菜单通过 Vite 的 `./exportImageMenu` 入口映射至 `adapter/export-image-menu.tsx`，在保存旁增加 AI 美化；上游源码保持不变。
- 父页面导出当前涂鸦后，提供前后对照、渠道模型、风格、清晰度和选填描述。仅显示已有渠道中启用 `image-to-image` 能力的图片模型；透明区域只在发送给 AI 的参考图中补白，不修改原画。
- 复用主应用上传、图生图任务、风格库、积分估算及取消退款策略，任务来源沿用 `canvas`。不新增后端接口、配置或密钥传递；用户和团队切换后丢弃旧结果。
- 结果可重新生成、下载、保存为图片资产或插回画板（支持撤销）。保存等待服务器成功后才更新资产列表；失败保留结果和名称以便重试。

## 验证

先在 `web/` 运行 `node integrations/paint-board/prepare.mjs`，再执行：

```sh
# 主应用类型检查与集成测试
pnpm exec tsc --noEmit
pnpm test:node integrations/paint-board/bridge.test.ts integrations/paint-board/storage.test.ts 'src/app/(user)/hand-drawing/drawing-asset.test.ts' 'src/app/(user)/hand-drawing/drawing-beautify.test.ts'

# 在本目录使用独立依赖验证类型和上游测试
cd integrations/paint-board
node node_modules/typescript/bin/tsc --noEmit
node node_modules/vitest/vitest.mjs run --config vitest.config.ts
```

浏览器检查第三项导航、深浅及紫色主题、移动导航、绘画/撤销/图层、刷新恢复、图片插入、PNG 保存，以及失败重试和用户/团队隔离。

## 同步 master 与升级上游

同步主项目 `master` 时，保留本目录、手绘页面目录和上述少量接入点；不将画板依赖并入主应用的 lockfile，不调整其他创作功能。
升级 paint-board 应单独进行：替换固定源码快照，记录新提交，核对独立依赖与锁文件，再检查适配层调用的图片插入、导出、文件存储及就绪钩子。
随后运行独立类型检查、上游测试、集成测试、主应用生产构建及浏览器回归。升级源码不会自动跟随上游分支。
