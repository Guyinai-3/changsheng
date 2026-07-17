// CloudBase 云存档配置。
// 部署前只需填写环境 ID；若使用新版 Web SDK，再填写控制台生成的发布密钥。
window.CLOUD_SAVE_CONFIG = {
  environmentId: 'xiuxian-d0g6yqlya7911c4b7',
  region: 'ap-shanghai',
  accessKey: '',
  collection: 'game_save',
  loginMode: 'anonymous',
  // 静态 HTML 项目直接使用浏览器版 SDK，不改变游戏为服务端运行。
  // +esm 是可直接被浏览器动态 import 的完整 ESM 构建，避免原始包内的裸模块路径无法解析。
  sdkUrl: 'https://cdn.jsdelivr.net/npm/@cloudbase/js-sdk@2.24.0/+esm'
}
