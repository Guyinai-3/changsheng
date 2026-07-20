// CloudBase 云存档配置。
// 部署前只需填写环境 ID；若使用新版 Web SDK，再填写控制台生成的发布密钥。
window.CLOUD_SAVE_CONFIG = {
  environmentId: 'xiuxian-d0g6yqlya7911c4b7',
  region: 'ap-shanghai',
  accessKey: '',
  collection: 'game_save',
  loginMode: 'anonymous',
  // 腾讯 CloudBase 提供的单文件浏览器 SDK；避免 ESM 依赖链过长造成首屏云同步一直连接中。
  sdkUrl: 'https://imgcache.qq.com/qcloud/tcbjs/1.6.0/tcb.js',
  sdkMode: 'script'
}
