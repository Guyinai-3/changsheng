// 云存档适配层：游戏仍只在浏览器运行；这里负责把本地快照异步同步到 CloudBase。
(function () {
  'use strict'

  const USER_ID_KEY = 'userId'
  const FORCE_CLOUD_LOAD_KEY = 'xiuxian_cloud_force_load'
  const LOCAL_GAME_SAVE_KEY = 'xiuxian_html5_xiuxian_game_save'
  const DEFAULT_COLLECTION = 'game_save'
  const SYNC_INTERVAL = 60 * 1000
  let app = null
  let db = null
  let readyPromise = null
  let pendingData = null
  let pendingOptions = null
  let saveTimer = null
  let saveInFlight = false
  let lastCloudSaveAt = 0
  let status = { state: 'local', message: '仅本地存档', lastSavedAt: 0 }

  function config () { return window.CLOUD_SAVE_CONFIG || {} }
  function enabled () {
    const env = String(config().environmentId || '')
    return !!env && env !== '请填写你的CloudBase环境ID'
  }
  function clone (value) { return JSON.parse(JSON.stringify(value)) }
  function isoToMs (value) { const ms = new Date(value || 0).getTime(); return Number.isFinite(ms) ? ms : 0 }

  function getUserId () {
    let userId = ''
    try { userId = window.localStorage.getItem(USER_ID_KEY) || '' } catch (error) {}
    if (!/^player_[a-z0-9]{8,}$/i.test(userId)) {
      const bytes = new Uint32Array(2)
      if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(bytes)
      else { bytes[0] = Date.now(); bytes[1] = Math.random() * 0xffffffff }
      userId = 'player_' + Array.prototype.map.call(bytes, function (item) { return item.toString(36) }).join('').slice(0, 12)
      try { window.localStorage.setItem(USER_ID_KEY, userId) } catch (error) {}
    }
    return userId
  }

  function switchUserId (nextUserId) {
    const userId = String(nextUserId || '').trim()
    if (!/^player_[a-z0-9]{8,}$/i.test(userId)) throw new Error('账号格式应为 player_ 后接至少 8 位字母或数字')
    window.localStorage.setItem(USER_ID_KEY, userId)
    // 切换设备账号时必须优先使用云端，不能让新浏览器的空白本地档反向覆盖云端。
    window.localStorage.setItem(FORCE_CLOUD_LOAD_KEY, '1')
    window.localStorage.removeItem(LOCAL_GAME_SAVE_KEY)
    window.location.reload()
  }

  function emitStatus (next) {
    status = Object.assign({}, status, next)
    window.dispatchEvent(new CustomEvent('cloudsave:status', { detail: getStatus() }))
  }
  function getStatus () { return Object.assign({ userId: getUserId(), enabled: enabled() }, status) }

  function loadSdk () {
    if (window.cloudbase || window.CloudBase || window.tcb) return Promise.resolve(window.cloudbase || window.CloudBase || window.tcb)
    if (config().sdkMode === 'script') {
      return new Promise(function (resolve, reject) {
        const script = document.createElement('script')
        script.src = config().sdkUrl
        script.async = true
        script.onload = function () { resolve(window.cloudbase || window.CloudBase || window.tcb) }
        script.onerror = function () { reject(new Error('CloudBase SDK 加载失败')) }
        document.head.appendChild(script)
      })
    }
    return import(config().sdkUrl).then(function (module) { return module.default || module.cloudbase || module })
      .catch(function () { throw new Error('CloudBase SDK 加载失败') })
  }

  // CloudBase Web SDK 的部分构建版本没有把 signInAnonymously 暴露到 Auth 原型上，
  // 但底层认证模块仍提供同一能力。优先走公开接口，必要时再使用兼容入口。
  async function signInAnonymously (auth) {
    if (typeof auth.signInAnonymously === 'function') {
      const result = await auth.signInAnonymously()
      if (result && result.error) throw result.error
      return
    }
    const authApi = auth && auth.oauthInstance && auth.oauthInstance.authApi
    if (!authApi || typeof authApi.signInAnonymously !== 'function') {
      throw new Error('当前 CloudBase SDK 不支持匿名登录')
    }
    await authApi.signInAnonymously({})
    if (typeof auth.createLoginState === 'function') await auth.createLoginState()
  }

  async function initialize () {
    getUserId()
    if (!enabled()) return null
    if (readyPromise) return readyPromise
    readyPromise = (async function () {
      emitStatus({ state: 'connecting', message: '正在连接云存档' })
      const cloudbase = await loadSdk()
      if (!cloudbase || typeof cloudbase.init !== 'function') throw new Error('CloudBase SDK 初始化失败')
      const options = { env: config().environmentId, region: config().region || 'ap-shanghai' }
      if (config().accessKey) options.accessKey = config().accessKey
      app = cloudbase.init(options)
      if (config().loginMode === 'anonymous') {
        const auth = app.auth()
        const loginState = await auth.getLoginState()
        // 没有有效会话时创建游客登录；已有会话则复用，避免每次打开游戏都生成新身份。
        if (!loginState) await signInAnonymously(auth)
      }
      db = app.database()
      emitStatus({ state: 'ready', message: '云存档已连接' })
      return db
    })().catch(function (error) {
      readyPromise = null
      emitStatus({ state: 'error', message: '云同步不可用：' + (error.message || '连接失败') })
      throw error
    })
    return readyPromise
  }

  function documentRef () { return db.collection(config().collection || DEFAULT_COLLECTION).doc(getUserId()) }
  function extractData (result) {
    const data = result && result.data
    return Array.isArray(data) ? data[0] : data
  }

  // CloudBase 某些数据库错误会作为返回值而非异常抛出；必须转换成失败，
  // 否则界面会误把“集合不存在”等错误显示为同步成功。
  function assertDatabaseResult (result) {
    if (!result || !result.code || result.code === 'OK' || result.code === 0) return result
    throw new Error(result.message || String(result.code))
  }

  async function loadGameFromCloud (localSave) {
    getUserId()
    if (!enabled()) return { source: 'local', reason: 'disabled' }
    try {
      await initialize()
      const cloudRecord = extractData(await documentRef().get())
      if (!cloudRecord || !cloudRecord.saveData) {
        emitStatus({ state: 'ready', message: '云端暂无存档，将创建新存档' })
        return { source: 'local', shouldUpload: true }
      }
      const forceCloudLoad = window.localStorage.getItem(FORCE_CLOUD_LOAD_KEY) === '1'
      if (forceCloudLoad) window.localStorage.removeItem(FORCE_CLOUD_LOAD_KEY)
      const cloudTime = Number(cloudRecord.updateTimeMs) || isoToMs(cloudRecord.updateTime)
      const localTime = Number(localSave && localSave.updateTimeMs) || isoToMs(localSave && localSave.updateTime)
      if (forceCloudLoad || cloudTime > localTime) {
        emitStatus({ state: 'synced', message: '已载入云存档', lastSavedAt: cloudTime })
        return { source: 'cloud', saveData: cloudRecord.saveData }
      }
      emitStatus({ state: 'synced', message: '本地存档较新，已准备同步', lastSavedAt: cloudTime })
      return { source: 'local', shouldUpload: true }
    } catch (error) {
      // 云端异常绝不阻断本地游戏。
      emitStatus({ state: 'error', message: '云端读取失败，继续使用本地存档' })
      return { source: 'local', error: error }
    }
  }

  async function upload (data, options) {
    if (!enabled()) return false
    await initialize()
    const now = new Date()
    const saveData = clone(data)
    const updateTime = saveData.updateTime || now.toISOString()
    const updateTimeMs = Number(saveData.updateTimeMs) || isoToMs(updateTime) || now.getTime()
    const record = {
      userId: getUserId(),
      saveData: saveData,
      saveVersion: Math.max(1, Number(saveData.saveVersion) || 1),
      createTime: status.createTime || now.toISOString(),
      updateTime: updateTime,
      updateTimeMs: updateTimeMs
    }
    assertDatabaseResult(await documentRef().set(record))
    lastCloudSaveAt = Date.now()
    emitStatus({ state: 'synced', message: options && options.reason === 'manual' ? '已保存到云端' : '云存档已同步', lastSavedAt: updateTimeMs, createTime: record.createTime })
    return true
  }

  async function flush () {
    if (saveInFlight || !pendingData) return
    saveInFlight = true
    const data = pendingData
    const options = pendingOptions || {}
    pendingData = null
    pendingOptions = null
    try {
      await upload(data, options)
    } catch (error) {
      emitStatus({ state: 'error', message: '云同步失败，当前进度仍保存在本地' })
      if (options.manual) window.platform && window.platform.showToast({ title: '云同步失败\n当前进度仍保存在本地' })
    } finally {
      saveInFlight = false
      if (pendingData) scheduleFlush(pendingOptions || {})
    }
  }

  function scheduleFlush (options) {
    if (!enabled()) return
    window.clearTimeout(saveTimer)
    const immediate = !!options.immediate || !!options.manual
    const delay = immediate ? 0 : Math.max(0, SYNC_INTERVAL - (Date.now() - lastCloudSaveAt))
    saveTimer = window.setTimeout(flush, delay)
  }

  function saveGameToCloud (data, options) {
    pendingData = data
    pendingOptions = Object.assign({}, pendingOptions || {}, options || {})
    scheduleFlush(pendingOptions)
  }

  async function saveNow (data) {
    pendingData = data
    pendingOptions = { immediate: true, manual: true, reason: 'manual' }
    window.clearTimeout(saveTimer)
    await flush()
  }

  async function deleteCloudSave () {
    if (!enabled()) throw new Error('请先在 cloudConfig.js 填写 CloudBase 环境 ID')
    await initialize()
    assertDatabaseResult(await documentRef().remove())
    emitStatus({ state: 'ready', message: '云存档已删除', lastSavedAt: 0 })
  }

  function bindPanel () {
    const panel = document.getElementById('cloud-save-panel')
    if (!panel) return
    const account = document.getElementById('cloud-account-id')
    const sync = document.getElementById('cloud-sync-state')
    const time = document.getElementById('cloud-last-saved')
    function render () {
      const info = getStatus()
      account.textContent = info.userId
      sync.textContent = info.message
      time.textContent = info.lastSavedAt ? new Date(info.lastSavedAt).toLocaleString('zh-CN', { hour12: false }) : '尚未保存'
    }
    window.addEventListener('cloudsave:status', render)
    document.getElementById('cloud-save-close').addEventListener('click', function () { panel.hidden = true })
    document.getElementById('cloud-save-now').addEventListener('click', function () {
      if (typeof window.getCurrentGameSave === 'function') saveNow(window.getCurrentGameSave())
    })
    document.getElementById('cloud-reload-save').addEventListener('click', async function () {
      if (typeof window.reloadGameFromCloud !== 'function') return
      try { await window.reloadGameFromCloud() } catch (error) { window.platform.showToast({ title: '云端读取失败，继续使用本地存档' }) }
    })
    document.getElementById('cloud-delete-save').addEventListener('click', function () {
      window.platform.showModal({ title: '删除云存档', content: '只删除云端副本，本机进度不会删除。确定继续吗？', confirmText: '删除云端存档', cancelText: '取消', success: async function (result) { if (!result.confirm) return; try { await deleteCloudSave(); window.platform.showToast({ title: '云存档已删除' }) } catch (error) { window.platform.showToast({ title: '删除云存档失败' }) } } })
    })
    document.getElementById('cloud-switch-account').addEventListener('click', function () {
      window.platform.showModal({ title: '切换云存档账号', content: '在另一台设备输入该设备“账号”栏显示的 player_xxxx。当前浏览器本地缓存会清除，并从云端重新加载。', editable: true, defaultText: '', placeholderText: 'player_xxxxxxxxxxxx', confirmText: '切换并重载', cancelText: '取消', success: function (result) { if (!result.confirm) return; try { switchUserId(result.content) } catch (error) { window.platform.showToast({ title: error.message }) } } })
    })
    window.openCloudSavePanel = function () { render(); panel.hidden = false }
  }

  window.CloudSaveManager = { getUserId: getUserId, getStatus: getStatus, initialize: initialize, loadGameFromCloud: loadGameFromCloud, saveGameToCloud: saveGameToCloud, saveNow: saveNow, deleteCloudSave: deleteCloudSave, switchUserId: switchUserId }
  document.addEventListener('DOMContentLoaded', bindPanel)
})()
