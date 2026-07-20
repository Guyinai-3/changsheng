// 账号与云存档适配层：浏览器只保留登录态和本地兜底快照，
// 密码校验、账号查询、存档读写全部交给 CloudBase 云函数执行。
(function () {
  'use strict'

  const CURRENT_USER_KEY = 'currentUser'
  const SESSION_KEY = 'xiuxian_account_session'
  const LEGACY_SAVE_KEY = 'xiuxian_html5_xiuxian_game_save'
  const LEGACY_BACKUP_KEY = 'xiuxian_legacy_guest_save_backup'
  const SYNC_INTERVAL = 60 * 1000
  let app = null
  let readyPromise = null
  let loginPromise = null
  let pendingData = null
  let pendingOptions = null
  let pendingLegacySave = null
  let saveTimer = null
  let saveInFlight = false
  let lastCloudSaveAt = 0
  let status = { state: 'login', message: '请登录账号后开始游戏', lastSavedAt: 0 }

  function config () { return window.CLOUD_SAVE_CONFIG || {} }
  function enabled () { return !!String(config().environmentId || '') }
  function clone (value) { return JSON.parse(JSON.stringify(value)) }
  function isoToMs (value) { const ms = new Date(value || 0).getTime(); return Number.isFinite(ms) ? ms : 0 }

  function readJson (key) {
    try { return JSON.parse(window.localStorage.getItem(key) || 'null') } catch (error) { return null }
  }
  function getCurrentUser () {
    const user = readJson(CURRENT_USER_KEY)
    return user && typeof user.userId === 'string' && typeof user.username === 'string' ? user : null
  }
  function getSessionToken () {
    try { return window.localStorage.getItem(SESSION_KEY) || '' } catch (error) { return '' }
  }
  function isLoggedIn () { return !!getCurrentUser() && !!getSessionToken() }
  function hasLegacySave () {
    try { return !!(window.localStorage.getItem(LEGACY_BACKUP_KEY) || window.localStorage.getItem(LEGACY_SAVE_KEY)) } catch (error) { return false }
  }
  function getLegacySave () { return readJson(LEGACY_BACKUP_KEY) || readJson(LEGACY_SAVE_KEY) }

  function emitStatus (next) {
    status = Object.assign({}, status, next)
    window.dispatchEvent(new CustomEvent('cloudsave:status', { detail: getStatus() }))
  }
  function getStatus () {
    const user = getCurrentUser()
    return Object.assign({ userId: user ? user.userId : '', username: user ? user.username : '', enabled: enabled(), loggedIn: isLoggedIn() }, status)
  }

  function loadSdk () {
    if (window.cloudbase || window.CloudBase || window.tcb) return Promise.resolve(window.cloudbase || window.CloudBase || window.tcb)
    return new Promise(function (resolve, reject) {
      const script = document.createElement('script')
      script.src = config().sdkUrl
      script.async = true
      script.onload = function () { resolve(window.cloudbase || window.CloudBase || window.tcb) }
      script.onerror = function () { reject(new Error('CloudBase SDK 加载失败')) }
      document.head.appendChild(script)
    })
  }

  // 云函数调用仍使用 CloudBase 的匿名访问凭证，但它不再代表游戏账号。
  async function signInAnonymously (auth) {
    if (typeof auth.signInAnonymously === 'function') {
      const result = await auth.signInAnonymously()
      if (result && result.error) throw result.error
      return
    }
    const authApi = auth && auth.oauthInstance && auth.oauthInstance.authApi
    if (!authApi || typeof authApi.signInAnonymously !== 'function') throw new Error('当前 CloudBase SDK 不支持匿名访问凭证')
    await authApi.signInAnonymously({})
    if (typeof auth.createLoginState === 'function') await auth.createLoginState()
  }

  async function initialize () {
    if (!enabled()) throw new Error('CloudBase 环境未配置')
    if (readyPromise) return readyPromise
    readyPromise = (async function () {
      const cloudbase = await loadSdk()
      if (!cloudbase || typeof cloudbase.init !== 'function') throw new Error('CloudBase SDK 初始化失败')
      app = cloudbase.init({ env: config().environmentId, region: config().region || 'ap-shanghai' })
      const auth = app.auth()
      if (!await auth.getLoginState()) await signInAnonymously(auth)
      return app
    })().catch(function (error) { readyPromise = null; throw error })
    return readyPromise
  }

  async function callAccountFunction (action, payload, requiresSession) {
    await initialize()
    const data = Object.assign({ action: action }, payload || {})
    if (requiresSession !== false) data.sessionToken = getSessionToken()
    const response = await app.callFunction({ name: config().accountFunctionName || 'gameAccount', data: data })
    const result = response && response.result
    if (!result || result.ok !== true) throw new Error((result && result.error) || '云端服务暂时不可用')
    return result
  }

  function saveLogin (result) {
    const user = result && result.currentUser
    if (!user || !user.userId || !user.username || !result.sessionToken) throw new Error('登录状态无效')
    window.localStorage.setItem(CURRENT_USER_KEY, JSON.stringify({ userId: user.userId, username: user.username }))
    window.localStorage.setItem(SESSION_KEY, result.sessionToken)
    emitStatus({ state: 'ready', message: '账号已登录，正在读取云存档', lastSavedAt: 0 })
  }

  function showPanel (id, show) {
    const panel = document.getElementById(id)
    if (panel) panel.hidden = !show
  }
  function setError (id, message) {
    const el = document.getElementById(id)
    if (el) el.textContent = message || ''
  }
  function normalizeUsername (value) { return String(value || '').trim().toLowerCase() }
  function validateUsername (username) {
    if (!/^[a-z0-9_]{3,24}$/i.test(username)) throw new Error('账号需为 3-24 位字母、数字或下划线')
  }
  function validatePassword (password) {
    if (String(password || '').length < 6) throw new Error('密码长度至少 6 位')
  }

  async function login (username, password) {
    username = normalizeUsername(username)
    validateUsername(username); validatePassword(password)
    const result = await callAccountFunction('login', { username: username, password: String(password || '') }, false)
    saveLogin(result)
    return result
  }
  async function register (username, password) {
    username = normalizeUsername(username)
    validateUsername(username); validatePassword(password)
    const result = await callAccountFunction('register', { username: username, password: String(password || '') }, false)
    saveLogin(result)
    return result
  }

  async function waitForLogin (legacySave) {
    if (legacySave && typeof legacySave === 'object') pendingLegacySave = clone(legacySave)
    if (isLoggedIn()) {
      emitStatus({ state: 'ready', message: '账号已登录，正在读取云存档' })
      return resolveMigration()
    }
    if (loginPromise) return loginPromise
    loginPromise = new Promise(function (resolve) {
      window.__resolveAccountLogin = resolve
      showPanel('account-panel', true)
    })
    return loginPromise.then(resolveMigration)
  }

  async function resolveMigration () {
    if (!pendingLegacySave || !Object.keys(pendingLegacySave).length) return getCurrentUser()
    return new Promise(function (resolve) {
      window.__resolveLegacyMigration = resolve
      setError('legacy-error', '')
      showPanel('legacy-migration-panel', true)
    })
  }

  async function migrateLegacySave () {
    if (!pendingLegacySave) return
    const result = await callAccountFunction('migrateSave', { saveData: clone(pendingLegacySave) })
    lastCloudSaveAt = Date.now()
    emitStatus({ state: 'synced', message: '游客存档已绑定到当前账号', lastSavedAt: Number(result.updateTimeMs) || Date.now() })
    try { window.localStorage.removeItem(LEGACY_BACKUP_KEY); window.localStorage.removeItem(LEGACY_SAVE_KEY) } catch (error) {}
    pendingLegacySave = null
  }

  async function loadGameFromCloud () {
    if (!isLoggedIn()) return { source: 'local', reason: 'notLoggedIn' }
    try {
      const result = await callAccountFunction('loadSave')
      const record = result.save || null
      if (!record || !record.saveData) {
        emitStatus({ state: 'ready', message: '云端暂无存档，将创建新存档' })
        return { source: 'local', shouldUpload: true }
      }
      const savedAt = Number(record.updateTimeMs) || isoToMs(record.updateTime)
      emitStatus({ state: 'synced', message: '已载入云存档', lastSavedAt: savedAt })
      // 登录账号后云端是唯一权威来源，避免另一账号留下的本地快照覆盖云端。
      return { source: 'cloud', saveData: record.saveData }
    } catch (error) {
      emitStatus({ state: 'error', message: '云端读取失败，继续使用本地缓存' })
      return { source: 'local', error: error }
    }
  }

  async function upload (data, options) {
    if (!isLoggedIn()) return false
    const saveData = clone(data)
    const result = await callAccountFunction('saveSave', { saveData: saveData })
    const savedAt = Number(result.updateTimeMs) || Number(saveData.updateTimeMs) || Date.now()
    lastCloudSaveAt = Date.now()
    emitStatus({ state: 'synced', message: options && options.reason === 'manual' ? '已保存到云端' : '云存档已同步', lastSavedAt: savedAt })
    return true
  }

  async function flush () {
    if (saveInFlight || !pendingData) return false
    saveInFlight = true
    const data = pendingData
    const options = pendingOptions || {}
    pendingData = null; pendingOptions = null
    try { return await upload(data, options) } catch (error) {
      emitStatus({ state: 'error', message: '云同步失败，当前进度仍保存在本地' })
      if (options.manual && window.platform) window.platform.showToast({ title: '云同步失败\n当前进度仍保存在本地' })
      return false
    } finally {
      saveInFlight = false
      if (pendingData) scheduleFlush(pendingOptions || {})
    }
  }
  function scheduleFlush (options) {
    if (!isLoggedIn()) return
    window.clearTimeout(saveTimer)
    const immediate = !!options.immediate || !!options.manual
    const delay = immediate ? 0 : Math.max(0, SYNC_INTERVAL - (Date.now() - lastCloudSaveAt))
    saveTimer = window.setTimeout(flush, delay)
  }
  function saveGameToCloud (data, options) {
    if (!isLoggedIn()) return
    pendingData = data; pendingOptions = Object.assign({}, pendingOptions || {}, options || {})
    scheduleFlush(pendingOptions)
  }
  async function saveNow (data) {
    pendingData = data; pendingOptions = { immediate: true, manual: true, reason: 'manual' }
    window.clearTimeout(saveTimer)
    return flush()
  }

  function logout () {
    window.clearTimeout(saveTimer)
    pendingData = null; pendingOptions = null; pendingLegacySave = getLegacySave()
    window.localStorage.removeItem(CURRENT_USER_KEY)
    window.localStorage.removeItem(SESSION_KEY)
    // 不把上一账号的本地缓存展示给下一账号；旧游客备份单独保留用于迁移。
    window.localStorage.removeItem(LEGACY_SAVE_KEY)
    emitStatus({ state: 'login', message: '请登录账号后开始游戏', lastSavedAt: 0 })
    window.location.reload()
  }

  function bindUi () {
    const loginTab = document.getElementById('account-tab-login')
    const registerTab = document.getElementById('account-tab-register')
    const loginForm = document.getElementById('account-login-form')
    const registerForm = document.getElementById('account-register-form')
    function changeTab (registerMode) {
      loginTab.classList.toggle('active', !registerMode); registerTab.classList.toggle('active', registerMode)
      loginForm.hidden = registerMode; registerForm.hidden = !registerMode; setError('account-error', '')
    }
    loginTab.addEventListener('click', function () { changeTab(false) })
    registerTab.addEventListener('click', function () { changeTab(true) })
    loginForm.addEventListener('submit', async function (event) {
      event.preventDefault(); setError('account-error', '')
      try {
        await login(document.getElementById('login-username').value, document.getElementById('login-password').value)
        showPanel('account-panel', false)
        const resolve = window.__resolveAccountLogin; window.__resolveAccountLogin = null; loginPromise = null
        if (resolve) resolve()
      } catch (error) { setError('account-error', error.message === '账号或密码错误' ? error.message : (error.message || '登录失败，请稍后重试')) }
    })
    registerForm.addEventListener('submit', async function (event) {
      event.preventDefault(); setError('account-error', '')
      const password = document.getElementById('register-password').value
      if (password !== document.getElementById('register-password-confirm').value) { setError('account-error', '两次输入的密码不一致'); return }
      try {
        await register(document.getElementById('register-username').value, password)
        showPanel('account-panel', false)
        const resolve = window.__resolveAccountLogin; window.__resolveAccountLogin = null; loginPromise = null
        if (resolve) resolve()
      } catch (error) { setError('account-error', error.message || '注册失败，请稍后重试') }
    })
    document.getElementById('legacy-migrate-button').addEventListener('click', async function () {
      setError('legacy-error', '')
      try { await migrateLegacySave(); showPanel('legacy-migration-panel', false); const resolve = window.__resolveLegacyMigration; window.__resolveLegacyMigration = null; if (resolve) resolve() } catch (error) { setError('legacy-error', error.message || '迁移失败，请稍后重试') }
    })
    document.getElementById('legacy-skip-button').addEventListener('click', function () {
      try { window.localStorage.setItem(LEGACY_BACKUP_KEY, JSON.stringify(pendingLegacySave)); window.localStorage.removeItem(LEGACY_SAVE_KEY) } catch (error) {}
      pendingLegacySave = null; showPanel('legacy-migration-panel', false)
      const resolve = window.__resolveLegacyMigration; window.__resolveLegacyMigration = null; if (resolve) resolve()
    })

    const panel = document.getElementById('cloud-save-panel')
    const account = document.getElementById('cloud-account-id')
    const sync = document.getElementById('cloud-sync-state')
    const time = document.getElementById('cloud-last-saved')
    function render () {
      const info = getStatus()
      account.textContent = info.username || '未登录'; sync.textContent = info.message
      time.textContent = info.lastSavedAt ? new Date(info.lastSavedAt).toLocaleString('zh-CN', { hour12: false }) : '尚未保存'
    }
    window.addEventListener('cloudsave:status', render)
    document.getElementById('cloud-save-close').addEventListener('click', function () { panel.hidden = true })
    document.getElementById('cloud-save-now').addEventListener('click', function () { if (window.getCurrentGameSave) saveNow(window.getCurrentGameSave()) })
    document.getElementById('cloud-reload-save').addEventListener('click', function () { if (window.reloadGameFromCloud) window.reloadGameFromCloud() })
    document.getElementById('cloud-logout').addEventListener('click', logout)
    window.openCloudSavePanel = function () { render(); panel.hidden = false }
  }

  window.CloudSaveManager = { getStatus: getStatus, getCurrentUser: getCurrentUser, isLoggedIn: isLoggedIn, initialize: initialize, waitForLogin: waitForLogin, loadGameFromCloud: loadGameFromCloud, saveGameToCloud: saveGameToCloud, saveNow: saveNow, logout: logout, hasLegacySave: hasLegacySave }
  document.addEventListener('DOMContentLoaded', bindUi)
})()
