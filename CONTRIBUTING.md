# Contributing to GapGap

感谢你关注 GapGap。这个项目同时提供网页版、Chrome 插件和 Figma 插件，贡献时请尽量保持三端行为一致。

## 开始之前

建议先阅读：

- [README.md](./README.md)：功能、入口、构建和发布说明
- [PRIVACY.md](./PRIVACY.md)：Chrome 插件隐私说明
- [LICENSE](./LICENSE)：开源许可

## 本地开发

网页版可以直接打开 `index.html` 使用。

Chrome 插件本地加载：

1. 打开 Chrome 的 `chrome://extensions/`
2. 开启「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择 `chrome-extension/`

Figma 插件本地加载前，先生成内联 UI：

```bash
node figma-plugin/build-ui.js
```

然后在 Figma 桌面版中选择 `Plugins` -> `Development` -> `Import plugin from manifest...`，加载 `figma-plugin/manifest.json`。

## 修改校对规则

校对规则会影响三端体验。修改规则后请运行：

```bash
node scripts/verify-format-consistency.js
```

如果修改了 Chrome 插件或 Figma 插件，也建议手动验证对应端的主要流程。

## 提交 Pull Request

提交 PR 时，请尽量说明：

- 改了什么
- 为什么需要改
- 如何验证
- 是否影响网页版、Chrome 插件或 Figma 插件

如果是发布 Chrome 插件的新包，请确保 `manifest.json` 的版本号高于 Chrome Web Store 已发布版本。

## 问题反馈

反馈问题时，建议附上：

- 使用平台：网页版、Chrome 插件或 Figma 插件
- 输入文本示例
- 当前输出
- 期望输出
- 浏览器或 Figma 版本，如果和问题有关
