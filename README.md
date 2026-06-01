# GapGap - 中英文校对工作台

一个开源的中英文混排校对工具，帮助你自动修正中文、英文、数字之间的空格和常见标点问题。

GapGap 是开源项目，代码以 MIT License 发布。你可以自由使用、学习、修改和分发，但请保留许可证说明。

## 使用入口

- 网页版：[https://acesiare.com/GapGap/](https://acesiare.com/GapGap/)
- Chrome 插件：[Chrome Web Store](https://chromewebstore.google.com/detail/gapgap/afjdbcnppfkdmclagohgifckkbelgepl?authuser=0&hl=zh-CN)
- Figma 插件：待补充

## 功能特性

### 空格规则
- **中英文之间自动添加空格** - 如 `在LeanCloud上` → `在 LeanCloud 上`
- **中英文/数字边界多余空格压缩** - 如 `在   LeanCloud   上` → `在 LeanCloud 上`
- **中文与数字之间自动添加空格** - 如 `花了5000元` → `花了 5000 元`
- **数字与单位之间不添加空格** - 如 `10Gbps`、`10TB` 保持原样
- **百分号/度数后跟中文添加空格** - 如 `15%的` → `15% 的`
- **加号作为连接符/运算符时两侧添加空格** - 如 `USB+Fast` → `USB + Fast`
- **全角标点与其他字符之间不加空格**

### 标点符号修正
- **中文语境自动转换全角标点** - 如 `你好,世界!` → `你好，世界！`
- **全角数字自动转换半角** - 如 `１２３` → `123`
- **重复标点符号警告提示** - 如 `太棒了！！！` 会高亮警告

### 其他功能
- 实时预览校对结果
- 高亮显示修改位置（可切换显示/隐藏）
- 一键复制校对后的文本
- 历史记录功能（最多保存 8 条）
- 多种 Material Design 3 主题（随机切换）
- 响应式设计，支持移动端

## 三个平台说明

### 网页版

网页版适合直接打开使用，不需要安装。输入或粘贴文本后，右侧会实时显示校对结果，并支持高亮修改、一键复制和历史记录。

访问地址：[https://acesiare.com/GapGap/](https://acesiare.com/GapGap/)

本地预览也可以直接打开 `index.html`。

本地使用：

1. 直接打开 `index.html` 文件
2. 在左侧「原文」区域输入或粘贴文本
3. 右侧「校对」区域会实时显示处理结果
4. 点击「复制」按钮复制校对后的文本

### Chrome 插件

Chrome 插件适合在浏览网页时快速校对。插件支持网页划词后呼出 GapGap 浮窗，也可以通过浏览器工具栏打开 Chrome 原生侧边栏进行校对。

发布地址：[Chrome Web Store](https://chromewebstore.google.com/detail/gapgap/afjdbcnppfkdmclagohgifckkbelgepl?authuser=0&hl=zh-CN)

插件源码位于 `chrome-extension/`，使用 Chrome Manifest V3。当前插件版本号写在 `chrome-extension/manifest.json` 和 `dist/gapgap-extension/manifest.json` 中，上传 Chrome Web Store 前必须递增，例如从 `0.1.1` 升到 `0.1.2`。

### Figma 插件

Figma 插件适合在设计文件中校对文本图层。它会读取当前选中的文本图层，生成校对结果，并支持复制或写回选中的文本图层。

发布地址：待补充

插件源码位于 `figma-plugin/`，复用了 GapGap 的中英文混排校对规则，并改为使用 Figma Plugin API。

## 构建与打包

本项目不依赖后端服务，网页版、Chrome 插件和 Figma 插件都可以在本地直接运行或打包。

### 网页版发布

网页版入口文件为：

```bash
index.html
```

当前线上地址为 [https://acesiare.com/GapGap/](https://acesiare.com/GapGap/)。发布时通常只需要上传 `index.html` 和 `favicon.png`。

### Chrome 插件打包

Chrome Web Store 上传文件为：

```bash
dist/gapgap-extension.zip
```

重新打包前，先确认 `chrome-extension/manifest.json` 和 `dist/gapgap-extension/manifest.json` 的 `version` 已经高于线上已发布版本。然后执行：

```bash
rm -f dist/gapgap-extension.zip
cd dist/gapgap-extension
zip -r -X ../gapgap-extension.zip .
cd ../..
unzip -t dist/gapgap-extension.zip
```

本地加载测试：

1. 打开 Chrome 的 `chrome://extensions/`
2. 开启右上角「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择本项目中的 `chrome-extension/` 目录

Chrome Web Store 审核可能需要一些时间。上传失败时，优先检查 `manifest.json` 版本号、压缩包根目录结构和权限声明。

### Figma 插件构建

Figma 插件加载前需要生成内联 UI 文件：

```bash
node figma-plugin/build-ui.js
```

生成文件：

```bash
figma-plugin/ui.bundle.html
```

本地加载测试：

1. 打开 Figma 桌面版
2. 进入 `Plugins` → `Development` → `Import plugin from manifest...`
3. 选择 `figma-plugin/manifest.json`

### 规则一致性检查

三端共用同一套校对规则。修改规则后运行：

```bash
node scripts/verify-format-consistency.js
```

该脚本会比对网页版、Chrome 插件和 Figma 插件的格式化输出是否一致。

## 发布检查清单

发布前建议按顺序检查：

1. 修改 `chrome-extension/manifest.json` 和 `dist/gapgap-extension/manifest.json` 的版本号，确保高于 Chrome Web Store 线上版本
2. 如果改了 Figma 插件 UI，运行 `node figma-plugin/build-ui.js`
3. 运行 `node scripts/verify-format-consistency.js`
4. 重新生成 `dist/gapgap-extension.zip`
5. 用 `unzip -t dist/gapgap-extension.zip` 检查压缩包
6. 本地打开网页版或插件确认主要流程可用

## 开发调试

### Chrome 插件 UI 调试

直接打开 `chrome-extension/dev.html` 可以预览网页注入后的气泡和面板。右侧控制区支持实时调整面板宽度、高度、历史栏宽度和边距，并生成对应的 CSS 变量值，方便同步回 `content.css`。

## 项目结构

```text
.
├── index.html                 # 网页版
├── favicon.png                # 网页版图标
├── chrome-extension/          # Chrome 插件源码
├── figma-plugin/              # Figma 插件源码
├── dist/gapgap-extension/     # Chrome 插件发布目录
├── dist/gapgap-extension.zip  # Chrome Web Store 上传包
├── scripts/                   # 检查脚本
├── PRIVACY.md                 # 隐私说明
├── CONTRIBUTING.md            # 贡献指南
└── LICENSE                    # 开源许可证
```

## 隐私说明

GapGap 的校对逻辑在本地运行。网页版使用浏览器本地能力处理文本；Chrome 插件不会把你选中或输入的文本上传到外部服务器。插件的详细隐私说明见 [PRIVACY.md](./PRIVACY.md)。

## 参与贡献

欢迎提交 Issue 或 Pull Request。修改校对规则时，请同步检查网页版、Chrome 插件和 Figma 插件，避免三端行为不一致。更多说明见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## 技术栈

- 纯前端实现（HTML + CSS + JavaScript）
- Material Design 3 设计规范
- 本地存储（localStorage）保存历史记录

## 参考规范

本工具遵循 [中文文案排版指北](https://github.com/sparanoid/chinese-copywriting-guidelines) 规范。

## License

[MIT](./LICENSE)
