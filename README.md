# AI Note

桌面会议 / 视频记录客户端 MVP。

## 功能

- 监听电脑音频输出并实时转写
- 按时间分片上传到语音识别模型
- 接入 OpenAI 兼容接口，支持第三方模型平台
- 基于转写内容生成会议纪要
- 使用桌面端原生保存对话框导出 Markdown

## 启动桌面版

先安装依赖：

```bash
npm install
```

启动桌面客户端：

```bash
npm run dev
```

## Web 回退模式

如果你想临时继续用浏览器版，也可以运行：

```bash
npm run start:web
```

然后访问：

```text
http://127.0.0.1:3210
```

## 接入模型

默认按 OpenAI 兼容协议调用：

- 实时转写：`POST {baseUrl}/audio/transcriptions`
- 纪要整理：`POST {baseUrl}/chat/completions`

常见可接入方式：

- OpenAI 官方
- 提供 OpenAI 兼容层的云厂商或模型平台
- 自建兼容网关

## 注意

- 桌面版启动收听时，会要求你选择屏幕或窗口，并勾选共享系统音频。
- 某些平台只兼容 `chat/completions`，不兼容 `audio/transcriptions`。这种情况下，建议把转写服务和纪要服务拆成两套 provider。
- 当前实现优先复用 Chromium / Electron 的屏幕与系统音频采集能力，适合先做 MVP 验证。
