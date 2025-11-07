/**
 * 足下教育平台自动登录脚本
 * 获取access_token并渲染到浏览器界面
 */

// 日志控制变量
let enableLogging = false;

/**
 * 条件日志函数
 * @param {...any} args 日志参数
 */
function logIfEnabled(...args) {
    if (enableLogging) {
        console.log(...args);
    }
}

/**
 * 条件错误日志函数
 * @param {...any} args 日志参数
 */
function errorIfEnabled(...args) {
    if (enableLogging) {
        console.error(...args);
    }
}

export default {
    async fetch(request, env, ctx) {
        // 设置日志控制变量
        enableLogging = env?.ENABLE_LOGGING === "true";
        
        const url = new URL(request.url)
        
        // 从URL路径中提取用户名
        const pathSegments = url.pathname.split('/').filter(segment => segment.length > 0);
        const usernameFromPath = pathSegments.length > 0 ? pathSegments[0] : null;
        
        // 获取环境变量中的用户名
        const envUsername = env?.ZU_XIA_USERNAME;
        
        // 验证用户名
        if (!usernameFromPath || !envUsername || usernameFromPath !== envUsername) {
            return new Response(getNginx404Page(), {
                status: 404,
                headers: {
                    'Content-Type': 'text/html;charset=UTF-8',
                }
            });
        }

        // 输出请求信息到控制台
        logIfEnabled('=== 请求信息 ===')
        logIfEnabled('URL:', url.href)
        logIfEnabled('Method:', request.method)
        logIfEnabled('Headers:', Object.fromEntries(request.headers.entries()))
        logIfEnabled('用户名:', usernameFromPath)

        try {
            // 获取登录凭证
            const loginResult = await getLoginToken(env)

            // 输出登录响应到控制台
            logIfEnabled('=== 登录响应 ===')
            logIfEnabled('Status:', loginResult.status)
            logIfEnabled('Headers:', Object.fromEntries(loginResult.headers.entries()))
            logIfEnabled('Body:', await loginResult.clone().json())

            // 解析响应获取access_token
            const loginData = await loginResult.json()
            const accessToken = loginData.access_token

            // 检查是否执行打卡操作
            if (url.searchParams.get('action') === 'clockin') {
                const clockinType = url.searchParams.get('type') || 'all' // all, home, sports, daily
                const clockinResults = await performClockIn(accessToken, env, clockinType)
                
                // 返回打卡结果页面
                return new Response(getClockinResultPage(clockinResults), {
                    headers: {
                        'Content-Type': 'text/html;charset=UTF-8',
                    }
                })
            }

            // 返回HTML页面显示access_token
            return new Response(getHtmlPage(accessToken), {
                headers: {
                    'Content-Type': 'text/html;charset=UTF-8',
                }
            })
        } catch (error) {
            errorIfEnabled('=== 错误信息 ===')
            errorIfEnabled('Error:', error)

            // 返回错误页面
            return new Response(getErrorPage(error), {
                headers: {
                    'Content-Type': 'text/html;charset=UTF-8',
                }
            })
        }
    },
    
    // 添加定时触发事件处理器
    async scheduled(event, env, ctx) {
        // 设置日志控制变量
        enableLogging = env?.ENABLE_LOGGING === "true";
        
        logIfEnabled('=== 定时打卡任务开始 ===')
        logIfEnabled('定时触发时间:', new Date().toISOString())
        
        try {
            // 获取登录凭证
            const loginResult = await getLoginToken(env)
            
            logIfEnabled('=== 登录响应 ===')
            logIfEnabled('Status:', loginResult.status)
            
            // 解析响应获取access_token
            const loginData = await loginResult.json()
            const accessToken = loginData.access_token
            
            // 执行自动打卡
            const clockinResults = await performClockIn(accessToken, env, 'all')
            
            // 记录打卡结果
            logIfEnabled('=== 自动打卡结果 ===')
            logIfEnabled('首页打卡:', clockinResults.home.success ? '成功' : '失败 - ' + clockinResults.home.message)
            logIfEnabled('运动打卡:', clockinResults.sports.success ? '成功' : '失败 - ' + clockinResults.sports.message)
            logIfEnabled('日精进打卡:', clockinResults.daily.success ? '成功' : '失败 - ' + clockinResults.daily.message)
            
            // 如果有失败的打卡，可以在这里添加通知逻辑
            const failedTasks = []
            if (!clockinResults.home.success) failedTasks.push('首页')
            if (!clockinResults.sports.success) failedTasks.push('运动')
            if (!clockinResults.daily.success) failedTasks.push('日精进')
            
            if (failedTasks.length > 0) {
                logIfEnabled(`以下打卡任务失败: ${failedTasks.join(', ')}`)
            } else {
                logIfEnabled('所有打卡任务均成功完成')
            }
            
            logIfEnabled('=== 定时打卡任务完成 ===')
        } catch (error) {
            errorIfEnabled('定时打卡过程中发生错误:', error)
        }
    }
}

