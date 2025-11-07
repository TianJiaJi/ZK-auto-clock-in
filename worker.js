/**
 * 足下教育平台自动登录脚本
 * 获取access_token并渲染到浏览器界面
 */

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url)

        // 输出请求信息到控制台
        console.log('=== 请求信息 ===')
        console.log('URL:', url.href)
        console.log('Method:', request.method)
        console.log('Headers:', Object.fromEntries(request.headers.entries()))

        try {
            // 获取登录凭证
            const loginResult = await getLoginToken(env)

            // 输出登录响应到控制台
            console.log('=== 登录响应 ===')
            console.log('Status:', loginResult.status)
            console.log('Headers:', Object.fromEntries(loginResult.headers.entries()))
            console.log('Body:', await loginResult.clone().json())

            // 解析响应获取access_token
            const loginData = await loginResult.json()
            const accessToken = loginData.access_token

            // 返回HTML页面显示access_token
            return new Response(getHtmlPage(accessToken), {
                headers: {
                    'Content-Type': 'text/html;charset=UTF-8',
                }
            })
        } catch (error) {
            console.error('=== 错误信息 ===')
            console.error('Error:', error)

            // 返回错误页面
            return new Response(getErrorPage(error), {
                headers: {
                    'Content-Type': 'text/html;charset=UTF-8',
                }
            })
        }
    }
}

/**
 * 获取登录token
 */
async function getLoginToken(env) {
    // 从环境变量获取账号密码，如果没有设置则使用默认值
    const username = env?.ZU_XIA_USERNAME || '530112200605070919'
    const password = env?.ZU_XIA_PASSWORD || '070919'

    // 获取验证码和租户信息
    const tenantResponse = await fetch('https://ai.cqzuxia.com/api/Tenants/GetAllValidTenant?')
    const tenantData = await tenantResponse.json()
    const tenantId = tenantData[0]?.id || '32'

    // 输出租户信息到控制台
    console.log('=== 租户信息 ===')
    console.log('Tenant Response Status:', tenantResponse.status)
    console.log('Tenant Data:', tenantData)
    console.log('Selected Tenant ID:', tenantId)

    // 构建登录请求
    const loginData = new URLSearchParams()
    loginData.append('username', username)
    loginData.append('password', password)
    loginData.append('code', '2341') // 验证码，可能需要动态获取
    loginData.append('vid', '')
    loginData.append('client_id', '43215cdff2d5407f8af074d2d7e589ee')
    loginData.append('client_secret', 'DBqEL1YfBmKgT9O491J1YnYoq84lYtB/LwMabAS2JEqa8I+r3z1VrDqymjisqJn3')
    loginData.append('grant_type', 'password')
    loginData.append('tenant_id', tenantId)

    // 输出登录请求信息到控制台
    console.log('=== 登录请求信息 ===')
    console.log('Username:', username)
    console.log('Password:', password.replace(/./g, '*')) // 隐藏密码
    console.log('Tenant ID:', tenantId)
    console.log('Request Body:', loginData.toString())

    // 发送登录请求
    const response = await fetch('https://ai.cqzuxia.com/connect/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json, text/plain, */*',
            'Referer': 'https://ai.cqzuxia.com/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'
        },
        body: loginData.toString()
    })

    return response
}

/**
 * 生成显示access_token的HTML页面
 * @param {string} accessToken
 */
function getHtmlPage(accessToken) {
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>足下教育平台 - Access Token</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background-color: white;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        h1 {
            color: #333;
            text-align: center;
            margin-bottom: 30px;
        }
        .token-container {
            background-color: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 4px;
            padding: 15px;
            margin-bottom: 20px;
            word-break: break-all;
            font-family: monospace;
            font-size: 14px;
            line-height: 1.5;
        }
        .copy-button {
            background-color: #007bff;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: background-color 0.2s;
        }
        .copy-button:hover {
            background-color: #0069d9;
        }
        .copy-button:active {
            background-color: #0062cc;
        }
        .info {
            color: #6c757d;
            font-size: 14px;
            margin-top: 20px;
        }
        .success-message {
            color: #28a745;
            font-weight: bold;
            margin-bottom: 15px;
            display: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>足下教育平台 - Access Token</h1>
        <div class="success-message" id="successMessage">Access Token已复制到剪贴板！</div>
        <div class="token-container" id="tokenContainer">${accessToken}</div>
        <button class="copy-button" onclick="copyToken()">复制 Access Token</button>
        <div class="info">
            <p>此Access Token可用于足下教育平台的API调用。</p>
            <p>请注意保护您的Access Token，不要泄露给他人。</p>
        </div>
    </div>

    <script>
        function copyToken() {
            const tokenElement = document.getElementById('tokenContainer');
            const textArea = document.createElement('textarea');
            textArea.value = tokenElement.textContent;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            
            const successMessage = document.getElementById('successMessage');
            successMessage.style.display = 'block';
            setTimeout(() => {
                successMessage.style.display = 'none';
            }, 3000);
        }
    </script>
</body>
</html>
`
}

/**
 * 生成错误页面
 * @param {Error} error
 */
function getErrorPage(error) {
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>登录错误</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background-color: white;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        h1 {
            color: #dc3545;
            text-align: center;
            margin-bottom: 30px;
        }
        .error-container {
            background-color: #f8d7da;
            border: 1px solid #f5c6cb;
            border-radius: 4px;
            padding: 15px;
            margin-bottom: 20px;
            color: #721c24;
        }
        .retry-button {
            background-color: #007bff;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        }
        .retry-button:hover {
            background-color: #0069d9;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>登录错误</h1>
        <div class="error-container">
            <p>获取Access Token时发生错误：</p>
            <p>${error.message}</p>
        </div>
        <button class="retry-button" onclick="window.location.reload()">重试</button>
    </div>
</body>
</html>
`
}