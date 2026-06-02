# GapGap Illustrator CEP 插件

这是面向 Illustrator 2020 到 2026 的兼容插件。它使用 CEP 面板和 ExtendScript，不依赖网络服务。

## 兼容范围

- Illustrator 2020 对应 host version `24.0`
- Illustrator 2026 对应较新的 CEP/CSXS 运行时，安装脚本会同时开启 CSXS 9 到 13 的未签名扩展调试
- `CSXS/manifest.xml` 当前配置为 `ILST [24.0,99.9]`
- 如果只想限制到 Illustrator 2020，可以把 host version 改为 `[24.0,24.9]`

## macOS 一键安装

1. 解压 `gapgap-illustrator-cep-macos.zip`。
2. 双击 `install-macos.command`。
3. 如果 macOS 提示无法打开，右键点击文件，选择「打开」。
4. 重启 Illustrator。
5. 在 `Window` -> `Extensions` -> `GapGap` 打开面板。

卸载时双击 `uninstall-macos.command`。

## 手动安装测试

1. 把 `illustrator-cep-plugin/` 复制或链接到 CEP 扩展目录：
   - macOS: `~/Library/Application Support/Adobe/CEP/extensions/com.gapgap.illustrator.cep`
   - Windows: `%APPDATA%\Adobe\CEP\extensions\com.gapgap.illustrator.cep`
2. 开启未签名扩展调试：
   - macOS: `defaults write com.adobe.CSXS.12 PlayerDebugMode 1`
   - Windows: 在注册表 `HKEY_CURRENT_USER/Software/Adobe/CSXS.9` 新建字符串 `PlayerDebugMode=1`
3. 重启 Illustrator 2020。
4. 在 `Window` -> `Extensions` -> `GapGap` 打开面板。

## 使用方式

1. 选择一个 Illustrator 文本对象。
2. 点击读取按钮。
3. 检查校对结果。
4. 点击写回按钮更新所选文本对象，或点击复制按钮复制结果。

## 发布说明

正式分发给用户时建议打包为 ZXP 并签名。开发测试可以直接使用未签名 CEP 扩展。

给设计师朋友临时分发时，可以直接压缩整个 `illustrator-cep-plugin/` 目录。macOS 用户解压后运行 `install-macos.command` 即可。