/**
 * 延迟函数
 * @param {number} ms 延迟毫秒数
 * @returns {Promise} Promise对象
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 执行打卡操作
 * @param {string} accessToken 登录获取的Access Token
 * @param {Object} env 环境变量
 * @param {string} clockinType 打卡类型：all(全部), home(首页), sports(运动), daily(日精进)
 * @returns {Object} 打卡结果
 */
async function performClockIn(accessToken, env, clockinType) {
    const results = {
        home: { success: false, message: '', data: null },
        sports: { success: false, message: '', data: null },
        daily: { success: false, message: '', data: null }
    }

    try {
        // 首页签到
        if (clockinType === 'all' || clockinType === 'home') {
            logIfEnabled('开始首页签到...')
            results.home = await clockInHome(accessToken)
            
            // 如果是全部打卡，添加延迟
            if (clockinType === 'all') {
                logIfEnabled('首页签到完成，等待5秒后执行运动打卡...')
                await delay(5000) // 延迟5秒
            }
        }

        // 运动打卡
        if (clockinType === 'all' || clockinType === 'sports') {
            logIfEnabled('开始运动打卡...')
            results.sports = await clockInSports(accessToken, env)
            
            // 如果是全部打卡，添加延迟
            if (clockinType === 'all') {
                logIfEnabled('运动打卡完成，等待5秒后执行日精进打卡...')
                await delay(5000) // 延迟5秒
            }
        }

        // 日精进打卡
        if (clockinType === 'all' || clockinType === 'daily') {
            logIfEnabled('开始日精进打卡...')
            results.daily = await clockInDaily(accessToken, env)
        }
    } catch (error) {
        errorIfEnabled('打卡过程中发生错误:', error)
    }

    return results
}

/**
 * 首页签到
 * @param {string} accessToken Access Token
 * @returns {Object} 打卡结果
 */
async function clockInHome(accessToken) {
    try {
        logIfEnabled('开始首页签到，Access Token:', accessToken.substring(0, 50) + '...')
        
        // 首页签到通过访问主页完成
        const response = await fetch('https://ai.cqzuxia.com/', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'Referer': 'https://ai.cqzuxia.com/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'
            }
        })

        logIfEnabled('首页签到响应状态:', response.status, response.statusText)
        logIfEnabled('首页签到响应头:', Object.fromEntries(response.headers.entries()))

        // 检查响应状态
        if (!response.ok) {
            return {
                success: false,
                message: `首页签到失败: HTTP ${response.status} ${response.statusText}`,
                data: null
            }
        }

        // 获取响应内容
        const textContent = await response.text();
        logIfEnabled('首页签到响应内容长度:', textContent.length)
        
        // 只要成功访问主页，就认为签到成功
        return {
            success: true,
            message: '首页签到成功',
            data: { contentLength: textContent.length }
        }
    } catch (error) {
        errorIfEnabled('首页签到异常:', error)
        return {
            success: false,
            message: `首页签到异常: ${error.message}`,
            data: null
        }
    }
}

/**
 * 运动打卡
 * @param {string} accessToken Access Token
 * @param {Object} env 环境变量
 * @returns {Object} 打卡结果
 */
