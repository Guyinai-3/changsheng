'use strict'

// CloudBase 云函数：账号、密码哈希和存档读写的唯一安全入口。
// SESSION_SECRET 必须在云函数环境变量中设置为随机的 32 字符以上字符串。
const cloudbase = require('@cloudbase/node-sdk')
const crypto = require('crypto')

// 云函数运行时会自动注入短期凭证；显式传给 SDK，避免前端数据库权限影响服务端读写。
const app = cloudbase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV,
  secretId: process.env.TENCENTCLOUD_SECRETID,
  secretKey: process.env.TENCENTCLOUD_SECRETKEY,
  sessionToken: process.env.TENCENTCLOUD_SESSIONTOKEN
})
const db = app.database()
const USERS = 'users'
const SAVES = 'game_save'
const HASH_ITERATIONS = 120000
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

function now () { return new Date().toISOString() }
function fail (message) { const error = new Error(message); error.publicMessage = message; throw error }
function normalizeUsername (value) { return String(value || '').trim().toLowerCase() }
function validateUsername (username) {
  if (!/^[a-z0-9_]{3,24}$/i.test(username)) fail('账号需为 3-24 位字母、数字或下划线')
}
function validatePassword (password) {
  if (typeof password !== 'string' || password.length < 6 || password.length > 128) fail('密码长度需为 6-128 位')
}
function getSecret () {
  const secret = String(process.env.SESSION_SECRET || '')
  if (secret.length < 32) fail('账号服务尚未完成安全配置')
  return secret
}
function hashPassword (password, salt) {
  salt = salt || crypto.randomBytes(16).toString('hex')
  const digest = crypto.pbkdf2Sync(password, salt, HASH_ITERATIONS, 32, 'sha256').toString('hex')
  return 'pbkdf2$sha256$' + HASH_ITERATIONS + '$' + salt + '$' + digest
}
function verifyPassword (password, passwordHash) {
  const parts = String(passwordHash || '').split('$')
  if (parts.length !== 5 || parts[0] !== 'pbkdf2' || parts[1] !== 'sha256') return false
  const iterations = Number(parts[2])
  if (!Number.isInteger(iterations) || iterations < 100000 || iterations > 1000000) return false
  const actual = crypto.pbkdf2Sync(password, parts[3], iterations, 32, 'sha256').toString('hex')
  const expected = Buffer.from(parts[4], 'hex')
  const candidate = Buffer.from(actual, 'hex')
  return expected.length === candidate.length && crypto.timingSafeEqual(expected, candidate)
}
function base64url (value) { return Buffer.from(value).toString('base64url') }
function signSession (user) {
  const payload = base64url(JSON.stringify({ userId: user.userId, username: user.username, exp: Date.now() + SESSION_TTL_MS }))
  const signature = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url')
  return payload + '.' + signature
}
function verifySession (token) {
  const parts = String(token || '').split('.')
  if (parts.length !== 2) fail('登录已过期，请重新登录')
  const expected = crypto.createHmac('sha256', getSecret()).update(parts[0]).digest('base64url')
  const received = Buffer.from(parts[1])
  const expectedBuffer = Buffer.from(expected)
  if (received.length !== expectedBuffer.length || !crypto.timingSafeEqual(received, expectedBuffer)) fail('登录已过期，请重新登录')
  let payload
  try { payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')) } catch (error) { fail('登录已过期，请重新登录') }
  if (!payload || !payload.userId || !payload.username || Number(payload.exp) < Date.now()) fail('登录已过期，请重新登录')
  return payload
}
async function getUserByUsername (username) {
  const result = await db.collection(USERS).where({ username: username }).limit(1).get()
  return result.data && result.data[0] ? result.data[0] : null
}
async function getSave (userId) {
  const result = await db.collection(SAVES).doc(userId).get()
  if (Array.isArray(result.data)) return result.data[0] || null
  return result.data || null
}
function validateSaveData (saveData) {
  if (!saveData || typeof saveData !== 'object' || Array.isArray(saveData)) fail('存档数据无效')
  if (Buffer.byteLength(JSON.stringify(saveData), 'utf8') > 900 * 1024) fail('存档数据过大')
}
async function createUser (event) {
  const username = normalizeUsername(event.username)
  const password = String(event.password || '')
  validateUsername(username); validatePassword(password)
  if (await getUserByUsername(username)) fail('账号已存在')
  const userId = 'user_' + crypto.randomBytes(16).toString('hex')
  const createdAt = now()
  const user = { userId: userId, username: username, passwordHash: hashPassword(password), createTime: createdAt, lastLoginTime: createdAt }
  await db.collection(USERS).doc(userId).set({ data: user })
  await db.collection(SAVES).doc(userId).set({ data: { userId: userId, saveData: null, createTime: createdAt, updateTime: createdAt, updateTimeMs: Date.now() } })
  return { ok: true, currentUser: { userId: userId, username: username }, sessionToken: signSession(user) }
}
async function login (event) {
  const username = normalizeUsername(event.username)
  const password = String(event.password || '')
  validateUsername(username); validatePassword(password)
  const user = await getUserByUsername(username)
  if (!user || !verifyPassword(password, user.passwordHash)) fail('账号或密码错误')
  const loggedAt = now()
  await db.collection(USERS).doc(user.userId || user._id).update({ data: { lastLoginTime: loggedAt } })
  const currentUser = { userId: user.userId || user._id, username: user.username }
  return { ok: true, currentUser: currentUser, sessionToken: signSession(currentUser) }
}
async function loadSave (session) {
  return { ok: true, save: await getSave(session.userId) }
}
async function saveSave (event, session) {
  validateSaveData(event.saveData)
  const savedAt = now()
  const old = await getSave(session.userId)
  await db.collection(SAVES).doc(session.userId).set({ data: {
    userId: session.userId,
    saveData: event.saveData,
    createTime: (old && old.createTime) || savedAt,
    updateTime: savedAt,
    updateTimeMs: Date.now()
  } })
  return { ok: true, updateTime: savedAt, updateTimeMs: Date.now() }
}
async function migrateSave (event, session) {
  validateSaveData(event.saveData)
  const old = await getSave(session.userId)
  if (old && old.saveData) fail('当前账号已有云存档，请勿覆盖')
  return saveSave(event, session)
}

exports.main = async function (event) {
  try {
    switch (event && event.action) {
      case 'register': return await createUser(event)
      case 'login': return await login(event)
      case 'loadSave': return await loadSave(verifySession(event.sessionToken))
      case 'saveSave': return await saveSave(event, verifySession(event.sessionToken))
      case 'migrateSave': return await migrateSave(event, verifySession(event.sessionToken))
      default: fail('不支持的请求')
    }
  } catch (error) {
    console.error('gameAccount error:', error && error.message)
    return { ok: false, error: error && error.publicMessage ? error.publicMessage : '账号服务暂时不可用' }
  }
}
