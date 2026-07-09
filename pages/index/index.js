// pages/index/index.js

// 本地存档使用的名字。以后读取和保存都用同一个名字。
const SAVE_KEY = 'xiuxian_game_save'

// 境界表：数组下标也代表当前境界编号。
// cost 表示从这个境界突破到下一个境界所需的修为。
// chance 表示突破成功率；没有填写时，就代表必定成功。
const REALMS = [
  { name: '凡人', cost: 100 },
  { name: '炼气一层', cost: 500 },
  { name: '炼气二层', cost: 1000 },
  { name: '炼气三层', cost: 2000 },
  { name: '炼气四层', cost: 4000 },
  { name: '炼气五层', cost: 8000 },
  { name: '炼气六层', cost: 15000 },
  { name: '炼气七层', cost: 25000 },
  { name: '炼气八层', cost: 40000 },

  // 从炼气九层突破到筑基初期，成功率为 30%。
  { name: '炼气九层', cost: 60000, chance: 0.30 },

  { name: '筑基初期', cost: 120000 },
  { name: '筑基中期', cost: 250000 },

  // 从筑基后期突破到金丹初期，成功率为 10%。
  { name: '筑基后期', cost: 500000, chance: 0.10 },

  { name: '金丹初期', cost: 1000000 },
  { name: '金丹中期', cost: 2000000 },
  { name: '金丹后期', cost: 0 }
]