async function clockInSports(accessToken, env) {
    try {
        logIfEnabled('开始运动打卡流程')
        
        // 1. 获取必应背景图片
        logIfEnabled('步骤1: 获取必应背景图片')
        const imageResponse = await getBingImage()
        if (!imageResponse.success) {
            return {
                success: false,
                message: `获取图片失败: ${imageResponse.message}`,
                data: null
            }
        }
        logIfEnabled('必应图片获取成功')

        // 2. 上传图片
        logIfEnabled('步骤2: 上传图片')
        const uploadResult = await uploadImage(accessToken, imageResponse.data)
        if (!uploadResult.success) {
            return {
                success: false,
                message: `图片上传失败: ${uploadResult.message}`,
                data: null
            }
        }
        logIfEnabled('图片上传成功:', uploadResult.data)

        // 3. 提交运动打卡
        logIfEnabled('步骤3: 提交运动打卡')
        const sportsContent = env?.SPORTS_COMMENT || '特色'
        
        // 使用正确的运动打卡API端点
        const endpoint = 'https://ai.cqzuxia.com/growing/api/StuTask/SaveStuDailyAssignment'
        
        logIfEnabled(`尝试运动打卡端点: ${endpoint}`)
        logIfEnabled('运动打卡内容:', sportsContent)
        logIfEnabled('图片ID:', uploadResult.data.id || uploadResult.data.Id)
        
        // 构建图片JSON数组，格式为["图片ID"]
        const imageId = uploadResult.data.id || uploadResult.data.Id
        const imageJsonArray = JSON.stringify([imageId])
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'accept': 'application/json, text/plain, */*',
                'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
                'authorization': `Bearer ${accessToken}`,
                'cache-control': 'no-cache',
                'content-type': 'application/json',
                'dnt': '1',
                'origin': 'https://ai.cqzuxia.com',
                'pragma': 'no-cache',
                'priority': 'u=1, i',
                'referer': 'https://ai.cqzuxia.com/stu-growing/',
                'sec-ch-ua': '"Chromium";v="142", "Microsoft Edge";v="142", "Not_A Brand";v="99"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-origin',
                'sec-gpc': '1',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0'
            },
            body: JSON.stringify({
                ASSType: '0', // 运动打卡类型
                Comment: sportsContent,
                ImgJson: imageJsonArray
            })
        })

        logIfEnabled('运动打卡提交响应状态:', response.status, response.statusText)
        logIfEnabled('运动打卡提交响应头:', Object.fromEntries(response.headers.entries()))

        // 获取响应文本
        const responseText = await response.text();
        logIfEnabled('运动打卡提交响应内容:', responseText.substring(0, 200) + '...')
        
        // 如果响应是空的，返回错误
        if (!responseText.trim()) {
            errorIfEnabled('运动打卡返回空响应')
            return {
                success: false,
                message: `运动打卡失败: 服务器返回空响应 (${response.status} ${response.statusText})`,
                data: null
            }
        }
        
        // 尝试解析JSON
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (jsonError) {
            errorIfEnabled('运动打卡提交响应不是有效的JSON:', responseText);
            return {
                success: false,
                message: `运动打卡失败: 响应不是有效的JSON格式`,
                data: { responseText: responseText.substring(0, 200) + '...' }
            }
        }
        
        if (response.ok && (data.code === 0 || data.success === true)) {
            logIfEnabled('运动打卡成功:', data)
            return {
                success: true,
                message: '运动打卡成功',
                data: data
            }
        } else {
            errorIfEnabled('运动打卡失败:', data)
            return {
                success: false,
                message: data.message || data.msg || `运动打卡失败: ${response.status} ${response.statusText}`,
                data: data
            }
        }
    } catch (error) {
        errorIfEnabled('运动打卡异常:', error)
        return {
            success: false,
            message: `运动打卡异常: ${error.message}`,
            data: null
        }
    }
}

/**
 * 日精进打卡
 * @param {string} accessToken Access Token
 * @param {Object} env 环境变量
 * @returns {Object} 打卡结果
 */
