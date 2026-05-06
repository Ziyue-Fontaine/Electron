import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'

export function activate(context: vscode.ExtensionContext) {
  // 注册 vbi.showChart 命令
  let disposable = vscode.commands.registerCommand('vbi.showChart', () => {
    // 在侧边栏 (Beside) 打开 Webview
    const panel = vscode.window.createWebviewPanel(
      'vbiChartViewer', // Webview 的内部标识
      'VBI Chart', // 面板标题
      vscode.ViewColumn.Beside, // 显示在编辑器的哪一侧
      {
        enableScripts: true, // 极其重要：允许 Webview 执行 JS 脚本
        localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'media'))],
      },
    )

    // 读取 HTML 并替换 CDN 引用为本地资源 URI
    let htmlPath = path.join(context.extensionPath, 'media', 'demo.html')
    let htmlContent = ''
    try {
      htmlContent = fs.readFileSync(htmlPath, 'utf8')
    } catch (err) {
      vscode.window.showErrorMessage('Failed to load demo.html: ' + err)
      return
    }

    // 关键修复：将 HTML 中对本地脚本的引用替换为 vscode-webview:// URI（绕过 CSP）
    const vchartLocalUri = panel.webview.asWebviewUri(
      vscode.Uri.file(path.join(context.extensionPath, 'media', 'vchart.min.js')),
    )
    htmlContent = htmlContent.replace(
      'https://unpkg.com/@visactor/vchart/build/index.min.js',
      vchartLocalUri.toString(),
    )

    panel.webview.html = htmlContent

    // 接收 Webview 消息，等它加载完再执行模拟请求
    panel.webview.onDidReceiveMessage((message) => {
      if (message.command === 'ready') {
        // 模拟数据查询与转换：延迟 1000ms 后推送 VChart Spec
        setTimeout(() => {
          const demoSpec = {
            type: 'bar',
            data: [
              {
                id: 'barData',
                values: [
                  { category: 'Jan', value: 200 },
                  { category: 'Feb', value: 450 },
                  { category: 'Mar', value: 300 },
                  { category: 'Apr', value: 600 },
                  { category: 'May', value: 500 },
                ],
              },
            ],
            xField: 'category',
            yField: 'value',
            title: {
              visible: true,
              text: 'VBI Demo Bar Chart',
            },
          }

          // 向前端孤岛环境发送渲染指令和数据
          panel.webview.postMessage({
            command: 'renderChart',
            data: demoSpec,
          })
        }, 1000)
      }
    })
  })

  context.subscriptions.push(disposable)
}

export function deactivate() {}