Page({
  // data 中的数据会显示在 WXML 页面上。
  data: {
    cultivation: 0,       // 当前修为
    clickPower: 1,        // 每次点击获得的修为
    autoPower: 0,         // 每秒自动获得的修为
    skillLevel: 1,        // 功法等级
    arrayLevel: 0,        // 聚灵阵等级
    realmIndex: 0,        // 当前境界在 REALMS 数组中的位置
    spiritStone: 0,       // 灵石数量
    pillCount: 0,         // 聚气丹数量
    pillBuffEndTime: 0,   // 聚气丹效果结束时间（时间戳）
    adventureCooldownEndTime: 0, // 历练冷却结束时间（时间戳）

    // 下面这些是根据等级计算出的页面显示数据。
    skillCost: 20,
    arrayCost: 50,
    realmName: '凡人',
    nextRealmName: '炼气一层',
    breakthroughCost: 100,
    breakthroughChanceText: '必定成功',
    hasNextRealm: true,
    effectiveClickPower: 1, // 算上丹药加成后的点击收益
    effectiveAutoPower: 0,  // 算上丹药加成后的自动收益
    pillRemainingSeconds: 0,
    adventureRemainingSeconds: 0,
    adventureLog: '山门外云雾缭绕，等待你前去探索。'
  },

  // 页面加载时执行一次。
  onLoad() {
    this.loadGame()
    this.refreshDisplayData()
    this.updateTimeDisplay()
  },

  // 每次小程序回到前台时，重新启动计时器。
  onShow() {
    this.startAutoCultivation()
  },

  // 页面被销毁时停止计时器，避免重复计时。
  onUnload() {
    clearInterval(this.autoTimer)
    this.saveGame()
  },

  // 小程序进入后台时保存游戏。
  onHide() {
    clearInterval(this.autoTimer)
    this.saveGame()
  },

  // 点击“修炼一次”。
  cultivateOnce() {
    const gain = this.getCultivationGain(this.data.clickPower)

    this.setData({
      cultivation: this.data.cultivation + gain
    })
    this.saveGame()
  },

  // 点击“升级功法”。
  upgradeSkill() {
    const cost = this.data.skillCost

    if (this.data.cultivation < cost) {
      wx.showToast({ title: '修为不足', icon: 'none' })
      return
    }

    this.setData({
      cultivation: this.data.cultivation - cost,
      skillLevel: this.data.skillLevel + 1,
      clickPower: this.data.clickPower + 1
    })

    this.refreshDisplayData()
    this.saveGame()
  },

  // 点击“升级聚灵阵”。
  upgradeArray() {
    const cost = this.data.arrayCost

    if (this.data.spiritStone < cost) {
      wx.showToast({ title: '灵石不足', icon: 'none' })
      return
    }

    this.setData({
      spiritStone: this.data.spiritStone - cost,
      arrayLevel: this.data.arrayLevel + 1,
      autoPower: this.data.autoPower + 1
    })

    this.refreshDisplayData()
    this.saveGame()
  },

  // 点击“突破境界”。
  breakthrough() {
    if (!this.data.hasNextRealm) {
      return
    }

    const cost = this.data.breakthroughCost

    if (this.data.cultivation < cost) {
      wx.showToast({ title: '修为不足，无法突破', icon: 'none' })
      return
    }

    const currentRealm = REALMS[this.data.realmIndex]
    const chance = currentRealm.chance || 1

    // Math.random() 会产生一个 0 到 1 之间的随机数。
    // 随机数大于成功率时，本次突破失败，当前修为清空。
    if (Math.random() >= chance) {
      this.setData({
        cultivation: 0
      })
      this.saveGame()

      wx.showModal({
        title: '突破失败',
        content: '冲击境界时灵力失控，当前修为已全部清空。',
        showCancel: false
      })
      return
    }

    this.setData({
      cultivation: this.data.cultivation - cost,
      realmIndex: this.data.realmIndex + 1
    })

    this.refreshDisplayData()
    this.saveGame()
    wx.showToast({ title: '突破成功', icon: 'success' })
  },

  // 外出历练：按照随机数所在的区间发放奖励。
  goAdventure() {
    const now = Date.now()

    // 冷却中点击按钮时，告诉玩家还要等待多久。
    if (now < this.data.adventureCooldownEndTime) {
      const seconds = Math.ceil(
        (this.data.adventureCooldownEndTime - now) / 1000
      )
      wx.showToast({
        title: '还需等待 ' + seconds + ' 秒',
        icon: 'none'
      })
      return
    }

    const random = Math.random()
    let stoneReward = 0
    let pillReward = 0
    let log = ''

    if (random < 0.70) {
      stoneReward = 30
      log = '你在山涧发现了一小袋灵石，获得灵石 30。'
    } else if (random < 0.90) {
      stoneReward = 80
      log = '你击退拦路妖兽，获得灵石 80。'
    } else if (random < 0.98) {
      pillReward = 1
      log = '你帮助了一位游方炼丹师，获得聚气丹 1 枚。'
    } else {
      stoneReward = 200
      pillReward = 1
      log = '你偶遇古修洞府，获得灵石 200 和聚气丹 1 枚！'
    }

    this.setData({
      spiritStone: this.data.spiritStone + stoneReward,
      pillCount: this.data.pillCount + pillReward,
      adventureCooldownEndTime: now + 60 * 1000,
      adventureRemainingSeconds: 60,
      adventureLog: log
    })

    this.saveGame()
  },

  // 使用聚气丹：接下来 60 秒，手动和自动修炼收益变为 1.5 倍。
  usePill() {
    if (this.data.pillCount <= 0) {
      wx.showToast({ title: '聚气丹数量不足', icon: 'none' })
      return
    }

    this.setData({
      pillCount: this.data.pillCount - 1,
      pillBuffEndTime: Date.now() + 60 * 1000,
      pillRemainingSeconds: 60
    })

    this.refreshPowerDisplay()
    this.saveGame()
    wx.showToast({ title: '聚气丹生效', icon: 'success' })
  },

  // 启动自动修炼：每 1 秒增加一次修为。
  startAutoCultivation() {
    // 先清除旧计时器，防止重复启动。
    clearInterval(this.autoTimer)
    this.updateTimeDisplay()

    this.autoTimer = setInterval(() => {
      this.updateTimeDisplay()

      if (this.data.autoPower > 0) {
        const gain = this.getCultivationGain(this.data.autoPower)

        this.setData({
          cultivation: this.data.cultivation + gain
        })
        this.saveGame()
      }
    }, 1000)
  },

  // 根据当前等级重新计算升级费用和境界文字。
  refreshDisplayData() {
    const currentRealm = REALMS[this.data.realmIndex]
    const hasNextRealm = this.data.realmIndex < REALMS.length - 1

    this.setData({
      // 功法费用：20、40、80、160……
      skillCost: 20 * Math.pow(2, this.data.skillLevel - 1),

      // 聚灵阵费用：50 × (当前等级 + 1)²。
      // 费用依次为 50、200、450、800……
      arrayCost: 50 * Math.pow(this.data.arrayLevel + 1, 2),

      realmName: currentRealm.name,
      nextRealmName: hasNextRealm
        ? REALMS[this.data.realmIndex + 1].name
        : '',
      breakthroughCost: currentRealm.cost,
      breakthroughChanceText: currentRealm.chance
        ? Math.round(currentRealm.chance * 100) + '%'
        : '必定成功',
      hasNextRealm: hasNextRealm
    })

    this.refreshPowerDisplay()
  },

  // 判断丹药是否生效，并计算实际修炼收益。
  getCultivationGain(basePower) {
    const pillIsActive = Date.now() < this.data.pillBuffEndTime
    return pillIsActive ? basePower * 1.5 : basePower
  },

  // 更新页面上显示的实际点击收益和自动收益。
  refreshPowerDisplay() {
    this.setData({
      effectiveClickPower: this.getCultivationGain(this.data.clickPower),
      effectiveAutoPower: this.getCultivationGain(this.data.autoPower)
    })
  },

  // 根据保存的结束时间，计算丹药和历练各自还剩多少秒。
  updateTimeDisplay() {
    const now = Date.now()
    const pillSeconds = Math.max(
      0,
      Math.ceil((this.data.pillBuffEndTime - now) / 1000)
    )
    const adventureSeconds = Math.max(
      0,
      Math.ceil((this.data.adventureCooldownEndTime - now) / 1000)
    )

    this.setData({
      pillRemainingSeconds: pillSeconds,
      adventureRemainingSeconds: adventureSeconds
    })
    this.refreshPowerDisplay()
  },

  // 把需要保存的数据写入微信本地存储。
  saveGame() {
    const saveData = {
      cultivation: this.data.cultivation,
      clickPower: this.data.clickPower,
      autoPower: this.data.autoPower,
      skillLevel: this.data.skillLevel,
      arrayLevel: this.data.arrayLevel,
      realmIndex: this.data.realmIndex,
      spiritStone: this.data.spiritStone,
      pillCount: this.data.pillCount,
      pillBuffEndTime: this.data.pillBuffEndTime,
      adventureCooldownEndTime: this.data.adventureCooldownEndTime,
      adventureLog: this.data.adventureLog
    }

    wx.setStorageSync(SAVE_KEY, saveData)
  },

  // 从微信本地存储读取存档。
  loadGame() {
    const saveData = wx.getStorageSync(SAVE_KEY)

    // 第一次打开时没有存档，直接使用 data 中的默认值。
    if (!saveData) {
      return
    }

    this.setData({
      cultivation: saveData.cultivation || 0,
      clickPower: saveData.clickPower || 1,
      autoPower: saveData.autoPower || 0,
      skillLevel: saveData.skillLevel || 1,
      arrayLevel: saveData.arrayLevel || 0,
      realmIndex: saveData.realmIndex || 0,
      spiritStone: saveData.spiritStone || 0,
      pillCount: saveData.pillCount || 0,
      pillBuffEndTime: saveData.pillBuffEndTime || 0,
      adventureCooldownEndTime: saveData.adventureCooldownEndTime || 0,
      adventureLog: saveData.adventureLog ||
        '山门外云雾缭绕，等待你前去探索。'
    })
  }
})