async function clockInDaily(accessToken, env) {
    try {
        logIfEnabled('开始日精进打卡流程')
        
        const dailyContent = env?.DAILY_COMMENT || '今日学习精进，不断提升自我！'
        logIfEnabled('日精进打卡内容:', dailyContent)

        // 使用正确的日精进打卡API端点
        const endpoint = 'https://ai.cqzuxia.com/growing/api/StuTask/SaveStuDailyAssignment'
        
        logIfEnabled(`尝试日精进打卡端点: ${endpoint}`)
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
                'Cache-Control': 'no-cache',
                'DNT': '1',
                'Origin': 'https://ai.cqzuxia.com',
                'Pragma': 'no-cache',
                'Priority': 'u=1, i',
                'Referer': 'https://ai.cqzuxia.com/stu-growing/',
                'Sec-Ch-Ua': '"Chromium";v="142", "Microsoft Edge";v="142", "Not_A Brand";v="99"',
                'Sec-Ch-Ua-Mobile': '?0',
                'Sec-Ch-Ua-Platform': '"Windows"',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-origin',
                'Sec-Gpc': '1',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0'
            },
            body: JSON.stringify({
                ASSType: '1', // 日精进打卡类型
                Comment: dailyContent,
                ImgJson: '[]' // 日精进不需要图片
            })
        })

        logIfEnabled('日精进打卡提交响应状态:', response.status, response.statusText)
        logIfEnabled('日精进打卡提交响应头:', Object.fromEntries(response.headers.entries()))

        // 获取响应文本
        const responseText = await response.text();
        logIfEnabled('日精进打卡提交响应内容:', responseText.substring(0, 200) + '...')
        
        // 如果响应是空的，返回错误
        if (!responseText.trim()) {
            errorIfEnabled('日精进打卡返回空响应')
            return {
                success: false,
                message: `日精进打卡失败: 服务器返回空响应 (${response.status} ${response.statusText})`,
                data: null
            }
        }
        
        // 尝试解析JSON
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (jsonError) {
            errorIfEnabled('日精进打卡提交响应不是有效的JSON:', responseText);
            return {
                success: false,
                message: `日精进打卡失败: 响应不是有效的JSON格式`,
                data: { responseText: responseText.substring(0, 200) + '...' }
            }
        }
        
        if (response.ok && (data.code === 0 || data.success === true)) {
            logIfEnabled('日精进打卡成功:', data)
            return {
                success: true,
                message: '日精进打卡成功',
                data: data
            }
        } else {
            errorIfEnabled('日精进打卡失败:', data)
            return {
                success: false,
                message: data.message || data.msg || `日精进打卡失败: ${response.status} ${response.statusText}`,
                data: data
            }
        }
    } catch (error) {
        errorIfEnabled('日精进打卡异常:', error)
        return {
            success: false,
            message: `日精进打卡异常: ${error.message}`,
            data: null
        }
    }
}

/**
 * 获取必应背景图片
 * @returns {Object} 包含图片数据的对象
 */
async function getBingImage() {
    try {
        // 使用必应API获取今日壁纸
        const response = await fetch('https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=zh-CN')
        const data = await response.json()
        
        if (data && data.images && data.images.length > 0) {
            const image = data.images[0]
            const imageUrl = `https://www.bing.com${image.url}`
            
            // 获取图片数据
            const imageResponse = await fetch(imageUrl)
            if (!imageResponse.ok) {
                throw new Error(`获取图片失败: ${imageResponse.status}`)
            }
            
            const imageBuffer = await imageResponse.arrayBuffer()
            
            return {
                success: true,
                data: {
                    buffer: imageBuffer,
                    contentType: imageResponse.headers.get('content-type') || 'image/jpeg',
                    fileName: `bing_${image.startdate}.jpg`
                }
            }
        } else {
            throw new Error('未找到必应图片')
        }
    } catch (error) {
        errorIfEnabled('获取必应图片失败:', error)
        return {
            success: false,
            message: error.message,
            data: null
        }
    }
}

