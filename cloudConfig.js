// CloudBase 云存档配置。
// 部署前只需填写环境 ID；若使用新版 Web SDK，再填写控制台生成的发布密钥。
window.CLOUD_SAVE_CONFIG = {
  environmentId: 'xiuxian-d0g6yqlya7911c4b7',
  region: 'ap-shanghai',
  accessKey: '',
  // 所有账号与存档读写都通过云函数完成；浏览器不再直接访问数据库集合。
  accountFunctionName: 'gameAccount',
  loginMode: 'anonymous',
  // 由 tools/cloudbase-browser-entry.js 打包的当前 SDK：静态网站只加载一个本地文件。
  sdkUrl: 'vendor/cloudbase-sdk.js',
  sdkMode: 'script'
}
