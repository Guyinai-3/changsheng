// HTML5 平台接口：统一提供画布、输入、弹窗、生命周期和本地存储能力。
// 游戏数值、页面绘制和按钮逻辑仍全部保留在 game.js 中。
(function () {
  'use strict'

  const STORAGE_PREFIX = 'xiuxian_html5_'
  const GAME_SAVE_KEY = 'xiuxian_game_save'
  const canvas = document.getElementById('gameCanvas')
  const modalLayer = document.getElementById('modal-layer')
  const modalTitle = document.getElementById('modal-title')
  const modalContent = document.getElementById('modal-content')
  const modalInput = document.getElementById('modal-input')
  const modalOptions = document.getElementById('modal-options')
  const modalCancel = document.getElementById('modal-cancel')
  const modalConfirm = document.getElementById('modal-confirm')
  const toast = document.getElementById('toast')
  const memoryStorage = {}
  const lifecycle = { show: [], hide: [] }
  const touchListeners = { start: [], move: [], end: [] }
  const wheelListeners = []
  const resizeListeners = []
  const modalQueue = []
  let activeModal = null
  let toastTimer = null
  let pointerActive = false
  let pageVisible = !document.hidden
  let reportedCanvasSize = null
  let resizeTimer = null

  function getStorageName(key) {
    return STORAGE_PREFIX + key
  }

  function readStorage(key) {
    const storageName = getStorageName(key)
    let text = null
    try {
      text = window.localStorage.getItem(storageName)
    } catch (error) {
      text = memoryStorage[storageName] || null
    }
    if (!text) return null
    try {
      return JSON.parse(text)
    } catch (error) {
      return null
    }
  }

  function writeStorage(key, value) {
    const storageName = getStorageName(key)
    const text = JSON.stringify(value)
    memoryStorage[storageName] = text
    try {
      window.localStorage.setItem(storageName, text)
    } catch (error) {
      showToast('浏览器禁止本地存储，本次进度只能保留到关闭页面前')
    }
  }

  function getCanvasSize() {
    const rect = canvas.getBoundingClientRect()
    return {
      width: Math.max(320, Math.round(rect.width || window.innerWidth || 375)),
      height: Math.max(480, Math.round(rect.height || window.innerHeight || 667))
    }
  }

  function createTouchEvent(event) {
    const rect = canvas.getBoundingClientRect()
    return {
      touches: [{
        clientX: event.clientX - rect.left,
        clientY: event.clientY - rect.top
      }],
      changedTouches: [{
        clientX: event.clientX - rect.left,
        clientY: event.clientY - rect.top
      }]
    }
  }

  function dispatchTouch(type, event) {
    const gameEvent = createTouchEvent(event)
    touchListeners[type].forEach(function (listener) {
      listener(gameEvent)
    })
  }

  canvas.addEventListener('pointerdown', function (event) {
    if (event.button !== undefined && event.button !== 0) return
    pointerActive = true
    canvas.setPointerCapture && canvas.setPointerCapture(event.pointerId)
    event.preventDefault()
    dispatchTouch('start', event)
  })

  canvas.addEventListener('pointermove', function (event) {
    if (!pointerActive) return
    event.preventDefault()
    dispatchTouch('move', event)
  })

  function finishPointer(event) {
    if (!pointerActive) return
    pointerActive = false
    event.preventDefault()
    dispatchTouch('end', event)
  }

  canvas.addEventListener('pointerup', finishPointer)
  canvas.addEventListener('pointercancel', finishPointer)
  // 鼠标滚轮映射成统一事件，Canvas 页面可和手机手势共用滚动逻辑。
  canvas.addEventListener('wheel', function (event) {
    event.preventDefault()
    wheelListeners.forEach(function (listener) {
      listener({ deltaY: event.deltaY })
    })
  }, { passive: false })

  function showNextModal() {
    if (activeModal || !modalQueue.length) return
    activeModal = modalQueue.shift()
    const options = activeModal.options
    modalTitle.textContent = options.title || '提示'
    modalContent.textContent = options.content || ''
    modalInput.style.display = options.editable ? 'block' : 'none'
    modalInput.value = options.editable ? String(options.defaultText || '') : ''
    modalInput.placeholder = options.placeholderText || ''
    modalOptions.innerHTML = ''
    modalOptions.style.display = activeModal.actionSheet ? 'grid' : 'none'
    if (activeModal.actionSheet) {
      const items = Array.isArray(options.itemList) ? options.itemList : []
      items.forEach(function (text, index) {
        const button = document.createElement('button')
        button.type = 'button'
        button.textContent = text
        button.addEventListener('click', function () { closeActionSheet(index) })
        modalOptions.appendChild(button)
      })
    }
    modalConfirm.textContent = options.confirmText || '确定'
    modalCancel.textContent = options.cancelText || '取消'
    modalCancel.style.display = options.showCancel === false ? 'none' : ''
    modalConfirm.style.display = activeModal.actionSheet ? 'none' : ''
    modalCancel.textContent = activeModal.actionSheet ? '关闭' : (options.cancelText || '取消')
    modalLayer.classList.add('visible')
    if (options.editable) window.setTimeout(function () { modalInput.focus() }, 0)
  }

  function closeModal(confirmed) {
    if (!activeModal) return
    const current = activeModal
    activeModal = null
    modalLayer.classList.remove('visible')
    if (typeof current.options.success === 'function') {
      current.options.success({ confirm: confirmed, cancel: !confirmed, content: modalInput.value })
    }
    if (typeof current.options.complete === 'function') current.options.complete()
    window.setTimeout(showNextModal, 0)
  }

  function closeActionSheet(tapIndex) {
    if (!activeModal) return
    const current = activeModal
    activeModal = null
    modalLayer.classList.remove('visible')
    if (typeof current.options.success === 'function') current.options.success({ tapIndex: tapIndex })
    if (typeof current.options.complete === 'function') current.options.complete()
    window.setTimeout(showNextModal, 0)
  }

  function cancelActionSheet() {
    if (!activeModal) return
    const current = activeModal
    activeModal = null
    modalLayer.classList.remove('visible')
    if (typeof current.options.fail === 'function') current.options.fail({ errMsg:'showActionSheet:fail cancel' })
    if (typeof current.options.complete === 'function') current.options.complete()
    window.setTimeout(showNextModal, 0)
  }

  modalConfirm.addEventListener('click', function () { closeModal(true) })
  modalCancel.addEventListener('click', function () { if(activeModal&&activeModal.actionSheet)cancelActionSheet();else closeModal(false) })

  function showToast(title) {
    window.clearTimeout(toastTimer)
    toast.textContent = String(title || '')
    toast.classList.add('visible')
    toastTimer = window.setTimeout(function () {
      toast.classList.remove('visible')
    }, 2200)
  }

  function emitLifecycle(type) {
    lifecycle[type].forEach(function (listener) {
      try { listener() } catch (error) { window.setTimeout(function () { throw error }, 0) }
    })
  }

  document.addEventListener('visibilitychange', function () {
    const nextVisible = !document.hidden
    if (nextVisible === pageVisible) return
    pageVisible = nextVisible
    emitLifecycle(nextVisible ? 'show' : 'hide')
  })
  window.addEventListener('pagehide', function () {
    if (pageVisible) { pageVisible = false; emitLifecycle('hide') }
  })
  window.addEventListener('pageshow', function () {
    if (!pageVisible) { pageVisible = true; emitLifecycle('show') }
  })

  window.platform = {
    createCanvas: function () { return canvas },
    createImage: function () { return new Image() },
    getSystemInfoSync: function () {
      const size = getCanvasSize()
      reportedCanvasSize = size
      return {
        windowWidth: size.width,
        windowHeight: size.height,
        // 画布宽度会被最大容器限制；设备分类仍应使用真实浏览器窗口宽度。
        viewportWidth: Math.round(window.innerWidth || size.width),
        viewportHeight: Math.round(window.innerHeight || size.height),
        pixelRatio: Math.min(2, window.devicePixelRatio || 1),
        platform: /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) ? 'mobile-web' : 'desktop-web',
        safeArea: { top: 0, left: 0, right: size.width, bottom: size.height, width: size.width, height: size.height }
      }
    },
    getStorageSync: readStorage,
    setStorageSync: writeStorage,
    onTouchStart: function (listener) { touchListeners.start.push(listener) },
    onTouchMove: function (listener) { touchListeners.move.push(listener) },
    onTouchEnd: function (listener) { touchListeners.end.push(listener) },
    onWheel: function (listener) { wheelListeners.push(listener) },
    onResize: function (listener) { resizeListeners.push(listener) },
    onShow: function (listener) { lifecycle.show.push(listener) },
    onHide: function (listener) { lifecycle.hide.push(listener) },
    showToast: function (options) { showToast(options && options.title) },
    showModal: function (options) {
      modalQueue.push({ options: options || {} })
      showNextModal()
    },
    showActionSheet: function (options) {
      const actionOptions=options||{}
      modalQueue.push({
        actionSheet:true,
        options:{
          title:actionOptions.alertText||'请选择',
          content:'',
          itemList:Array.isArray(actionOptions.itemList)?actionOptions.itemList:[],
          success:actionOptions.success,
          fail:actionOptions.fail,
          complete:actionOptions.complete
        }
      })
      showNextModal()
    }
  }

  // 窗口变化时交给 game.js 重新计算比例并绘制，不再重载页面。
  window.addEventListener('resize', function () {
    window.clearTimeout(resizeTimer)
    resizeTimer = window.setTimeout(function () {
      if (!reportedCanvasSize) return
      const nextSize = getCanvasSize()
      // 即使最大宽度让画布尺寸不变，浏览器窗口宽度也可能跨过手机/平板/桌面断点。
      reportedCanvasSize = nextSize
      resizeListeners.forEach(function (listener) { listener(nextSize) })
    }, 250)
  })

  // 导出文件包含版本信息，真正的游戏存档仍保持原对象结构不变。
  document.getElementById('export-save-button').addEventListener('click', function () {
    const save = readStorage(GAME_SAVE_KEY)
    if (!save) { showToast('当前还没有可导出的存档'); return }
    const content = JSON.stringify({
      format: 'xiuxian-html5-save',
      version: 1,
      exportedAt: new Date().toISOString(),
      save: save
    }, null, 2)
    const blob = new Blob([content], { type: 'application/json;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = '问道长生存档-' + new Date().toISOString().slice(0, 10) + '.json'
    link.click()
    window.setTimeout(function () { URL.revokeObjectURL(link.href) }, 1000)
    showToast('存档已导出')
  })

  const fileInput = document.getElementById('save-file-input')
  document.getElementById('import-save-button').addEventListener('click', function () {
    fileInput.value = ''
    fileInput.click()
  })
  fileInput.addEventListener('change', function () {
    const file = fileInput.files && fileInput.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = function () {
      try {
        const parsed = JSON.parse(String(reader.result || ''))
        const save = parsed && parsed.format === 'xiuxian-html5-save' ? parsed.save : parsed
        if (!save || typeof save !== 'object' || Array.isArray(save)) throw new Error('invalid save')
        modalQueue.push({ options: {
          title: '导入存档',
          content: '导入会覆盖当前浏览器中的游戏进度，是否继续？',
          confirmText: '覆盖并载入',
          cancelText: '取消',
          success: function (result) {
            if (!result.confirm) return
            writeStorage(GAME_SAVE_KEY, save)
            window.location.reload()
          }
        } })
        showNextModal()
      } catch (error) {
        showToast('存档文件无法识别')
      }
    }
    reader.readAsText(file, 'UTF-8')
  })

  document.getElementById('save-help-button').addEventListener('click', function () {
    window.platform.showModal({
      title: '浏览器本机存档',
      content: '游戏会自动保存到当前浏览器的 localStorage。\n\n同一浏览器、同一网站地址再次打开会自动读取。清理浏览器网站数据会删除存档，建议定期使用“导出”备份。\n\n换电脑、换浏览器或换网址时，可通过“导出/导入”迁移进度。',
      showCancel: false,
      confirmText: '知道了'
    })
  })
})()
