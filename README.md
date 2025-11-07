# 足下教育平台自动打卡脚本

这是一个基于Cloudflare Workers的足下教育平台自动登录打卡脚本，支持自动获取Access Token并执行多种打卡操作。

## 功能特点

- ✅ 自动登录足下教育平台获取Access Token
- ✅ 支持多种打卡类型：首页签到、运动打卡、日精进打卡
- ✅ 支持定时自动打卡（每日定时执行）
- ✅ 安全的路径验证机制，只有知道正确用户名路径才能访问
- ✅ 伪装的nginx 404页面，防止未授权访问
- ✅ 美观的Web界面，支持一键复制Access Token
- ✅ 完整的打卡结果显示和错误处理

## 部署方法

### 1. 准备工作

1. 注册[Cloudflare账号](https://www.cloudflare.com/)
2. 安装Node.js和npm
3. 安装Wrangler CLI：
   ```bash
   npm install -g wrangler
   ```

### 2. 克隆项目

```bash
git clone <your-repo-url>
cd "ZK-auto clock-in"
```

### 3. 安装依赖

```bash
npm install
```

### 4. 配置环境变量

复制`.dev.vars`文件并修改以下环境变量：

| 环境变量 | 必需 | 默认值 | 说明 |
|---------|------|--------|------|
| ZU_XIA_USERNAME | 是 | 无 | 足下平台的用户名 |
| ZU_XIA_PASSWORD | 是 | 无 | 足下平台的密码 |
| SPORTS_COMMENT | 否 | "特色" | 运动打卡的评论内容 |
| DAILY_COMMENT | 否 | "今日学习内容总结，收获满满！" | 日精进打卡的评论内容 |
| ENABLE_LOGGING | 否 | "true" | 是否启用日志输出（true/false） |

示例配置：
```ini
# 足下平台账号信息
ZU_XIA_USERNAME=你的账号
ZU_XIA_PASSWORD=你的密码

# 打卡内容（可选）
SPORTS_COMMENT=特色
DAILY_COMMENT=今日学习内容总结，收获满满！

# 日志控制（可选）
ENABLE_LOGGING=true
```

### 5. 登录Cloudflare

```bash
wrangler login
```

### 6. 部署到Cloudflare Workers

```bash
npx wrangler deploy
```

部署成功后，您将获得一个类似 `https://zuxia-login.你的账户ID.workers.dev` 的URL。

## 使用方法

### 1. 访问应用

访问URL时，必须在URL后面添加正确的用户名路径：

```
https://zuxia-login.你的账户ID.workers.dev/你的账号
```

例如：
```
https://zuxia-login.13888984805.workers.dev/530XXXXXX
```

### 2. 获取Access Token

访问正确路径后，页面会显示您的Access Token，您可以点击"复制 Access Token"按钮复制它。

### 3. 执行打卡

点击页面上的打卡按钮执行相应的打卡操作：
- 全部打卡：一次性执行所有类型的打卡
- 首页签到：仅执行首页签到
- 运动打卡：仅执行运动打卡
- 日精进打卡：仅执行日精进打卡

### 4. 定时打卡

系统已配置为每天北京时间上午9点自动执行打卡，无需手动操作。

## 安全机制

### 1. 路径验证

- 只有在URL中包含正确的用户名路径才能访问应用
- 访问根路径或错误路径会显示nginx伪装的404页面
- 这种机制可以有效防止未授权访问和爬虫探测

### 2. 环境变量保护

- 敏感信息（如用户名和密码）存储在环境变量中
- 在日志输出中会自动隐藏敏感信息

## 开发和测试

### 本地开发

1. 启动本地开发服务器：
   ```bash
   npx wrangler dev --port 8788
   ```

2. 访问本地服务器：
   ```
   http://127.0.0.1:8788/你的账号
   ```

### 查看日志

1. 查看部署后的日志：
   ```bash
   npx wrangler tail
   ```

2. 本地开发时的日志会直接显示在控制台中

## 故障排除

### 1. 访问应用时显示nginx页面

- 检查URL是否包含正确的用户名路径
- 确认环境变量中的用户名设置正确

### 2. 登录失败

- 检查用户名和密码是否正确
- 确认足下平台账号状态正常

### 3. 打卡失败

- 查看日志获取详细错误信息
- 确认Access Token是否有效
- 检查打卡内容是否符合平台要求

## 技术架构

- **运行环境**：Cloudflare Workers
- **开发语言**：JavaScript
- **部署工具**：Wrangler CLI
- **安全机制**：路径验证 + nginx伪装页面

## 更新日志

- v1.0.0: 初始版本，支持自动登录和打卡
- v1.1.0: 添加nginx伪装页面，增强安全性
- v1.2.0: 优化打卡流程，支持多种打卡类型

## 许可证

本项目仅供学习交流使用，请勿用于商业用途。使用本工具时请遵守足下教育平台的使用条款。

## 贡献

欢迎提交Issue和Pull Request来改进这个项目。

## 联系方式

如有问题或建议，请通过GitHub Issues联系。