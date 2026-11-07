# 来信 · Laixin

把自己的角色接到微信或 Telegram。来信可以在电脑上本地运行，也可以在 Linux 云服务器上常驻，通过浏览器配置。

## 从这里开始

- [19 页宝宝教程（PDF）](./laixin-guide.pdf)　Windows 从第 2 页开始，Mac / Linux 从第 3 页开始，云服务器从第 4 页开始。
- [下载最新版安装包](https://github.com/Junrzii/laixin-assistant/releases/latest)　展开 **Assets**，选择 `laixin-assistant-vX.Y.Z.zip`。
- 刚开始用？打开配置页，跟着「收第一封来信」走。保存模型配置后可以先点「测试模型」。
- 已经在用来信？教程第 16 页有升级步骤，第 17 页有常见问题。

## 可以做什么

- 导入角色卡或填写人设，配置自己的 OpenAI 兼容模型接口。
- 在微信和 Telegram 私聊收发消息，可选择跨平台续聊和共享长期记忆。
- 在 Telegram 开启主动来信，设置每天上限和安静时段。
- 默认启用北京时间感知，模型会参考发消息的时间和对话间隔。

## 使用条件

本地部署需要 Python 3.11 或更新版本。云服务器常驻需要支持 systemd 的 Linux。Telegram 直连失败时，可以用包内的 `pages-relay-v4.zip` 搭建自己的 Cloudflare Pages 中转，教程第 12 页开始有完整操作。

每位使用者各自部署并配置自己的账号和模型接口。配置页密码、API Key、Bot Token 和中转密钥请妥善保存。角色资料及相关对话会发送给你配置的模型服务商。排错时请遮住密钥与个人聊天。

[第三方组件与来源](./THIRD_PARTY_NOTICES.md)

## 照片识别

在「06 / 聊天体验」打开「让角色识别私聊照片」，点「保存聊天体验」。使用接受 `image_url` 图片输入的 OpenAI Chat Completions 兼容接口和支持看图的模型。先发一张普通照片测试。支持 JPG、PNG、WebP，每张最多 5 MB，同一轮最多读 3 张。Telegram 图片附文也会一起传给模型。

照片识别默认关闭。开启后，来信把当轮照片发给已配置的模型服务。聊天记录只保存文字和「收到照片」标记，照片原文件不保存在聊天记录中。旧照片需要重新发送。请发私聊里的普通照片。

### Telegram（已用真实账号验证 Pages 中转）

直连或 HTTP CONNECT 模式直接测试。使用 Cloudflare Pages 中转时，在原项目的「部署 → 创建部署」选「生产」，上传本包的 `pages-relay-v4.zip`。沿用原项目地址和两个密钥。部署后打开项目地址，看到 `"version":4` 即可。

### 微信（试验功能，真实账号待验证）

加密照片需要 Python 的 `cryptography` 库。已经装好的环境可直接用。电脑本地可在来信使用的 Python 环境安装，例如 `python3 -m pip install --target ./photo-deps cryptography`，Windows 把开头换成 `py -3`。

云服务器在升级后，先用这条命令查看服务使用的 Python：

```bash
systemctl show -p ExecStart --value ovo-weixin-assistant
```

下面用 `python3.11` 为例。若上一步显示其他 Python 路径，把命令开头的 `python3.11` 换成服务实际使用的 Python。

```bash
sudo python3.11 -m pip install --target /opt/ovo-weixin-assistant/photo-deps cryptography
sudo systemctl restart ovo-weixin-assistant
```

在 root 终端可省略 `sudo`。如果对应 Python 没有 pip，需先按系统的方式安装 pip。加密依赖只用于微信照片。若下载失败，后台设备也需能访问微信的 CDN。

[cryptography 安装文档](https://cryptography.io/en/latest/installation/)
