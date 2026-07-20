// 只在构建 CloudBase 浏览器 SDK 时使用。
// 打包成单文件后，静态网站无需在运行时加载数十个 ESM 依赖。
import cloudbase from '@cloudbase/js-sdk'

window.cloudbase = cloudbase