/**
 * 上传图片到足下平台
 * @param {string} accessToken Access Token
 * @param {Object} imageData 图片数据
 * @returns {Object} 上传结果
 */
async function uploadImage(accessToken, imageData) {
    try {
        logIfEnabled('开始上传图片，文件名:', imageData.fileName)
        
        // 创建FormData
        const formData = new FormData()
        const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
        
        formData.append('bucketName', 'stu-growing')
        formData.append('filePath', `student-pc/${date}`)
        formData.append('FileType', '1')
        formData.append('file', new Blob([imageData.buffer], { type: imageData.contentType }), imageData.fileName)

        const response = await fetch('https://ai.cqzuxia.com/oss/api/SmartFiles/UpLoadFormFile', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json, text/plain, */*',
                'Referer': 'https://ai.cqzuxia.com/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'
            },
            body: formData
        })

        logIfEnabled('图片上传响应状态:', response.status, response.statusText)
        logIfEnabled('图片上传响应头:', Object.fromEntries(response.headers.entries()))

        // 获取响应文本
        const responseText = await response.text();
        logIfEnabled('图片上传响应内容:', responseText.substring(0, 200) + '...')
        
        // 如果响应是空的，返回错误
        if (!responseText.trim()) {
            errorIfEnabled('图片上传返回空响应')
            return {
                success: false,
                message: `图片上传失败: 服务器返回空响应 (${response.status} ${response.statusText})`,
                data: null
            }
        }
        
        // 尝试解析JSON
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (jsonError) {
            errorIfEnabled('图片上传响应不是有效的JSON:', responseText);
            return {
                success: false,
                message: `图片上传失败: 响应不是有效的JSON格式`,
                data: { responseText: responseText.substring(0, 200) + '...' }
            }
        }
        
        if (response.ok && (data.code === 0 || data.success === true)) {
            logIfEnabled('图片上传成功:', data)
            return {
                success: true,
                message: '图片上传成功',
                data: data.data || data
            }
        } else {
            errorIfEnabled('图片上传失败:', data)
            return {
                success: false,
                message: data.message || data.msg || '图片上传失败',
                data: data
            }
        }
    } catch (error) {
        errorIfEnabled('图片上传异常:', error)
        return {
            success: false,
            message: `图片上传异常: ${error.message}`,
            data: null
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
    logIfEnabled('=== 租户信息 ===')
    logIfEnabled('Tenant Response Status:', tenantResponse.status)
    logIfEnabled('Tenant Data:', tenantData)
    logIfEnabled('Selected Tenant ID:', tenantId)

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
    logIfEnabled('=== 登录请求信息 ===')
    logIfEnabled('Username:', username)
    logIfEnabled('Password:', password.replace(/./g, '*')) // 隐藏密码
    logIfEnabled('Tenant ID:', tenantId)
    logIfEnabled('Request Body:', loginData.toString())

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
            margin-right: 10px;
        }
        .copy-button:hover {
            background-color: #0069d9;
        }
        .copy-button:active {
            background-color: #0062cc;
        }
        .clockin-button {
            background-color: #28a745;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: background-color 0.2s;
            margin-right: 10px;
        }
        .clockin-button:hover {
            background-color: #218838;
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
        .button-container {
            margin-top: 20px;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>足下教育平台 - Access Token</h1>
        <div class="success-message" id="successMessage">Access Token已复制到剪贴板！</div>
        <div class="token-container" id="tokenContainer">${accessToken}</div>
        
        <div class="button-container">
            <button class="copy-button" onclick="copyToken()">复制 Access Token</button>
            <button class="clockin-button" onclick="goToClockin('all')">全部打卡</button>
            <button class="clockin-button" onclick="goToClockin('home')">首页签到</button>
            <button class="clockin-button" onclick="goToClockin('sports')">运动打卡</button>
            <button class="clockin-button" onclick="goToClockin('daily')">日精进打卡</button>
        </div>
        
        <div class="info">
            <p>此Access Token可用于足下教育平台的API调用。</p>
            <p>请注意保护您的Access Token，不要泄露给他人。</p>
            <p>点击打卡按钮将自动执行相应的打卡操作。</p>
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
        
        function goToClockin(type) {
            window.location.href = '?action=clockin&type=' + type;
        }
    </script>
</body>
</html>
`
}

/**
 * 生成打卡结果页面
 * @param {Object} clockinResults 打卡结果
 */
function getClockinResultPage(clockinResults) {
    const homeResult = clockinResults.home;
    const sportsResult = clockinResults.sports;
    const dailyResult = clockinResults.daily;
    
    const homeStatus = homeResult.success ? 
        `<span style="color: #28a745;">✓ ${homeResult.message}</span>` : 
        `<span style="color: #dc3545;">✗ ${homeResult.message}</span>`;
        
    const sportsStatus = sportsResult.success ? 
        `<span style="color: #28a745;">✓ ${sportsResult.message}</span>` : 
        `<span style="color: #dc3545;">✗ ${sportsResult.message}</span>`;
        
    const dailyStatus = dailyResult.success ? 
        `<span style="color: #28a745;">✓ ${dailyResult.message}</span>` : 
        `<span style="color: #dc3545;">✗ ${dailyResult.message}</span>`;

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>足下教育平台 - 打卡结果</title>
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
        .result-item {
            margin-bottom: 20px;
            padding: 15px;
            border-radius: 4px;
            border-left: 4px solid #ddd;
        }
        .result-item.success {
            background-color: #f8fff8;
            border-left-color: #28a745;
        }
        .result-item.error {
            background-color: #fff8f8;
            border-left-color: #dc3545;
        }
        .result-title {
            font-weight: bold;
            margin-bottom: 10px;
            font-size: 18px;
        }
        .result-message {
            margin-bottom: 10px;
        }
        .result-details {
            font-size: 12px;
            color: #6c757d;
            font-family: monospace;
            background-color: #f8f9fa;
            padding: 10px;
            border-radius: 4px;
            white-space: pre-wrap;
            max-height: 200px;
            overflow-y: auto;
        }
        .back-button {
            background-color: #007bff;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            margin-top: 20px;
        }
        .back-button:hover {
            background-color: #0069d9;
        }
        .button-container {
            text-align: center;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>足下教育平台 - 打卡结果</h1>
        
        <div class="result-item ${homeResult.success ? 'success' : 'error'}">
            <div class="result-title">首页签到</div>
            <div class="result-message">${homeStatus}</div>
            ${homeResult.data ? `<div class="result-details">${JSON.stringify(homeResult.data, null, 2)}</div>` : ''}
        </div>
        
        <div class="result-item ${sportsResult.success ? 'success' : 'error'}">
            <div class="result-title">运动打卡</div>
            <div class="result-message">${sportsStatus}</div>
            ${sportsResult.data ? `<div class="result-details">${JSON.stringify(sportsResult.data, null, 2)}</div>` : ''}
        </div>
        
        <div class="result-item ${dailyResult.success ? 'success' : 'error'}">
            <div class="result-title">日精进打卡</div>
            <div class="result-message">${dailyStatus}</div>
            ${dailyResult.data ? `<div class="result-details">${JSON.stringify(dailyResult.data, null, 2)}</div>` : ''}
        </div>
        
        <div class="button-container">
            <button class="back-button" onclick="window.location.href='/'">返回首页</button>
        </div>
    </div>
</body>
</html>
`
}

/**
 * 生成nginx风格的404错误页面
 */
function getNginx404Page() {
    return `
<!DOCTYPE html>
<html>
<head>
<title>Welcome to nginx!</title>
<style>
    body {
        width: 35em;
        margin: 0 auto;
        font-family: Tahoma, Verdana, Arial, sans-serif;
    }
</style>
</head>
<body>
<h1>Welcome to nginx!</h1>
<p>If you see this page, the nginx web server is successfully installed and
working. Further configuration is required.</p>

<p>For online documentation and support please refer to
<a href="http://nginx.org/">nginx.org</a>.<br/>
Commercial support is available at
<a href="http://nginx.com/">nginx.com</a>.</p>

<p><em>Thank you for using nginx.</em></p>
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