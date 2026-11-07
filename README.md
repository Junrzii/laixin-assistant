# 来信 · Laixin

把自己的角色接到微信或 Telegram。来信可以在电脑上本地运行，也可以在 Linux 云服务器上常驻，通过浏览器配置。

## 从这里开始

- [18 页宝宝教程（PDF）](./laixin-guide.pdf)　Windows 从第 2 页开始，Mac / Linux 从第 3 页开始，云服务器从第 4 页开始。
- [下载最新版安装包](https://github.com/Junrzii/laixin-assistant/releases/latest)　展开 **Assets**，选择名为 `laixin-assistant-vX.Y.Z.zip` 的安装包。
- 已经在用来信？教程第 16 页有升级步骤，第 17 页有常见问题。

## 可以做什么

- 导入角色卡或填写人设，配置自己的 OpenAI 兼容模型接口。
- 在微信和 Telegram 私聊收发消息，可选择跨平台续聊和共享长期记忆。
- 在 Telegram 开启主动来信，设置每天上限和安静时段。
- v0.2.2 默认启用北京时间感知，模型会参考发消息的时间和对话间隔。

## 使用条件

本地部署需要 Python 3.11 或更新版本。云服务器常驻需要支持 systemd 的 Linux。Telegram 直连失败时，可以用包内的 `pages-relay-v3.zip` 搭建自己的 Cloudflare Pages 中转，教程第 12 页开始有完整操作。

每位使用者各自部署并配置自己的账号和模型接口。配置页密码、API Key、Bot Token 和中转密钥请妥善保存。角色资料及相关对话会发送给你配置的模型服务商。排错时请遮住密钥与个人聊天。

[第三方组件与来源](./THIRD_PARTY_NOTICES.md)
