// game.js
// HTML5 版本使用单个 Canvas 绘制全部界面。

const SAVE_KEY = 'xiuxian_game_save'

// 开发阶段开启GM测试入口；正式发布前必须改为 false。
const DEBUG_MODE = true

// 所有图片路径只在这里维护。以后增加素材时，只需要扩展这个配置。
const GAME_IMAGES = {
  backgrounds: {
    cultivate: 'images/bg_cultivate.jpg',
    sect: 'images/bg_sect.jpg',
    market: 'images/bg_sect.jpg', // 旧名称兼容：坊市现已并入宗门。
    rebirth: 'images/bg_rebirth.jpg',
    map_qingyun: 'images/bg_map_qingyun.jpg',
    map_heifeng: 'images/bg_map_heifeng.jpg',
    map_yaolin: 'images/bg_map_yaolin.jpg',
    map_dongfu: 'images/bg_map_dongfu.jpg',
    map_dimai: 'images/bg_map_dimai.jpg',
    map_youming: 'images/bg_map_youming.jpg',
    map_xukong: 'images/bg_map_xukong.jpg',
    map_taixu: 'images/bg_map_taixu.jpg'
  },
  characters: {
    sword_master: 'images/character_sword_master.png',
    alchemy_master: 'images/character_alchemy_master.png',
    elder_fire: 'images/character_alchemy_master.png',
    array_master: 'images/character_array_master.png',
    sect_master: 'images/character_sect_master.png'
  },
  monsters: {
    black_wolf: 'images/monster_black_wolf.png',
    flame_beast: 'images/monster_flame_beast.png',
    ice_fox: 'images/monster_ice_fox.png'
  }
}

// 加载成功的浏览器 Image 对象会按同样结构存入这里；加载失败则保留 null。
const gameAssets = {}

// 境界配置：
// cost 是从当前境界突破到下一境界需要的修为。
// cultivateRate 是当前境界的修炼倍率，basePower 是境界基础战斗力。
// 每个大境界的后期突破都有成功率；突破失败会进入重伤状态。
// 随着境界提升，修炼倍率、基础战力和突破需求都会明显提高。
const REALMS = [
  // 新手阶段只需 10 点修为即可踏入炼气期。
  { name: '凡人', cost: 10, cultivateRate: 1.0, basePower: 10 },

  { name: '炼气一层', cost: 300, cultivateRate: 1.2, basePower: 50 },
  { name: '炼气二层', cost: 800, cultivateRate: 1.4, basePower: 100 },
  { name: '炼气三层', cost: 1500, cultivateRate: 1.7, basePower: 180 },
  { name: '炼气四层', cost: 3000, cultivateRate: 2.1, basePower: 300 },
  { name: '炼气五层', cost: 6000, cultivateRate: 2.6, basePower: 500 },
  { name: '炼气六层', cost: 12000, cultivateRate: 3.2, basePower: 800 },
  { name: '炼气七层', cost: 22000, cultivateRate: 4.0, basePower: 1200 },
  { name: '炼气八层', cost: 38000, cultivateRate: 5.0, basePower: 1800 },
  { name: '炼气九层', cost: 60000, cultivateRate: 6.5, basePower: 2600, chance: 0.30, recommendBreakPower: 3000 },

  { name: '筑基初期', cost: 180000, cultivateRate: 10.0, basePower: 6000 },
  { name: '筑基中期', cost: 400000, cultivateRate: 13.0, basePower: 9000 },
  { name: '筑基后期', cost: 800000, cultivateRate: 17.0, basePower: 14000, chance: 0.10, recommendBreakPower: 20000 },

  { name: '金丹初期', cost: 3000000, cultivateRate: 30.0, basePower: 40000 },
  { name: '金丹中期', cost: 7000000, cultivateRate: 42.0, basePower: 65000 },
  { name: '金丹后期', cost: 15000000, cultivateRate: 58.0, basePower: 100000, chance: 0.05, recommendBreakPower: 150000 },

  { name: '元婴初期', cost: 50000000, cultivateRate: 90.0, basePower: 250000 },
  { name: '元婴中期', cost: 120000000, cultivateRate: 130.0, basePower: 420000 },
  { name: '元婴后期', cost: 300000000, cultivateRate: 180.0, basePower: 700000, chance: 0.03, recommendBreakPower: 1000000 },

  { name: '化神初期', cost: 1000000000, cultivateRate: 300.0, basePower: 1500000 },
  { name: '化神中期', cost: 2500000000, cultivateRate: 450.0, basePower: 2500000 },
  // 化神后期是当前版本最高境界，cost 为 0 代表不能继续突破。
  { name: '化神后期', cost: 0, cultivateRate: 700.0, basePower: 4000000 }
]

// 聚气丹是强力辅助资源：价格随大境界提升，本世最多持有 10 颗。
const MAX_GATHERING_PILLS = 10
const PILL_COST_BY_MAJOR_REALM = [100,500,5000,50000,500000,5000000]

const HEAL_COST_BY_MAJOR_REALM = [
  { light: 50, heavy: 150 },       // 凡人
  { light: 50, heavy: 150 },       // 炼气
  { light: 300, heavy: 900 },      // 筑基
  { light: 2000, heavy: 6000 },    // 金丹
  { light: 15000, heavy: 45000 },  // 元婴
  { light: 100000, heavy: 300000 } // 化神
]

const SPIRIT_ROOT_TYPES=[{id:'metal',name:'金灵根',color:'金'},{id:'wood',name:'木灵根',color:'木'},{id:'water',name:'水灵根',color:'水'},{id:'fire',name:'火灵根',color:'火'},{id:'earth',name:'土灵根',color:'土'}]
const TECHNIQUE_RANKS=['荒阶','洪阶','宙阶','宇阶','黄阶','玄阶','地阶','天阶']
const TECHNIQUE_EFFECT_RANGE={'荒阶':[.03,.05],'洪阶':[.05,.10],'宙阶':[.10,.20],'宇阶':[.20,.35],'黄阶':[.35,.50],'玄阶':[.50,.80],'地阶':[.80,1.20],'天阶':[1.20,2.00]}
const TECHNIQUE_NAMES={metal:['庚金诀','白虎机要','金阙真经'],wood:['青木诀','长春功','万木心经'],water:['玄水诀','沧澜诀','太阴真法'],fire:['赤炎诀','焚天诀','离火心经'],earth:['厚土诀','镇岳功','坤元真经']}
const TECHNIQUE_EFFECTS=[{type:'cultivation',name:'修炼增幅',range:[.1,.3]},{type:'breakthrough',name:'突破几率',range:[.01,.05]},{type:'adventureStone',name:'历练灵石',range:[.1,.5]},{type:'combat',name:'战斗力',range:[.1,.3]},{type:'pill',name:'丹药效果',range:[.1,.3]},{type:'injury',name:'受伤减少',range:[.1,.3]}]
// 宗门装备与藏经阁统一使用贡献点定价，前中期价格大幅降低。
const SECT_EQUIPMENT_COSTS={'洪阶':100,'荒阶':300,'宇阶':800,'宙阶':2000,'黄阶':5000,'玄阶':15000,'地阶':50000,'天阶':200000}
const SECT_TASK_REFRESH_INTERVAL = 2 * 60 * 60 * 1000
const SECT_TASK_TEMPLATES=[
  {type:'manual',name:'闭关修炼',description:'主动修炼500次',target:500,contribution:100,stone:5000},
  {type:'adventure',name:'清剿妖兽',description:'完成历练20次',target:20,contribution:150,stone:10000},
  {type:'boss',name:'斩妖任务',description:'击败任意妖兽Boss一次',target:1,contribution:300,stone:30000},
  {type:'collect',name:'上交灵材',description:'历练5次，收集玄铁矿×5',target:5,contribution:500,stone:0,material:1},
  {type:'realm',name:'境界精进',description:'本日突破一次境界',target:1,contribution:400,stone:20000}
]

// 宗门职位由基础战斗力自动决定，不会因为受伤临时下降。
const SECT_POSITIONS = [
  { name: '杂役弟子', needPower: 0, guardRewardRate: 1.0, breakthroughBonus: 0 },
  { name: '外门弟子', needPower: 100, guardRewardRate: 1.05, breakthroughBonus: 0 },
  { name: '内门弟子', needPower: 1000, guardRewardRate: 1.10, breakthroughBonus: 0 },
  { name: '核心弟子', needPower: 10000, guardRewardRate: 1.20, breakthroughBonus: 0.02 },
  { name: '执事', needPower: 100000, guardRewardRate: 1.35, breakthroughBonus: 0.04 },
  { name: '长老', needPower: 500000, guardRewardRate: 1.50, breakthroughBonus: 0.06 },
  { name: '太上长老', needPower: 2000000, guardRewardRate: 1.80, breakthroughBonus: 0.08 },
  { name: '宗门老祖', needPower: 5000000, guardRewardRate: 2.20, breakthroughBonus: 0.10 }
]

// 天赋品质由低到高：绿色 < 蓝色 < 紫色 < 金色。
const TALENT_QUALITIES = {
  green: { name: '绿色', level: 1, color: '#3fa45b' },
  blue: { name: '蓝色', level: 2, color: '#4f8edc' },
  purple: { name: '紫色', level: 3, color: '#9254c8' },
  gold: { name: '金色', level: 4, color: '#d89b24' }
}

// 每次轮回只会抽取一种类型的永久天赋，同类型只保留最高品质。
const TALENT_CONFIG = {
  green: {
    cultivation: { type: 'cultivation', name: '灵气亲和', value: 0.10, description: '修炼收益提高10%' },
    breakthrough: { type: 'breakthrough', name: '道心坚定', value: 0.01, description: '突破成功率提高1%' },
    adventure: { type: 'adventure', name: '寻灵有术', value: 0.10, description: '历练灵石收益提高10%' },
    combat: { type: 'combat', name: '天生神力', value: 0.10, description: '基础战斗力提高10%' }
  },
  blue: {
    cultivation: { type: 'cultivation', name: '先天道体', value: 0.25, description: '修炼收益提高25%' },
    breakthrough: { type: 'breakthrough', name: '天道眷顾', value: 0.03, description: '突破成功率提高3%' },
    adventure: { type: 'adventure', name: '福缘深厚', value: 0.25, description: '历练灵石收益提高25%' },
    combat: { type: 'combat', name: '剑骨天成', value: 0.25, description: '基础战斗力提高25%' }
  },
  purple: {
    cultivation: { type: 'cultivation', name: '混元灵体', value: 0.50, description: '修炼收益提高50%' },
    breakthrough: { type: 'breakthrough', name: '无垢道心', value: 0.06, description: '突破成功率提高6%' },
    adventure: { type: 'adventure', name: '气运加身', value: 0.50, description: '历练灵石收益提高50%' },
    combat: { type: 'combat', name: '先天剑体', value: 0.50, description: '基础战斗力提高50%' }
  },
  gold: {
    cultivation: { type: 'cultivation', name: '混沌道体', value: 1.00, description: '修炼收益提高100%' },
    breakthrough: { type: 'breakthrough', name: '天命之子', value: 0.10, description: '突破成功率提高10%' },
    adventure: { type: 'adventure', name: '大道垂青', value: 1.00, description: '历练灵石收益提高100%' },
    combat: { type: 'combat', name: '万法圣体', value: 1.00, description: '基础战斗力提高100%' }
  }
}

// 特殊天赋不分品质，直接改变本世的具体玩法规则。
const SPECIAL_TALENTS = [
  { id: 'tenfold_cultivation', name: '十连击', description: '主动点击修炼时有10%概率使本次修炼收益变为10倍。' },
  { id: 'next_realm_power', name: '越级挑战', description: '计算境界基础战力时，使用下一个境界的基础战力。' },
  { id: 'self_management', name: '自我管理', description: '无伤时每秒自动执行一次手动修炼。' },
  { id: 'accumulated_breakthrough', name: '厚积薄发', description: '概率突破失败后，下次成功率增加5%，最高增加20%，成功后清零。' },
  { id: 'stronger_after_injury', name: '破而后立', description: '伤势恢复后60秒内修炼收益提高50%。' },
  { id: 'stone_from_equipment', name: '点石成金', description: '弱装备自动分解时，获得的灵石翻倍。' },
  { id: 'blessed_mansion', name: '洞天福地', description: '镇守洞府产生的在线和离线灵石收益翻倍。' },
  { id: 'undying_body', name: '不灭之体', description: '所有轻伤和重伤的持续时间变为原来的20%。' },
  { id: 'pill_mastery', name: '丹道通玄', description: '聚气丹的持续时间由60秒延长至120秒。' },
  { id: 'double_breakthrough', name: '一步登天', description: '小境界突破成功时，有10%概率额外再提升一个小境界。' },
  { id: 'turn_danger_to_luck', name: '逢凶化吉', description: '历练造成的灵石和修为损失固定减少50%。' },
  { id: 'treasure_eye', name: '寻宝灵瞳', description: '装备掉落率增加10个百分点，并有20%概率将装备提升一个品阶。' },
  { id: 'battle_proves_dao', name: '杀伐证道', description: '越级挑战胜利奖励翻倍，但越级失败的资源损失提高50%。' },
  { id: 'defy_fate', name: '逆天改命', description: '大境界突破失败时，只损失50%的当前修为。' },
  { id: 'sudden_enlightenment', name: '一念顿悟', description: '每60秒获得一次顿悟，下一次主动修炼获得100倍收益。' },
  { id: 'perfect_cycle', name: '周天圆满', description: '每主动修炼10次，第10次固定获得5倍收益。' },
  { id: 'pill_resonance', name: '灵丹共鸣', description: '聚气丹生效期间，自动修炼收益额外提高50%。' },
  { id: 'grow_through_battle', name: '以战养战', description: '成功完成越级历练后，60秒内基础战斗力提高30%。' },
  { id: 'injured_cultivation', name: '带伤修行', description: '轻伤时仍可主动修炼，但收益只有正常状态的50%。' },
  { id: 'narrow_escape', name: '九死一生', description: '战力不足地图推荐战力40%时，历练成功率最低为15%，成功奖励提高至3倍。' },
  { id: 'fortune_in_disaster', name: '福祸相依', description: '历练后如果受到重伤，本次获得的装备必定提升一个品阶。' },
  { id: 'rebirth_mark', name: '轮回印记', description: '每次累计重生使修炼收益提高2%，没有上限。' },
  { id: 'mansion_resonance', name: '洞府共鸣', description: '洞府每提升10级，基础战斗力提高5%。' },
  { id: 'wealth_opens_heaven', name: '财可通神', description: '大境界突破前可以消耗灵石，购买最多10%的临时突破成功率。' },
  { id: 'sword_heart', name: '剑心通明', description: '武器提供的装备战斗力翻倍，历练灵石收益提高50%。' },
  { id: 'diamond_body', name: '金刚法身', description: '防具提供的装备战斗力翻倍，并使历练受伤概率降低20%。' },
  { id: 'void_step', name: '踏虚而行', description: '鞋子提供的装备战斗力翻倍，历练冷却时间缩短至10秒。' },
  { id: 'heavenly_accessory', name: '天机护主', description: '饰品提供的战斗力翻倍，并使装备提升品阶概率增加10个百分点。' },
  { id: 'forging_genius', name: '炼器奇才', description: '强化装备时提升20%战斗力，而不是原来的10%。' },
  { id: 'ascetic_path', name: '苦修之道', description: '自动修炼完全失效，但玩家主动修炼收益变为原来的10倍。' },
  { id: 'heavenly_root_rebirth', name: '天灵根转世', description: '下一世必定获得单灵根。' },
  { id: 'spirit_body_awakened', name: '灵体觉醒', description: '灵根修炼倍率额外提高50%。' }
]

// 装备品阶的战斗力范围。数组顺序也代表品阶由低到高的顺序。
const EQUIPMENT_RANKS = [
  { name: '荒阶', powerMin: 20, powerMax: 50 },
  { name: '洪阶', powerMin: 50, powerMax: 150 },
  { name: '宙阶', powerMin: 150, powerMax: 400 },
  { name: '宇阶', powerMin: 400, powerMax: 1000 },
  { name: '黄阶', powerMin: 1000, powerMax: 3000 },
  { name: '玄阶', powerMin: 3000, powerMax: 10000 },
  { name: '地阶', powerMin: 10000, powerMax: 50000 },
  { name: '天阶', powerMin: 50000, powerMax: 200000 }
]

const EQUIPMENT_SLOTS = [
  { id: 'weapon', name: '武器' },
  { id: 'armor', name: '防具' },
  { id: 'shoes', name: '鞋子' },
  { id: 'accessory', name: '饰品' }
]

// 每个部位按品阶顺序准备名称，新手可以很直观看到名称和品阶的对应关系。
const EQUIPMENT_NAMES = {
  weapon: ['旧铁剑', '玄铁剑', '青锋剑', '赤炎剑', '紫雷剑', '玄阴剑', '镇岳剑', '天罡剑'],
  armor: ['粗布道袍', '青云袍', '玄铁甲', '流云法袍', '金丝软甲', '灵纹法袍', '地煞护甲', '九霄仙衣'],
  shoes: ['草鞋', '追风靴', '踏云履', '流光靴', '御风靴', '玄影靴', '地行靴', '九霄步云履'],
  accessory: ['木质护符', '护身符', '聚灵玉佩', '辟邪珠', '乾坤戒', '玄灵玉', '地脉灵珠', '天心玉佩']
}

const SYSTEM_UNLOCK_MAJOR_REALM = { adventure:1,equipment:1,achievement:1,cultivationPath:2,sect:2,runTask:2,rebirth:2,mansion:3,equipmentEnhance:3,offlineCultivation:3,breakthroughPrayer:3,primordialSpirit:4,divineAbility:4,spiritTrial:4,law:5,tribulation:5 }
const DIVINE_ABILITIES = [
  {id:'soul_sword',name:'元神剑',description:'基础战斗力提高30%。'},{id:'spirit_gathering',name:'聚神诀',description:'自动修炼收益提高30%。'},{id:'instant_step',name:'瞬息千里',description:'历练冷却时间减少20%。'},{id:'soul_protection',name:'元神护体',description:'历练受伤概率降低20%。'},
  {id:'divine_insight',name:'神识通明',description:'装备掉落率增加5个百分点。'},{id:'soul_alchemy',name:'元神炼丹',description:'使用聚气丹时有20%概率不消耗。'},{id:'void_storage',name:'虚空纳物',description:'装备分解灵石收益提高50%。'},{id:'soul_recovery',name:'神魂自愈',description:'受伤持续时间降低30%。'},
  {id:'spirit_breakthrough',name:'元神破境',description:'大境界突破成功率提高5%。'},{id:'battle_soul',name:'战魂不灭',description:'Boss挑战时战斗力提高40%。'},{id:'soul_enlightenment',name:'神游太虚',description:'随机事件奖励提高50%。'},{id:'spirit_clone',name:'元神化身',description:'自我管理模拟修炼收益提高100%。'}
]
const LAW_CONFIG = [{id:'life',name:'生命法则',description:'降低受伤概率和受伤时间。'},{id:'destruction',name:'毁灭法则',description:'提高战斗力和Boss奖励。'},{id:'space',name:'空间法则',description:'降低历练、Boss和试炼冷却。'},{id:'time',name:'时间法则',description:'提高自动和离线修炼。'},{id:'fortune',name:'气运法则',description:'提高装备掉落和事件奖励。'}]

// 地图影响历练收益、风险、装备掉落，以及当前地图可挑战的妖兽。
const ADVENTURE_MAPS = [
  { id: 'qingyun', name: '青云山外围', recommendRealm: '炼气一层 - 炼气三层', recommendPower: 80, rewardMultiplier: 1, description: '适合初入仙途的修士历练。', dropRankWeights: [{ rank: '荒阶', weight: 75 }, { rank: '洪阶', weight: 25 }], boss: { name: '山魈', power: 150, stoneReward: 300, pillChance: 0.10, equipmentChance: 0.20 } },
  { id: 'heifeng', name: '黑风岭', recommendRealm: '炼气四层 - 炼气六层', recommendPower: 500, rewardMultiplier: 1.5, description: '妖兽出没，适合炼气中期修士。', dropRankWeights: [{ rank: '洪阶', weight: 70 }, { rank: '宙阶', weight: 30 }], boss: { name: '黑风狼王', power: 800, stoneReward: 1200, pillChance: 0.15, equipmentChance: 0.25 } },
  { id: 'yaolin', name: '迷雾妖林', recommendRealm: '炼气七层 - 炼气九层', recommendPower: 1800, rewardMultiplier: 2, description: '雾气弥漫，深处常有高阶妖兽。', dropRankWeights: [{ rank: '宙阶', weight: 70 }, { rank: '宇阶', weight: 30 }], boss: { name: '雾隐妖蟒', power: 3000, stoneReward: 5000, pillChance: 0.20, equipmentChance: 0.30 } },
  { id: 'dongfu', name: '古修洞府', recommendRealm: '筑基初期 - 筑基后期', recommendPower: 8000, rewardMultiplier: 3, description: '古修士遗留洞府，机缘与危机并存。', dropRankWeights: [{ rank: '宇阶', weight: 60 }, { rank: '黄阶', weight: 30 }, { rank: '玄阶', weight: 10 }], boss: { name: '洞府傀儡', power: 15000, stoneReward: 20000, pillChance: 0.25, equipmentChance: 0.35 } },
  { id: 'dimai', name: '地脉秘境', recommendRealm: '金丹初期 - 金丹后期', recommendPower: 50000, rewardMultiplier: 5, description: '地脉灵气汇聚之地，适合金丹修士探索。', dropRankWeights: [{ rank: '黄阶', weight: 50 }, { rank: '玄阶', weight: 35 }, { rank: '地阶', weight: 15 }], boss: { name: '地脉妖王', power: 100000, stoneReward: 100000, pillChance: 0.30, equipmentChance: 0.40 } },
  { id: 'youming', name: '幽冥古战场', recommendRealm: '元婴初期 - 元婴后期', recommendPower: 350000, rewardMultiplier: 8, description: '上古大战遗迹，残留无数凶煞之气。', dropRankWeights: [{ rank: '玄阶', weight: 50 }, { rank: '地阶', weight: 35 }, { rank: '天阶', weight: 15 }], boss: { name: '幽冥战魂', power: 600000, stoneReward: 500000, pillChance: 0.35, equipmentChance: 0.45 } },
  { id: 'xukong', name: '天外虚空', recommendRealm: '化神初期 - 化神中期', recommendPower: 1200000, rewardMultiplier: 12, description: '虚空乱流纵横，唯有化神强者方可踏足。', dropRankWeights: [{ rank: '地阶', weight: 70 }, { rank: '天阶', weight: 30 }], boss: { name: '虚空魔影', power: 2000000, stoneReward: 2000000, pillChance: 0.40, equipmentChance: 0.50 } },
  { id: 'taixu', name: '太虚神墟', recommendRealm: '化神后期', recommendPower: 3000000, rewardMultiplier: 20, description: '传闻中的神墟遗迹，埋藏着天阶至宝。', dropRankWeights: [{ rank: '天阶', weight: 100 }], boss: { name: '太虚古灵', power: 5000000, stoneReward: 8000000, pillChance: 0.50, equipmentChance: 0.80 } }
]

const CULTIVATION_PATHS = [
  { id: 'sword', name: '剑修', description: '主动修炼与战斗更强。', unlockMajorRealm: 2 },
  { id: 'alchemy', name: '丹修', description: '丹药、购买与疗伤更强。', unlockMajorRealm: 2 },
  { id: 'formation', name: '阵修', description: '自动修炼与洞府更强。', unlockMajorRealm: 2 }
]

const REBIRTH_BLESSINGS = [
  { id:'stone_bag', name:'灵石袋', cost:1, description:'下一世开局获得500灵石。' }, { id:'pill_gourd', name:'丹药葫芦', cost:1, description:'下一世开局获得3枚聚气丹。' }, { id:'cultivation_infusion', name:'修为灌顶', cost:2, description:'下一世开局获得500修为。' }, { id:'equipment_blessing', name:'法器赐福', cost:3, description:'下一世开局获得一件洪阶随机装备。' }, { id:'mansion_inheritance', name:'洞府传承', cost:3, description:'洞府额外保留原等级的10%。' }, { id:'array_inheritance', name:'聚灵传承', cost:3, description:'聚灵阵至少从3级开始。' }, { id:'skill_inheritance', name:'功法传承', cost:3, description:'功法至少从3级开始。' }
]
const REBIRTH_BACKGROUNDS = [
  {id:'wanderer',name:'普通凡人',cost:0,rarity:'普通',description:'无额外效果，凭自身道心踏上仙途。'},
  {id:'cultivation_family',name:'修仙世家',cost:3,rarity:'稀有',description:'初始灵石 +500；首次获得的功法品质提高一档。'},
  {id:'sword_family',name:'剑修世家',cost:4,rarity:'稀有',description:'初始功法更偏向金系剑诀；武器战斗力 +10%。'},
  {id:'alchemy_family',name:'丹道世家',cost:4,rarity:'稀有',description:'聚气丹持续时间 +20%；购买聚气丹价格 -20%。'},
  {id:'array_family',name:'阵法世家',cost:4,rarity:'稀有',description:'聚灵阵升级费用 -20%；洞府修炼效果 +10%。'},
  {id:'ancient_heritage',name:'上古传承',cost:8,rarity:'传承',description:'初始功法额外获得一个随机词条；突破成功率 +3%。'}
]
const REBIRTH_FORTUNES = [
  {id:'great_luck',name:'天命之子',rarity:'天命',description:'突破成功率 +5%，随机事件奖励 +30%，高品质装备概率提升。'},
  {id:'pill_fortune',name:'丹运昌隆',rarity:'稀有',description:'聚气丹持续时间 +20%，丹药相关机缘更容易出现。'},
  {id:'battle_fortune',name:'战意沸腾',rarity:'稀有',description:'当前战斗力 +15%，挑战妖兽时更有优势。'},
  {id:'envied_genius',name:'天妒英才',rarity:'传承',description:'修炼收益 +35%，但突破成功率 -5%。'},
  {id:'late_bloomer',name:'大器晚成',rarity:'稀有',description:'筑基前修炼收益 -10%，筑基后修炼收益 +30%。'},
  {id:'wealth_fortune',name:'财运亨通',rarity:'稀有',description:'历练与事件获得的灵石 +25%。'},
  {id:'hard_fate',name:'命途多舛',rarity:'普通',description:'受伤概率提高，但修炼收益 +20%。'}
]
const DESTINY_EVENTS = [{id:'mysterious_master',name:'神秘师尊',cost:5},{id:'ancient_ruins',name:'上古遗迹',cost:5},{id:'destined_rival',name:'宿敌降临',cost:4},{id:'tribulation_change',name:'天劫异变',cost:4},{id:'immortal_gathering',name:'仙缘大会',cost:6}]
const LOG_TYPE_STYLES = { adventure:{label:'历练',color:'#456b78'}, equipment:{label:'装备',color:'#7a5b27'}, breakthrough:{label:'突破',color:'#8b4513'}, injury:{label:'伤势',color:'#8b3a3a'}, rebirth:{label:'轮回',color:'#72549a'}, talent:{label:'天赋',color:'#9254c8'}, mansion:{label:'洞府',color:'#526d5b'}, boss:{label:'妖兽',color:'#9a3f32'}, event:{label:'机缘',color:'#9a5d20'}, system:{label:'见闻',color:'#737a70'} }

// 本轮任务从模板中随机抽取，奖励按简单、中等、困难三档配置。
const RUN_TASK_TEMPLATES = [
  ['cultivate_click_100','manual_click','勤修不辍','本轮主动修炼100次',100,'easy'], ['cultivate_click_500','manual_click','苦修之人','本轮主动修炼500次',500,'medium'],
  ['adventure_20','adventure_count','行走四方','本轮完成20次历练',20,'easy'], ['adventure_100','adventure_count','踏遍山河','本轮完成100次历练',100,'medium'],
  ['boss_win_3','boss_win','斩妖除魔','本轮击败3次妖兽Boss',3,'medium'], ['boss_first_clear_2','boss_first_clear','首战扬名','本轮首次击败2个不同Boss',2,'medium'],
  ['reach_foundation','reach_realm','筑基有成','本轮达到筑基初期','筑基初期','easy'], ['reach_core','reach_realm','金丹大道','本轮达到金丹初期','金丹初期','hard'],
  ['mansion_10','mansion_level','安身立命','本轮洞府达到10级',10,'easy'], ['mansion_25','mansion_level','洞天初成','本轮洞府达到25级',25,'medium'],
  ['equipment_yellow','equipment_rank','法器有灵','本轮获得黄阶或更高装备','黄阶','medium'], ['equipment_heaven','equipment_rank','天阶至宝','本轮获得一件天阶装备','天阶','hard'],
  ['overlevel_win_5','overlevel_win','越阶而战','本轮越级历练成功5次',5,'medium'], ['random_event_5','random_event','机缘不断','本轮完成5次随机事件',5,'easy'],
  ['no_pill_foundation','challenge','清净筑基','本轮不使用聚气丹达到筑基期','筑基初期','medium']
]

const ACHIEVEMENTS = [
  ['first_foundation','realm','初窥仙途','首次达到筑基初期',{ spiritStone:1000, rebirthPoint:1 }], ['first_core','realm','金丹大道','首次达到金丹初期',{ spiritStone:10000, rebirthPoint:2 }], ['first_nascent','realm','元婴出世','首次达到元婴初期',{ spiritStone:100000, rebirthPoint:3 }], ['first_deity','realm','化神之境','首次达到化神初期',{ spiritStone:1000000, rebirthPoint:5 }],
  ['rebirth_1','rebirth','初入轮回','完成1次重生',{ rebirthPoint:1 }], ['rebirth_10','rebirth','十世修行','完成10次重生',{ rebirthPoint:5 }], ['rebirth_50','rebirth','百世道心','完成50次重生',{ rebirthPoint:20 }],
  ['click_1000','cultivation','勤能补拙','累计主动修炼1000次',{ spiritStone:1000 }], ['click_10000','cultivation','水滴石穿','累计主动修炼10000次',{ spiritStone:10000, rebirthPoint:2 }],
  ['adventure_100','adventure','初涉江湖','累计完成100次历练',{ spiritStone:2000 }], ['adventure_1000','adventure','踏遍九州','累计完成1000次历练',{ spiritStone:20000, rebirthPoint:3 }],
  ['boss_win_10','boss','斩妖十次','累计击败10次Boss',{ spiritStone:3000 }], ['boss_win_100','boss','妖王克星','累计击败100次Boss',{ spiritStone:50000, rebirthPoint:5 }], ['all_boss_first_clear','boss','横扫八荒','首次击败全部地图Boss',{ spiritStone:500000, rebirthPoint:10 }],
  ['first_yellow_equipment','equipment','黄阶法器','首次获得黄阶装备',{ spiritStone:5000 }], ['first_earth_equipment','equipment','地阶重宝','首次获得地阶装备',{ spiritStone:50000, rebirthPoint:2 }], ['first_heaven_equipment','equipment','天阶至宝','首次获得天阶装备',{ spiritStone:500000, rebirthPoint:5 }],
  ['mansion_10','mansion','洞府初成','洞府首次达到10级',{ spiritStone:3000 }], ['mansion_50','mansion','洞天福地','洞府首次达到50级',{ spiritStone:100000, rebirthPoint:5 }],
  ['special_talent_10','talent','天赋异禀','累计获得过10种不同特殊天赋',{ rebirthPoint:3 }], ['special_talent_all','talent','天命汇聚','累计获得过全部30种特殊天赋',{ rebirthPoint:20 }],
  ['random_event_50','event','机缘深厚','累计完成50次随机事件',{ spiritStone:20000, rebirthPoint:2 }], ['overlevel_50','adventure','逆境争锋','累计越级历练成功50次',{ spiritStone:30000, rebirthPoint:3 }], ['single_gain_million','cultivation','一朝顿悟','单次主动修炼获得100万修为',{ spiritStone:100000, rebirthPoint:5 }]
]

const RANDOM_EVENTS = [
  ['broken_alchemy_furnace','残破丹炉','你发现一座仍有余温的残破丹炉。',['投入灵石','alchemy_furnace_invest'],['拆解丹炉','alchemy_furnace_dismantle'],['直接离开','leave']],
  ['injured_cultivator','受伤修士','一名受伤修士倒在路旁。',['花费灵石救治','help_cultivator'],['搜寻储物袋','loot_cultivator'],['绕路离开','leave']],
  ['ancient_stele','上古石碑','残破石碑刻着晦涩功法。',['参悟石碑','study_stele'],['强行拓印','copy_stele'],['离开','leave']],
  ['spirit_spring','灵泉','前方出现灵气浓郁的泉水。',['静坐修炼','cultivate_at_spring'],['收集泉水','collect_spring']],
  ['mysterious_merchant','神秘商人','神秘商人展示来历不明的物品。',['购买随机装备','buy_random_equipment'],['购买聚气丹','buy_discount_pill'],['拒绝交易','leave']],
  ['sealed_cave','封印洞窟','古老阵法封锁了洞窟入口。',['战力破阵','break_cave_by_power'],['灵石破解','break_cave_by_stone'],['放弃','leave']],
  ['heavenly_thunder','天雷淬体','一道天雷即将落下。',['接受天雷','accept_thunder'],['躲避','leave']],
  ['spirit_beast_cub','灵兽幼崽','一只灵兽幼崽躲在岩石后。',['丹药喂养','feed_spirit_beast'],['驱赶','drive_spirit_beast'],['离开','leave']],
  ['cultivator_duel','同道切磋','同境修士向你提出切磋。',['接受切磋','accept_duel'],['支付请教','pay_for_guidance'],['拒绝','leave']],
  ['lost_storage_bag','遗失储物袋','草丛中露出一个无人认领的储物袋。',['直接打开','open_storage_bag'],['谨慎检查','inspect_storage_bag']],
  ['demonic_whisper','心魔低语','识海中传来诱惑的低语。',['接受力量','accept_demonic_power'],['坚守道心','resist_demon']],
  ['sect_mission','宗门委托','宗门传讯，请你协助处理妖兽。',['接受委托','accept_sect_mission'],['拒绝','leave']]
]

// 游戏的所有存档数据集中放在这里，方便新手查找和修改。
const gameData = {
  cultivation: 0,
  clickPower: 10,
  autoPower: 0,
  skillLevel: 1,
  // 灵根和功法均为本世数据；skillLevel 保留用于旧存档兼容。
  spiritRoots: [],
  currentTechnique: null,
  techniqueCollection: [],
  discoveredTechniques: {},
  lastTechniqueRewardPositionIndex: 0,
  // 宗门本世数据；贡献、任务和声望都会在轮回时重新开始。
  sect: { joined:true, contribution:0, dailyTasks:[], completedTasks:0, shopRefreshTime:0, sectLevel:1, sectFavor:0, lastTaskRefreshDate:'', shopEquipmentStock:[], secretCooldownEndTime:0, forgeMaterials:0 },
  // 每两小时刷新一次5个宗门任务；时间戳独立保存，关闭游戏也不会重置。
  sectTaskRefreshTime: 0,
  sectContribution: 0,
  totalSectContribution: 0,
  highestSectPositionIndex: 0,
  sectAchievements: {},
  arrayLevel: 0,
  realmIndex: 0,
  spiritStone: 0,
  pillCount: 0,
  pillBuffEndTime: 0,
  adventureCooldownEndTime: 0,
  // 受伤状态和结束时间使用时间戳保存，关闭页面后倒计时也不会重置。
  injuryStatus: 'none',
  injuryEndTime: 0,
  equipmentSlots: {
    weapon: null,
    armor: null,
    shoes: null,
    accessory: null
  },
  selectedMapId: 'qingyun',
  // 洞府会持续积累镇守灵石收益，三个字段都会保存到本地存档。
  mansionLevel: 1,
  guardStoneProgress: 0,
  lastGuardRewardTime: Date.now(),
  // 所有在线、后台与离线收益都从这一个时间点计算，避免浏览器限速漏算收益。
  lastUpdateTime: Date.now(),
  // 所有地图 Boss 共用一个挑战冷却；首通状态用于区分首通和重复奖励。
  bossCooldownEndTime: 0,
  bossDefeated: {
    qingyun: false,
    heifeng: false,
    yaolin: false,
    dongfu: false,
    dimai: false,
    youming: false,
    xukong: false,
    taixu: false
  },
  // 先保留成就、任务和长期统计的数据结构，后续可直接扩展页面与奖励。
  achievements: {},
  runTasks: [],
  lifetimeStats: {
    totalCultivationClicks: 0,
    totalAdventures: 0,
    totalBossWins: 0,
    totalRebirths: 0,
    highestSingleCultivationGain: 0,
    highestCombatPower: 0,
    totalRandomEvents: 0,
    eventChoicesMade: 0
  },
  cultivationPath: null,
  pendingEventId: null,
  rebirthPoints: 0,
  // 可用轮回点可消费；累计轮回点只增不减，用于永久修炼加成。
  totalRebirthPoints: 0,
  // 各大系统首次解锁提示的记录。
  systemUnlockNotices: { qi:false, foundation:false, core:false, nascent:false, deity:false },
  primordialSpirit: { level:1, exp:0, breakthroughCount:0, trialLevel:0, equippedAbilityIds:[], trialCooldownEndTime:0 },
  discoveredDivineAbilities: {},
  lawSystem: { selectedLawId:null, lawLevels:{life:0,destruction:0,space:0,time:0,fortune:0}, lawFragments:0, tribulationLevel:0, tribulationCooldownEndTime:0 },
  nextLifePreparation: { backgroundId:'wanderer', blessingIds:[], lockedRegularTalentType:null, specialTalentChoiceCount:1, extraInheritedSpecialTalentId:null, fortuneMode:'random', fortuneId:null, destinyEventId:null },
  // 已扣费但尚未选完特殊天赋时，必须保存这两个字段，避免退出后丢失流程。
  pendingSpecialTalentChoices: [],
  pendingRebirthPreparation: null,
  hasShownRebirthPrepareGuide: false,
  currentLifeBackgroundId: 'wanderer', currentLifeFortuneId: null, currentLifeDestinyEventId: null, destinyEventTriggered: false,
  runStats: { manualClicks:0, adventures:0, bossWins:0, bossFirstClears:0, overlevelWins:0, randomEvents:0, pillsUsed:0, highestEquipmentRankIndex:-1 },
  runEquipmentChanceBonus: 0,
  runCultivationBonus: 0,
  runBreakthroughPenalty: 0,
  discoveredSpecialTalents: {},
  // 以下三项是轮回后仍保留的永久数据。
  rebirthCount: 0,
  highestRealmIndex: 0,
  talents: {
    cultivation: null,
    breakthrough: null,
    adventure: null,
    combat: null
  },
  // 特殊天赋只在本世有效，下一世最多继承其中一个。
  specialTalents: [],
  selectedInheritedSpecialTalentId: null,
  failedBreakthroughBonus: 0,
  postInjuryBuffEndTime: 0,
  manualCultivationCount: 0,
  nextEnlightenmentTime: 0,
  enlightenmentReady: false,
  battleBuffEndTime: 0,
  temporaryBreakthroughBonus: 0,
  // adventureLog 保留给旧存档兼容；新的见闻统一存进 adventureLogs。
  adventureLog: '山门外云雾缭绕，等待你前去探索。',
  adventureLogs: ['山门外云雾缭绕，等待你前去探索。'],
  // 记录已经播放过的关键剧情，避免每次进入页面都重复弹出。
  unlockedImages: {}
}

// 创建主画布并按照设备像素比提高清晰度。
const canvas = platform.createCanvas()
const context = canvas.getContext('2d')
const systemInfo = platform.getSystemInfoSync()
const screenWidth = systemInfo.windowWidth
const screenHeight = systemInfo.windowHeight
const pixelRatio = systemInfo.pixelRatio || 1
const safeAreaTop = systemInfo.safeArea ? systemInfo.safeArea.top : 0

canvas.width = screenWidth * pixelRatio
canvas.height = screenHeight * pixelRatio
context.scale(pixelRatio, pixelRatio)

// 使用 375 像素作为设计稿宽度，不同手机会整体等比例缩放。
const DESIGN_WIDTH = 375
const scale = screenWidth / DESIGN_WIDTH
const viewHeight = screenHeight / scale
// iPhone 刘海屏顶部有安全区，标题如果画得太靠上会被挡住。
// 这里把安全区换算成设计稿坐标，然后给整个游戏界面一个向下偏移。
// 减去 16 是因为标题本身有字体高度，不需要把整个安全区完整空出来。
const safeTopOffset = Math.max(0, Math.ceil(safeAreaTop / scale - 16))
const buttons = []
let gameTimer = null
// 页面状态不存档，重新打开游戏时始终从修炼页开始。
let currentPage = 'cultivate'
let adventureLogScrollY = 0
let adventureLogContentHeight = 0
let adventureLogViewportHeight = 0
let logTouchStartY = 0
let logTouchLastY = 0
let isTouchingLog = false
let logTouchMoved = false
let mapPage = 0
let currentRandomEvent = null
let goalsTab = 'tasks'
let sectPage = 'home'
let cultivationSystemTab = 'mansion'
// 以下都是页面临时状态，不写入存档。
let isPreparingRebirth = false
let rebirthPreparationSubmitting = false
let rebirthConfirmOpen = false
let rebirthPrepareTab = 'origin'
let rebirthPrepareScrollY = 0
let rebirthPrepareContentHeight = 0
let rebirthPrepareViewportHeight = 0
let isTouchingRebirthPrepareContent = false
let rebirthPrepareTouchLastY = 0
let rebirthPageScrollY = 0
let rebirthPageContentHeight = 0
let rebirthPageViewportHeight = 0
let isTouchingRebirthPageContent = false
let rebirthPageTouchLastY = 0
let longPressTimer = null
let touchStartButton = null
let touchStartX = 0
let touchStartY = 0
let touchMoved = false
let longPressTriggered = false
const LONG_PRESS_DURATION = 500
let CURRENT_SCENE = 'cultivate'
let activeStoryDialog = null
let imagesReady = false
// GM数据只在当前运行内有效。开启GM会暂停写入正式存档，刷新即可恢复原进度。
let gmSessionActive = false
let gmTitleTapCount = 0
let gmTitleLastTapTime = 0
const gmUnlockedSystems = {}

// 统一加载全部图片。任何一张加载失败都只会回退为文字模式，不会阻止游戏启动。
function loadGameImages(onComplete) {
  const targetsByPath = {}
  Object.keys(GAME_IMAGES).forEach(function (groupName) {
    gameAssets[groupName] = {}
    Object.keys(GAME_IMAGES[groupName]).forEach(function (assetName) {
      const path = GAME_IMAGES[groupName][assetName]
      if (!targetsByPath[path]) targetsByPath[path] = []
      targetsByPath[path].push({ groupName: groupName, assetName: assetName })
    })
  })
  const paths = Object.keys(targetsByPath)
  if (!paths.length) { imagesReady = true; onComplete(); return }
  let finished = 0
  const finishOne = function () {
    finished += 1
    if (finished >= paths.length) { imagesReady = true; onComplete() }
  }
  paths.forEach(function (path) {
    let image = null
    try {
      image = typeof platform.createImage === 'function'
        ? platform.createImage()
        : (typeof canvas.createImage === 'function' ? canvas.createImage() : null)
    } catch (error) {
      image = null
    }
    const assignToTargets = function (loadedImage) {
      targetsByPath[path].forEach(function (target) {
        gameAssets[target.groupName][target.assetName] = loadedImage
      })
    }
    if (!image) { assignToTargets(null); finishOne(); return }
    let settled = false
    const settle = function (loadedImage) {
      if (settled) return
      settled = true
      clearTimeout(timeoutId)
      assignToTargets(loadedImage)
      finishOne()
    }
    const timeoutId = setTimeout(function () { settle(null) }, 5000)
    image.onload = function () { settle(image) }
    image.onerror = function () { settle(null) }
    image.src = path
  })
}

function drawAssetLoadingScreen() {
  context.setTransform(pixelRatio * scale, 0, 0, pixelRatio * scale, 0, 0)
  context.fillStyle = '#f3efe4'
  context.fillRect(0, 0, DESIGN_WIDTH, viewHeight)
  context.fillStyle = '#263238'
  context.font = 'bold 22px sans-serif'
  context.textAlign = 'center'
  context.fillText('问道长生', DESIGN_WIDTH / 2, 180)
  context.font = 'normal 13px sans-serif'
  context.fillStyle = '#7a7467'
  context.fillText('正在载入仙途画卷…', DESIGN_WIDTH / 2, 214)
}

function getGameAsset(groupName, assetName) {
  return gameAssets[groupName] ? gameAssets[groupName][assetName] || null : null
}

function getGameAssetByPath(path) {
  const groups = Object.keys(GAME_IMAGES)
  for (let i = 0; i < groups.length; i++) {
    const names = Object.keys(GAME_IMAGES[groups[i]])
    for (let j = 0; j < names.length; j++) {
      if (GAME_IMAGES[groups[i]][names[j]] === path) return getGameAsset(groups[i], names[j])
    }
  }
  return null
}

function getCurrentScene() {
  if (currentPage === 'sect') return 'sect'
  if (currentPage === 'map') return 'map_' + gameData.selectedMapId
  if (currentPage === 'rebirth' || currentPage === 'rebirth_prepare' || currentPage === 'special_talent_choice') return 'rebirth'
  return 'cultivate'
}

loadGame()
drawAssetLoadingScreen()
loadGameImages(function () {
  drawGame()
  startTimer()
})

// 页面回到前台时，根据保存的结束时间继续显示倒计时。
platform.onShow(function () {
  if (refreshInjuryStatus()) {
    saveGame()
  }
  // 前后台只从这一处结算，避免 loadGame 与 onShow 重复发放同一段离线收益。
  const offlineResult = settleOfflineRewards()
  // 离线期间计时照常流逝，回到前台时只在到期后生成一批新装备。
  saveGame()
  showOfflineSettlementModal(offlineResult)
  startTimer()
  drawGame()
})

platform.onHide(function () {
  calculateOfflineProgress(false)
  clearInterval(gameTimer)
  // 退出前记录时间，下一次进入时从这里开始按真实经过时间补算。
  gameData.lastUpdateTime = Date.now()
  gameData.lastGuardRewardTime = gameData.lastUpdateTime
  saveGame()
})

// 监听玩家触摸，判断触摸点落在哪一个按钮内。
platform.onTouchStart(function (event) {
  const touch = event.touches[0]
  const x = touch.clientX / scale
  // 画面整体向下移动了 safeTopOffset，点击判断也要扣掉这个偏移。
  const y = touch.clientY / scale - safeTopOffset

  // 开发模式下连续点击标题5次打开GM工具；生产模式不会进入这里。
  if (DEBUG_MODE && x >= 82 && x <= 293 && y >= 4 && y <= 50) {
    if (registerGmTitleTap()) return
  }

  // 修炼页的见闻区域可上下滑动，先拦截这块区域的触摸。
  if (!activeStoryDialog && isInAdventureLogArea(x, y)) {
    logTouchStartY = y
    logTouchLastY = y
    logTouchMoved = false
    isTouchingLog = true
    return
  }

  if (!activeStoryDialog && isInRebirthPrepareContentArea(x, y)) {
    isTouchingRebirthPrepareContent = true
    rebirthPrepareTouchLastY = y
  }

  if (!activeStoryDialog && isInRebirthPageContentArea(x, y)) {
    isTouchingRebirthPageContent = true
    rebirthPageTouchLastY = y
  }

  for (let i = 0; i < buttons.length; i++) {
    const button = buttons[i]
    const inside =
      x >= button.x &&
      x <= button.x + button.width &&
      y >= button.y &&
      y <= button.y + button.height

    if (inside) {
      touchStartButton = button
      touchStartX = x
      touchStartY = y
      touchMoved = false
      longPressTriggered = false
      clearTimeout(longPressTimer)
      if (button.onLongPress) {
        longPressTimer = setTimeout(function () {
          if (touchStartButton === button && !touchMoved) {
            longPressTriggered = true
            button.onLongPress()
          }
        }, LONG_PRESS_DURATION)
      }
      break
    }
  }
})

platform.onTouchMove(function (event) {
  const y = event.touches[0].clientY / scale - safeTopOffset
  const x = event.touches[0].clientX / scale
  if (touchStartButton && Math.hypot(x - touchStartX, y - touchStartY) > 10) {
    touchMoved = true
    clearTimeout(longPressTimer)
  }
  if (isTouchingLog) {
    if (Math.abs(y - logTouchStartY) > 5) logTouchMoved = true
    adventureLogScrollY -= y - logTouchLastY
    clampAdventureLogScroll(); logTouchLastY = y; drawGame(); return
  }
  if (isTouchingRebirthPrepareContent) {
    rebirthPrepareScrollY -= y - rebirthPrepareTouchLastY
    clampRebirthPrepareScroll()
    rebirthPrepareTouchLastY = y
    drawGame()
  }
  if (isTouchingRebirthPageContent) {
    rebirthPageScrollY -= y - rebirthPageTouchLastY
    clampRebirthPageScroll()
    rebirthPageTouchLastY = y
    drawGame()
  }
})

platform.onTouchEnd(function () {
  clearTimeout(longPressTimer)
  if (isTouchingLog) { isTouchingLog = false; clampAdventureLogScroll(); drawGame() }
  if (isTouchingRebirthPrepareContent) { isTouchingRebirthPrepareContent = false; clampRebirthPrepareScroll(); drawGame() }
  if (isTouchingRebirthPageContent) { isTouchingRebirthPageContent = false; clampRebirthPageScroll(); drawGame() }
  if (touchStartButton && !touchMoved && !longPressTriggered) touchStartButton.onTap()
  touchStartButton = null; touchMoved = false; longPressTriggered = false
})

// 定时器只刷新界面；收益按真实经过时间计算，浏览器后台限速也不会漏算。
function startTimer() {
  clearInterval(gameTimer)

  gameTimer = setInterval(function () {
    const progress = calculateOfflineProgress(false)
    const injuryRecovered = refreshInjuryStatus()
    let needSave = injuryRecovered || progress.cultivationGain > 0 || progress.stoneGain > 0
    // 一念顿悟每 60 秒积累一次；准备好后暂停计时，等待玩家主动使用。
    if (hasSpecialTalent('sudden_enlightenment')) {
      if (!gameData.nextEnlightenmentTime) {
        gameData.nextEnlightenmentTime = Date.now() + 60 * 1000
      } else if (!gameData.enlightenmentReady && Date.now() >= gameData.nextEnlightenmentTime) {
        gameData.enlightenmentReady = true
        needSave = true
      }
    }

    if (checkSectTechniqueReward()) needSave = true

    if (needSave) {
      saveGame()
    }
    drawGame()
  }, 1000)
}

// 按“铺满并裁切”的方式绘制背景，避免不同屏幕比例出现拉伸。
function drawImageCover(image, x, y, width, height) {
  if (!image || !image.width || !image.height) return false
  const sourceRate = image.width / image.height
  const targetRate = width / height
  let sx = 0, sy = 0, sw = image.width, sh = image.height
  if (sourceRate > targetRate) { sw = image.height * targetRate; sx = (image.width - sw) / 2 }
  else { sh = image.width / targetRate; sy = (image.height - sh) / 2 }
  context.drawImage(image, sx, sy, sw, sh, x, y, width, height)
  return true
}

// 人物和妖兽使用“完整显示”方式，不裁掉头发、武器或尾巴。
function drawImageContain(image, x, y, width, height) {
  if (!image || !image.width || !image.height) return false
  const rate = Math.min(width / image.width, height / image.height)
  const drawWidth = image.width * rate
  const drawHeight = image.height * rate
  context.drawImage(image, x + (width-drawWidth)/2, y + (height-drawHeight)/2, drawWidth, drawHeight)
  return true
}

function drawCurrentSceneBackground() {
  if (CURRENT_SCENE.indexOf('map_') === 0) return
  const image = getGameAsset('backgrounds', CURRENT_SCENE)
  if (!image) return
  context.save()
  context.globalAlpha = 0.22
  drawImageCover(image, 0, 0, DESIGN_WIDTH, viewHeight)
  context.restore()
}

// 剧情弹窗是Canvas最上层：先清空旧按钮，再绘制立绘、半透明框、文字和新按钮。
function showStoryDialog(options) {
  const config = options || {}
  if (config.unlockKey && gameData.unlockedImages[config.unlockKey]) return false
  if (config.unlockKey) {
    gameData.unlockedImages[config.unlockKey] = true
    saveGame()
  }
  activeStoryDialog = {
    image: typeof config.image === 'string' ? getGameAssetByPath(config.image) : config.image,
    imageMode: config.imageMode || 'contain',
    title: config.title || '仙途见闻',
    text: config.text || '',
    buttons: Array.isArray(config.buttons) && config.buttons.length
      ? config.buttons.slice(0, 3)
      : [{ text: '继续', action: function () {} }]
  }
  drawGame()
  return true
}

function closeStoryDialog() {
  activeStoryDialog = null
  drawGame()
}

function drawStoryDialog() {
  if (!activeStoryDialog) return
  buttons.length = 0
  context.fillStyle = 'rgba(10,15,20,0.72)'
  context.fillRect(0, 0, DESIGN_WIDTH, viewHeight)
  if (activeStoryDialog.image) {
    if (activeStoryDialog.imageMode === 'cover') drawImageCover(activeStoryDialog.image, 24, 68, 327, 205)
    else drawImageContain(activeStoryDialog.image, 34, 58, 307, 230)
  }
  const panelTop = 258
  const panelBottom = getNavigationY() - 18
  drawRoundedRect(18, panelTop, 339, panelBottom-panelTop, 12, 'rgba(255,253,247,0.96)', '#c7bda8')
  drawCenteredText(activeStoryDialog.title, panelTop+30, 19, '#8b4513', 'bold')
  drawWrappedText(activeStoryDialog.text, 38, panelTop+58, 299, 19, 13, '#37474f')
  const dialogButtons = activeStoryDialog.buttons
  const gap = 8
  const buttonWidth = (319-gap*(dialogButtons.length-1))/dialogButtons.length
  const buttonY = panelBottom-48
  dialogButtons.forEach(function (item, index) {
    drawButton(28+index*(buttonWidth+gap), buttonY, buttonWidth, 36, item.text || '继续', item.color || '#526d5b', function () {
      const action = item.action
      activeStoryDialog = null
      if (typeof action === 'function') action()
      else drawGame()
    })
  })
}

function getTechniqueStoryCharacter(element) {
  if (element === 'fire') return { image: GAME_IMAGES.characters.elder_fire, title: '赤炎长老' }
  if (element === 'metal') return { image: GAME_IMAGES.characters.sword_master, title: '剑峰峰主' }
  if (element === 'earth') return { image: GAME_IMAGES.characters.array_master, title: '阵峰峰主' }
  return { image: GAME_IMAGES.characters.sect_master, title: '青云宗主' }
}

function getBossStoryImage(mapId) {
  if (mapId === 'heifeng') return GAME_IMAGES.monsters.black_wolf
  if (mapId === 'yaolin') return GAME_IMAGES.monsters.ice_fox
  if (mapId === 'dimai') return GAME_IMAGES.monsters.flame_beast
  return null
}

// 绘制整个游戏界面。
function drawGame() {
  // 所有绘制都使用设计稿坐标，最后统一缩放到手机屏幕。
  context.save()
  context.setTransform(
    pixelRatio * scale,
    0,
    0,
    pixelRatio * scale,
    0,
    0
  )

  context.fillStyle = '#f3efe4'
  context.fillRect(0, 0, DESIGN_WIDTH, viewHeight)
  buttons.length = 0

  // 顶部避开 iPhone 刘海和状态栏安全区。
  context.translate(0, safeTopOffset)

  CURRENT_SCENE = getCurrentScene()
  drawCurrentSceneBackground()

  drawCenteredText('问道长生', 28, 28, '#263238', 'bold')
  drawCenteredText(getPageSubtitle(), 52, 13, '#7a7467')
  if (DEBUG_MODE && gmSessionActive) drawText('GM TEST', 310, 24, 10, '#b3261e', 'bold')

  if (currentPage === 'cultivate') {
    drawStatusCard()
    drawActionButtons()
    drawAdventureLog()
  } else if (currentPage === 'equipment') {
    drawEquipmentPage()
  } else if (currentPage === 'sect') {
    if(isSystemUnlocked('sect'))drawSectPage()
    else drawLockedSystemCard('宗门系统','筑基期解锁','筑基后可加入青云宗，完成每日任务并使用贡献兑换功法、装备和丹药。')
  } else if (currentPage === 'rebirth') {
    drawRebirthPage()
  } else if (currentPage === 'event') {
    drawRandomEventPage()
  } else if (currentPage === 'goals') {
    drawGoalsPage()
  } else if (currentPage === 'rebirth_prepare') {
    drawRebirthPreparePage()
  } else if (currentPage === 'special_talent_choice') {
    drawSpecialTalentChoicePage()
  } else if (currentPage === 'technique') {
    drawTechniquePage()
  } else {
    drawMapPage()
  }
  // 轮回准备和候选天赋页是连续流程，不能从底部导航意外跳走。
  if (currentPage !== 'rebirth_prepare' && currentPage !== 'special_talent_choice' && currentPage !== 'technique') drawPageNavigation()
  drawStoryDialog()

  context.restore()
}

function drawStatusCard() {
  drawRoundedRect(14, 68, 347, 252, 10, '#fffdf7', '#ded7c8')

  const realm = REALMS[gameData.realmIndex]
  const hasNextRealm = gameData.realmIndex < REALMS.length - 1
  const nextRealm = hasNextRealm ? REALMS[gameData.realmIndex + 1] : null
  // 状态栏的“每次修炼”对应玩家真实点击，因此会显示苦修之道的 10 倍收益。
  const clickGain = getManualCultivationGain(gameData.clickPower, true)
  const autoGain = getAutoCultivationGain(gameData.autoPower)
  const pillSeconds = getRemainingSeconds(gameData.pillBuffEndTime)
  const injurySeconds = getRemainingSeconds(gameData.injuryEndTime)
  const adventureSeconds = getRemainingSeconds(
    gameData.adventureCooldownEndTime
  )
  const position = getSectPosition()

  drawCenteredText('当前境界：' + realm.name, 90, 20, '#8b4513', 'bold')

  drawLabelValue('当前修为', formatNumber(gameData.cultivation), 116)
  drawLabelValue('灵石 / 聚气丹', gameData.spiritStone + ' / ' + gameData.pillCount, 136)
  drawLabelValue('每次 / 每秒修炼', '+' + clickGain + ' / +' + autoGain, 156)
  drawText('当前功法', 28, 176, 14, '#2f3542')
  drawSingleLineText(getTechniqueDisplayName(), 104, 176, 132, 13, '#9a5d20')
  drawButton(250, 164, 96, 24, '功法详情', '#526d5b', function () { currentPage='technique'; drawGame() })
  drawLabelValue('灵根 / 功法等级', getSpiritRootText() + ' / ' + gameData.currentTechnique.level, 196)
  drawLabelValue(
    '战斗力',
    formatNumber(getCombatPower()) + ' / ' + formatNumber(getBaseCombatPower()),
    216
  )

  drawLabelValue('洞府 / 职位', gameData.mansionLevel + '级 / ' + position.name, 236)
  drawLabelValue('镇守收益', getGuardStonePerSecond().toFixed(2) + ' 灵石/秒', 256)
  const injuryText = gameData.injuryStatus === 'none'
    ? '状态：无伤'
    : '状态：' + getInjuryName() + '，剩余 ' + injurySeconds + ' 秒'
  const cooldownText = adventureSeconds > 0 ? '冷却 ' + adventureSeconds + ' 秒' : '可出发'
  drawText(injuryText + '  历练：' + cooldownText, 28, 276, 12, gameData.injuryStatus === 'none' ? '#625c50' : '#8b3a3a')
  const nextRealmY = hasSpecialTalent('ascetic_path') ? 316 : 298
  if (hasSpecialTalent('ascetic_path')) {
    drawText('自动修炼：已被苦修之道封印  主动修炼：x10', 28, 294, 12, '#8b3a3a')
  }

  if (hasNextRealm) {
    const chanceText = realm.chance
      ? Math.round(getBreakthroughChance(realm) * 100) + '%'
      : '必成'
    drawText(
      '下境：' + nextRealm.name + '  需 ' + realm.cost + ' 修为  成功率 ' + chanceText,
      28,
      nextRealmY,
      12,
      '#8b3a3a'
    )
  } else {
    drawText('已达到当前版本最高境界', 28, nextRealmY, 12, '#9a5d20')
  }
}

function drawActionButtons() {
  const left = 14
  const right = 191
  const width = 170
  const height = 48
  const firstY = 338
  const gap = 56

  // 受伤时不显示修炼一次，改成疗伤按钮。
  if (gameData.injuryStatus === 'none') {
    drawButton(left, firstY, width, height, '修炼一次', '#9a5d20', cultivateOnce)
  } else if (gameData.injuryStatus === 'light' && hasSpecialTalent('injured_cultivation')) {
    drawButton(left, firstY, width, height, '带伤修炼（收益50%）', '#9a5d20', cultivateOnce)
  } else {
    drawButton(left, firstY, width, height, '疗伤（减少 1 秒）', '#8b3a3a', healInjury)
  }
  drawButton(right, firstY, width, height, '使用聚气丹', '#8b6b35', usePill)

  drawButton(
    left,
    firstY + gap,
    width,
    height,
    '参悟功法  ' + formatNumber(getSkillCost()) + '修为',
    '#526d5b',
    upgradeSkill,
    showCurrentTechniqueDetail
  )
  drawButton(
    right,
    firstY + gap,
    width,
    height,
    '升级聚灵阵  ' + formatNumber(getArrayCost()) + '灵石',
    '#526d5b',
    upgradeArray
  )

  drawButton(
    left,
    firstY + gap * 2,
    width,
    height,
    '外出历练',
    '#456b78',
    goAdventure
  )
  drawButton(
    right,
    firstY + gap * 2,
    width,
    height,
    '突破境界',
    '#8b3a3a',
    breakthrough
  )
}

function getAdventureLogRect() { const y=510,bottom=getNavigationY()-8;return {x:14,y:y,width:347,height:Math.max(80,bottom-y)} }
function wrapTextLines(text,maxWidth,fontSize,fontWeight){const lines=[],content=String(text||'');let line='';context.save();context.font=(fontWeight||'normal')+' '+fontSize+'px sans-serif';for(let i=0;i<content.length;i++){const test=line+content[i];if(context.measureText(test).width>maxWidth&&line){lines.push(line);line=content[i]}else line=test}if(line)lines.push(line);context.restore();return lines.length?lines:['']}
function getAdventureLogItemLayout(log,width){const lineHeight=18,tagWidth=42,lines=wrapTextLines(log.text,width-tagWidth-14,12,'normal');return {lines:lines,lineHeight:lineHeight,tagWidth:tagWidth,height:Math.max(42,14+lines.length*lineHeight+12)}}
function drawCenteredTextInRect(text,x,y,w,h,size,color,weight){context.save();context.font=(weight||'normal')+' '+size+'px sans-serif';context.fillStyle=color;context.textAlign='center';context.textBaseline='middle';context.fillText(text,x+w/2,y+h/2);context.restore()}
function drawAdventureLogItem(log,x,y,w,layout){const style=LOG_TYPE_STYLES[log.type]||LOG_TYPE_STYLES.system;drawRoundedRect(x,y,w,layout.height,7,'#f8f4e9','#e5ddcf');drawRoundedRect(x+7,y+9,layout.tagWidth-8,22,5,style.color,style.color);drawCenteredTextInRect(style.label,x+7,y+9,layout.tagWidth-8,22,11,'#fff','bold');for(let i=0;i<layout.lines.length;i++)drawText(layout.lines[i],x+layout.tagWidth+8,y+18+i*layout.lineHeight,12,'#514c43')}
function getAdventureLogMaxScroll(){return Math.max(0,adventureLogContentHeight-adventureLogViewportHeight)}
function clampAdventureLogScroll(){adventureLogScrollY=Math.max(0,Math.min(Number(adventureLogScrollY)||0,getAdventureLogMaxScroll()))}
function drawAdventureLog() {
  const rect=getAdventureLogRect(),header=34,padding=8,gap=6;drawRoundedRect(rect.x,rect.y,rect.width,rect.height,10,'#fffdf7','#ded7c8');drawText('修仙见闻',rect.x+13,rect.y+22,15,'#37474f','bold');drawText(gameData.adventureLogs.length+' 条',rect.x+rect.width-45,rect.y+22,11,'#8a857a');const vx=rect.x+padding,vy=rect.y+header,vw=rect.width-padding*2,vh=rect.height-header-padding;adventureLogViewportHeight=vh;let total=0;gameData.adventureLogs.forEach(log=>{total+=getAdventureLogItemLayout(log,vw).height+gap});adventureLogContentHeight=Math.max(0,total-gap);clampAdventureLogScroll();context.save();context.beginPath();context.rect(vx,vy,vw,vh);context.clip();let y=vy-adventureLogScrollY;gameData.adventureLogs.forEach(log=>{const l=getAdventureLogItemLayout(log,vw);if(y+l.height>=vy&&y<=vy+vh)drawAdventureLogItem(log,vx,y,vw,l);y+=l.height+gap});context.restore();if(!gameData.adventureLogs.length)drawText('暂无新的修仙见闻',vx+10,vy+25,12,'#8a857a')
}

function isInAdventureLogArea(x, y) {
  if (currentPage !== 'cultivate') {
    return false
  }
  const rect=getAdventureLogRect()
  return x>=rect.x&&x<=rect.x+rect.width&&y>=rect.y&&y<=rect.y+rect.height
}

function isInRebirthPrepareContentArea(x,y) {
  return currentPage === 'rebirth_prepare' && x >= 14 && x <= 361 && y >= 188 && y <= getNavigationY() - 106
}
function isInRebirthPageContentArea(x,y) {
  // 重生页和特殊天赋选择页都可能比一屏更长，复用同一套滚动状态。
  return (currentPage === 'rebirth' || currentPage === 'special_talent_choice') && x >= 14 && x <= 361 && y >= 68 && y <= getNavigationY() - 8
}
function clampRebirthPrepareScroll() {
  const max=Math.max(0,rebirthPrepareContentHeight-rebirthPrepareViewportHeight)
  rebirthPrepareScrollY=Math.max(0,Math.min(rebirthPrepareScrollY,max))
}
function clampRebirthPageScroll() {
  const max = Math.max(0, rebirthPageContentHeight - rebirthPageViewportHeight)
  rebirthPageScrollY = Math.max(0, Math.min(rebirthPageScrollY, max))
}
function showOptionDetail(title,description,cost,extraText) {
  let content=String(description||'')
  if(typeof cost==='number')content+='\n\n轮回点消耗：'+cost
  if(extraText)content+='\n\n'+extraText
  platform.showModal({title:title,content:content,showCancel:false,confirmText:'知道了'})
}

// 下一世准备页的所有选择统一走这个详情弹窗，长按500毫秒即可查看。
function showSelectionDetail(item,cost,extraText) {
  const rarity=item&&item.rarity?'品质：'+item.rarity+'\n\n':''
  showOptionDetail(item&&item.name?item.name:'选择详情',rarity+String(item&&item.description||'暂无说明'),cost,extraText)
}
function getRebirthRarityColor(rarity){return rarity==='天命'?'#d89b24':rarity==='传承'?'#9254c8':rarity==='稀有'?'#4f8edc':'#3fa45b'}

function getPageSubtitle() {
  if (currentPage === 'equipment') {
    return '整理法器，提升你的战斗力'
  }
  if (currentPage === 'map') {
    return '选择历练之地，机缘与风险并存'
  }
  if (currentPage === 'sect') {
    return '完成宗门任务，以贡献换取修行资源'
  }
  if (currentPage === 'rebirth') {
    return '踏入轮回，留下永恒天赋'
  }
  if (currentPage === 'rebirth_prepare') return '点击选择，长按查看详细效果'
  if (currentPage === 'special_talent_choice') return '请选择本世的新特殊天赋'
  return '从一介凡人开始你的修仙之路'
}

// 底部固定五个入口，所有页面都能随时切换。
function drawPageNavigation() {
  const y = getNavigationY()
  const width = 65
  const gap = 3
  const pages = [
    { id: 'cultivate', text: '修炼' },
    { id: 'equipment', text: '装备' },
    { id: 'map', text: '地图' },
    { id: 'sect', text: '宗门' },
    { id: 'rebirth', text: '轮回' }
  ]
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]
    drawButton(
      16 + i * (width + gap),
      y,
      width,
      40,
      page.text,
      currentPage === page.id ? '#8b4513' : '#737a70',
      function () {
        currentPage = page.id
        drawGame()
        if (page.id === 'sect' && isSystemUnlocked('sect')) {
          showStoryDialog({
            image: GAME_IMAGES.characters.sect_master,
            title: '青云宗主',
            unlockKey: 'sect_joined',
            text: '你既已筑基，便有资格正式列入青云宗门墙。\n\n从今日起，可领取宗门任务、积攒贡献，并进入各峰修习传承。',
            buttons: [{ text: '拜入宗门', action: function () { addAdventureLog('你正式拜入青云宗。','system'); saveAndDraw() } }]
          })
        }
      }
    )
  }
}

function drawLockedSystemCard(title,unlockText,description){drawRoundedRect(14,100,347,210,10,'#fffdf7','#ded7c8');drawCenteredText(title+'尚未解锁',142,18,'#8b4513','bold');drawCenteredText(unlockText,174,15,'#8b3a3a','bold');drawWrappedText(description,32,210,310,22,13,'#625c50');drawButton(95,258,185,38,unlockText,'#aaa398',function(){showMessage('达到'+unlockText+'后开放')})}

function getNavigationY() {
  // safeTopOffset 已在画布中整体下移，这里预留底部空间避免导航被遮住。
  return viewHeight - safeTopOffset - 50
}

function drawEquipmentPage() {
  if(!isSystemUnlocked('equipment')){drawLockedSystemCard('装备系统','炼气期解锁','历练与宗门可获得装备，自动穿戴同部位最强装备。');return}
  drawRoundedRect(14, 68, 347, 172, 10, '#fffdf7', '#ded7c8')
  drawText('当前自动装备', 27, 88, 16, '#37474f', 'bold')

  for (let i = 0; i < EQUIPMENT_SLOTS.length; i++) {
    const slot = EQUIPMENT_SLOTS[i]
    const equipment = gameData.equipmentSlots[slot.id]
    const equipmentText = equipment
      ? equipment.rank + '·' + equipment.name + '  +' + equipment.power
      : '未装备'
    drawLabelValue(slot.name, equipmentText, 114 + i * 20)
  }
  drawLabelValue('装备总战力', '+' + getEquipmentPower(), 204)
  drawText('历练获得装备后，会自动保留同部位战力最高的一件。', 27, 226, 12, '#625c50')
}

function getTodayKey(){const d=new Date();return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate()}
function addSectContribution(amount,favor){const value=Math.max(0,Math.floor(Number(amount)||0));gameData.sectContribution+=value;gameData.sect.contribution=gameData.sectContribution;gameData.totalSectContribution+=value;gameData.sect.sectFavor+=Math.max(0,Math.floor(Number(favor)||0))}
function getRandomInteger(min,max){return min+Math.floor(Math.random()*(max-min+1))}

// 每次随机生成5个任务。每2小时一轮，因此一天最多自然生成60个任务。
function createSectDailyTasks(){
  const templates=SECT_TASK_TEMPLATES.slice()
  if(getSectPositionIndex()>=4)templates.push({type:'adventure',name:'执事巡查',description:'额外完成历练10次',target:10,material:1})
  for(let i=templates.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));const tmp=templates[i];templates[i]=templates[j];templates[j]=tmp}
  const result=[]
  for(let index=0;index<5;index++){
    const template=templates[index%templates.length]
    let start=0
    if(template.type==='manual')start=gameData.lifetimeStats.totalCultivationClicks
    if(template.type==='adventure'||template.type==='collect')start=gameData.lifetimeStats.totalAdventures
    if(template.type==='boss')start=gameData.lifetimeStats.totalBossWins
    if(template.type==='realm')start=gameData.realmIndex
    const advanced=template.type!=='boss'&&Math.random()<Math.min(.45,.12+gameData.sect.sectFavor/12000)
    const contribution=template.type==='boss'?getRandomInteger(800,1500):advanced?getRandomInteger(300,1000):getRandomInteger(50,200)
    const stone=template.type==='boss'?getRandomInteger(30000,80000):advanced?getRandomInteger(10000,30000):getRandomInteger(500,5000)
    result.push({id:'sect_task_'+Date.now()+'_'+index,type:template.type,name:(advanced?'高级·':'')+template.name,description:template.description,target:template.target,startValue:start,progress:0,contribution:contribution,stone:stone,material:template.material||0,completed:false,claimed:false})
  }
  return result
}

function refreshSectDailyTasks(){
  const now=Date.now()
  if(gameData.sect.dailyTasks.length===5&&gameData.sectTaskRefreshTime>now)return false
  gameData.sect.dailyTasks=createSectDailyTasks()
  gameData.sectTaskRefreshTime=now+SECT_TASK_REFRESH_INTERVAL
  gameData.sect.lastTaskRefreshDate=getTodayKey()
  gameData.sect.shopRefreshTime=now
  gameData.sect.shopEquipmentStock=getAvailableSectEquipment()
  saveGame()
  return true
}
function updateSectTaskStates(){gameData.sect.dailyTasks.forEach(function(task){let value=0;if(task.type==='manual')value=gameData.lifetimeStats.totalCultivationClicks-task.startValue;if(task.type==='adventure'||task.type==='collect')value=gameData.lifetimeStats.totalAdventures-task.startValue;if(task.type==='boss')value=gameData.lifetimeStats.totalBossWins-task.startValue;if(task.type==='realm')value=Math.max(0,gameData.realmIndex-task.startValue);task.progress=Math.max(task.progress||0,value);task.completed=task.progress>=task.target})}
function claimSectTask(taskId){const task=gameData.sect.dailyTasks.find(function(t){return t.id===taskId});updateSectTaskStates();if(!task||!task.completed||task.claimed){showMessage('任务尚未完成');return}task.claimed=true;gameData.spiritStone+=task.stone;gameData.sect.forgeMaterials+=Math.max(0,Math.floor(Number(task.material)||0));addSectContribution(task.contribution,Math.max(1,Math.floor(task.contribution/10)));gameData.sect.completedTasks++;gameData.sect.sectLevel=1+Math.floor(gameData.sect.completedTasks/20);addAdventureLog('完成宗门任务【'+task.name+'】，获得贡献 +'+task.contribution+(task.material?'，玄铁精 +'+task.material:'')+'。','system');saveAndDraw()}
function getSectMaxEquipmentRankIndex(){const major=getMajorRealmLevel(),realmMax=major<=0?-1:major===1?1:major===2?4:major===3?5:major===4?6:7,position=getSectPositionIndex(),positionMax=position<1?-1:position===1?1:position===2?2:position===3?4:position===4?5:position===5?6:7;return Math.min(realmMax,positionMax)}
function getSectEquipmentUpgrade(equipment){const current=gameData.equipmentSlots[equipment.slot];return equipment.power-(current?current.power:0)}
function getEquipmentQualityLabel(equipment){const rank=EQUIPMENT_RANKS.find(function(item){return item.name===equipment.rank});if(!rank)return '中品';const ratio=(equipment.power-rank.powerMin)/Math.max(1,rank.powerMax-rank.powerMin);return ratio>=.67?'上品':ratio>=.34?'中品':'下品'}

// 宗门商店只保留能提升对应装备位战斗力的商品。
function getAvailableSectEquipment(){
  const max=getSectMaxEquipmentRankIndex(),stock=[]
  if(max<0)return stock
  const min=Math.max(0,max-1)
  EQUIPMENT_SLOTS.forEach(function(slot,slotIndex){
    let best=null
    for(let attempt=0;attempt<30;attempt++){
      const rank=EQUIPMENT_RANKS[min+Math.floor(Math.random()*(max-min+1))].name
      const candidate=generateEquipment([{rank:rank,weight:100}])
      if(candidate.slot!==slot.id)continue
      if(getSectEquipmentUpgrade(candidate)>0&&(!best||candidate.power>best.power))best=candidate
    }
    if(best)stock.push({id:'sect_equip_'+Date.now()+'_'+slotIndex,equipment:best,cost:SECT_EQUIPMENT_COSTS[best.rank],sold:false})
  })
  return stock.slice(0,4)
}
function generateSectEquipmentStock(){return getAvailableSectEquipment()}
function buySectEquipment(id){const item=gameData.sect.shopEquipmentStock.find(function(x){return x.id===id});if(!item){showMessage('兑换物不存在');return}if(item.sold){showMessage('该装备已兑换');return}if(getSectPositionIndex()<1){showMessage('外门弟子后解锁装备兑换');return}if(getSectEquipmentUpgrade(item.equipment)<=0){showMessage('该装备已不再提供提升');return}if(gameData.sectContribution<item.cost){showMessage('宗门贡献不足');return}gameData.sectContribution-=item.cost;gameData.sect.contribution=gameData.sectContribution;item.sold=true;addAdventureLog('消耗贡献 '+item.cost+'，'+autoEquip(Object.assign({},item.equipment,{id:'sect_equipment_'+Date.now()})),'equipment');saveAndDraw()}
function getSectTechniqueExchangeOffer(){const positionIndex=getSectPositionIndex(),ranks=getTechniqueRanksForSectPosition(positionIndex);if(!ranks.length)return null;const highRank=ranks[ranks.length-1],lowRank=ranks[0];return {lowRank:lowRank,highRank:highRank,cost:SECT_EQUIPMENT_COSTS[highRank]||100}}
function performTechniqueExchange(offer){const ranks=getTechniqueRanksForSectPosition(getSectPositionIndex()),highChance=Math.min(.75,.15+gameData.sect.sectFavor/10000),rank=ranks.length>1&&Math.random()>=highChance?ranks[0]:ranks[ranks.length-1];gameData.sectContribution-=offer.cost;gameData.sect.contribution=gameData.sectContribution;const element=gameData.spiritRoots[Math.floor(Math.random()*gameData.spiritRoots.length)];offerTechnique(getRandomTechnique(element,rank));saveGame()}
function exchangeTechnique(){const positionIndex=getSectPositionIndex();if(positionIndex<2){showMessage('内门弟子后解锁功法兑换');return}const offer=getSectTechniqueExchangeOffer();if(!offer){showMessage('当前没有可兑换功法');return}if(gameData.sectContribution<offer.cost){showMessage('宗门贡献不足，本次需要 '+offer.cost+' 点');return}platform.showModal({title:'确认抽取功法',content:'本次抽取消耗：'+offer.cost+'贡献\n当前贡献：'+gameData.sectContribution+'\n\n可能获得：'+offer.lowRank+'下品 - '+offer.highRank+'上品功法',confirmText:'确认抽取',cancelText:'取消',success:function(res){if(res.confirm)performTechniqueExchange(offer)}})}
function buySectPill(){if(!canBuyGatheringPill(1)){showMessage('聚气丹最多持有10颗');return}if(gameData.sectContribution<500){showMessage('宗门贡献不足');return}gameData.sectContribution-=500;gameData.sect.contribution=gameData.sectContribution;gameData.pillCount=getGatheringPillCount()+1;addAdventureLog('你在丹阁消耗500贡献兑换了一枚聚气丹。','system');saveAndDraw()}
function sectHeal(){if(gameData.injuryStatus==='none'){showMessage('你没有受伤');return}if(gameData.sectContribution<300){showMessage('宗门贡献不足');return}gameData.sectContribution-=300;gameData.sect.contribution=gameData.sectContribution;gameData.injuryStatus='none';gameData.injuryEndTime=0;addAdventureLog('你在丹阁疗伤，消耗宗门贡献300。','system');saveAndDraw()}
function exchangeForgeMaterial(){if(gameData.sectContribution<1000){showMessage('宗门贡献不足');return}gameData.sectContribution-=1000;gameData.sect.contribution=gameData.sectContribution;gameData.sect.forgeMaterials++;addAdventureLog('你在炼器阁兑换玄铁精 +1。','equipment');saveAndDraw()}
function sectForgeEquipment(){if(getSectPositionIndex()<1){showMessage('外门弟子后解锁炼器阁');return}let target=null;EQUIPMENT_SLOTS.forEach(function(slot){const item=gameData.equipmentSlots[slot.id];if(item&&(!target||item.power<target.power))target=item});if(!target){showMessage('暂无装备可炼制');return}if(gameData.sect.forgeMaterials<1){showMessage('玄铁精不足');return}gameData.sect.forgeMaterials--;target.enhanceLevel=Math.max(0,Math.floor(Number(target.enhanceLevel)||0))+1;target.power+=Math.max(1,Math.floor(target.power*.05));normalizeEquipmentRankAfterEnhance(target);addAdventureLog('消耗玄铁精强化【'+target.name+'】至 +'+target.enhanceLevel+'，战力提升至 '+target.power+'。','equipment');saveAndDraw()}
function canChallengeSectSecret(){const major=getMajorRealmLevel(),position=getSectPositionIndex();return major>=5?position>=7:major>=4?position>=5:major>=3?position>=3:false}
function challengeSectSecret(){if(!canChallengeSectSecret()){showMessage('当前境界或宗门职位尚未达到秘境要求');return}if(getRemainingSeconds(gameData.sect.secretCooldownEndTime)>0){showMessage('宗门秘境冷却中');return}const need=getMajorRealmLevel()===3?100000:getMajorRealmLevel()===4?600000:2000000;gameData.sect.secretCooldownEndTime=Date.now()+300000;if(getCombatPower()>=need*.8&&Math.random()<Math.min(1,getCombatPower()/need*.8)){const gain=getMajorRealmLevel()*500;addSectContribution(gain,100);addAdventureLog('宗门秘境挑战成功，获得贡献 +'+gain+'。','boss')}else addAdventureLog('宗门秘境挑战失败，但没有损失资源。','boss');saveAndDraw()}

function drawSectPage(){refreshSectDailyTasks();updateSectTaskStates();if(sectPage==='tasks'){drawSectTasksPage();return}if(sectPage==='shop'){drawSectShopPage();return}if(sectPage==='library'){drawSectLibraryPage();return}if(sectPage==='forge'){drawSectForgePage();return}if(sectPage==='alchemy'){drawSectAlchemyPage();return}if(sectPage==='secret'){drawSectSecretPage();return}if(sectPage==='mansion'){drawMansionTab();drawSectBack();return}drawRoundedRect(14,68,347,155,10,'#fffdf7','#ded7c8');drawCenteredText('青云宗  Lv.'+gameData.sect.sectLevel,92,20,'#8b4513','bold');drawLabelValue('职位',getSectPosition().name,122);drawLabelValue('宗门贡献',formatNumber(gameData.sectContribution),148);drawLabelValue('宗门声望',formatNumber(gameData.sect.sectFavor),174);drawLabelValue('本轮任务',gameData.sect.dailyTasks.filter(function(t){return t.claimed}).length+' / '+gameData.sect.dailyTasks.length,200);const items=[['tasks','宗门任务'],['shop','宗门商店'],['library','藏经阁'],['forge','炼器阁'],['alchemy','丹阁'],['secret','宗门秘境'],['mansion','洞府'],['home','职位说明']];items.forEach(function(item,i){drawButton(20+(i%2)*175,240+Math.floor(i/2)*58,165,46,item[1],item[0]==='home'?'#737a70':'#456b78',function(){if(item[0]==='home')showPositionPrivileges();else{sectPage=item[0];drawGame()}})})}
function drawSectBack(){drawButton(105,getNavigationY()-48,165,36,'返回宗门','#737a70',function(){sectPage='home';drawGame()})}
function drawSectTasksPage(){const remain=Math.max(0,Math.ceil((gameData.sectTaskRefreshTime-Date.now())/1000));drawText('宗门任务（每2小时刷新5个）',24,82,17,'#8b4513','bold');drawText('下次刷新：'+Math.floor(remain/60)+'分'+remain%60+'秒',24,101,11,'#8a857a');gameData.sect.dailyTasks.forEach(function(task,i){const y=118+i*74;drawRoundedRect(14,y,347,66,8,'#fffdf7','#ded7c8');drawText(task.name,26,y+15,14,'#37474f','bold');drawText(task.description+'  '+Math.min(task.progress,task.target)+'/'+task.target,26,y+33,11,'#625c50');drawText('贡献 '+task.contribution+'  灵石 '+task.stone+(task.material?'  玄铁精 '+task.material:''),26,y+50,11,'#8b4513');drawButton(267,y+16,78,30,task.claimed?'已领取':task.completed?'领取':'进行中',task.completed&&!task.claimed?'#526d5b':'#aaa398',function(){claimSectTask(task.id)})});drawSectBack()}
function drawSectShopPage(){drawText('宗门商店  贡献：'+formatNumber(gameData.sectContribution),24,82,16,'#8b4513','bold');const items=gameData.sect.shopEquipmentStock.filter(function(item){return !item.sold&&getSectEquipmentUpgrade(item.equipment)>0});if(!items.length)drawWrappedText('本轮没有高于当前装备的商品。宗门任务刷新时会重新挑选。',28,132,318,22,13,'#8a857a');items.forEach(function(item,i){const y=108+i*92,e=item.equipment,current=gameData.equipmentSlots[e.slot],upgrade=getSectEquipmentUpgrade(e);drawRoundedRect(14,y,347,82,8,'#fffdf7','#ded7c8');drawText(e.rank+getEquipmentQualityLabel(e)+'·'+e.name,26,y+17,14,'#8b4513','bold');drawText(e.slotName+'  战力 '+formatNumber(e.power)+'  当前 '+formatNumber(current?current.power:0),26,y+36,11,'#625c50');drawText('提升：+'+formatNumber(upgrade)+'  兑换：'+formatNumber(item.cost)+'贡献',26,y+56,11,'#526d5b','bold');drawButton(270,y+25,76,30,'兑换','#526d5b',function(){buySectEquipment(item.id)})});drawSectBack()}
function drawSectLibraryPage(){const index=getSectPositionIndex(),offer=getSectTechniqueExchangeOffer();if(index<2||!offer){drawLockedOrCard('藏经阁','内门弟子后解锁功法兑换',false,function(){},'尚未解锁');drawSectBack();return}drawRoundedRect(14,90,347,230,10,'#fffdf7','#ded7c8');drawCenteredText('藏经阁',122,19,'#8b4513','bold');drawText('随机抽取 '+offer.highRank+' 功法',34,158,16,'#37474f','bold');drawText('本次消耗：'+formatNumber(offer.cost)+' 贡献',34,190,14,'#8b4513');drawText('当前贡献：'+formatNumber(gameData.sectContribution),34,218,13,'#625c50');drawText('可能获得：'+offer.lowRank+'下品 - '+offer.highRank+'上品功法',34,246,12,'#625c50');drawButton(58,272,259,38,'抽取匹配灵根的功法','#526d5b',exchangeTechnique);drawSectBack()}
function drawSectForgePage(){drawText('炼器阁  玄铁精：'+gameData.sect.forgeMaterials,24,88,17,'#8b4513','bold');drawButton(24,130,327,48,'1000贡献兑换玄铁精','#8b6b35',exchangeForgeMaterial);drawButton(24,194,327,48,'消耗1玄铁精，最低战力装备 +5%','#526d5b',sectForgeEquipment);drawSectBack()}
function drawSectAlchemyPage(){drawText('丹阁  贡献：'+formatNumber(gameData.sectContribution),24,88,17,'#8b4513','bold');drawButton(24,130,327,48,'聚气丹 500贡献（'+getGatheringPillCount()+'/10）','#8b6b35',buySectPill);drawButton(24,194,327,48,'疗伤丹 300贡献','#8b3a3a',sectHeal);drawSectBack()}
function drawSectSecretPage(){const text=getMajorRealmLevel()>=5?'宗门大比：化神期且宗门老祖可挑战':getMajorRealmLevel()>=4?'镇魔塔：元婴期且长老可挑战':'灵脉秘境：金丹期且核心弟子可挑战';drawLockedOrCard('宗门秘境',text,canChallengeSectSecret(),challengeSectSecret,'挑战宗门秘境');drawSectBack()}
function drawLockedOrCard(title,text,open,action,buttonText){drawRoundedRect(14,90,347,210,10,'#fffdf7','#ded7c8');drawCenteredText(title,124,19,'#8b4513','bold');drawWrappedText(text,36,164,303,23,14,'#625c50');drawButton(60,238,255,42,open?buttonText:'尚未解锁',open?'#526d5b':'#aaa398',open?action:function(){showMessage(text)})}
function showPositionPrivileges(){const index=getSectPositionIndex(),names=['基础任务','装备兑换','功法兑换','高级任务和装备','每日额外权限','高级功法','特殊兑换','宗门秘境'],achievementNames={outer_first:'外门第一',core_disciple:'核心弟子',elder:'长老之尊',ancestor:'一宗之祖'},achievements=Object.keys(gameData.sectAchievements).filter(function(id){return gameData.sectAchievements[id]}).map(function(id){return achievementNames[id]}).filter(Boolean);platform.showModal({title:getSectPosition().name,content:'当前权限：\n'+names.slice(0,index+1).join('\n')+'\n\n历史最高：'+SECT_POSITIONS[gameData.highestSectPositionIndex].name+'\n历史贡献：'+formatNumber(gameData.totalSectContribution)+'\n宗门成就：'+(achievements.join('、')||'暂无'),showCancel:false})}

function drawMansionTab() {
  if(!isSystemUnlocked('mansion')){drawLockedSystemCard('洞府尚未开辟','金丹期解锁','金丹后可升级洞府、获得离线收益、镇守灵石、强化装备与灵石祈福。');return}
  drawRoundedRect(14,118,347,90,10,'#fffdf7','#ded7c8')
  drawText('洞府与强化',27,140,17,'#8b4513','bold')
  drawLabelValue('当前灵石',formatNumber(gameData.spiritStone),164)
  drawLabelValue('装备总战力','+'+getEquipmentPower(),186)
  drawButton(14,220,347,48,'强化装备（强化最低战力装备）','#526d5b',enhanceEquipment)
  drawButton(14,280,347,48,'升级洞府  '+formatNumber(getMansionUpgradeCost())+' 灵石','#456b78',upgradeMansion)
  if (hasSpecialTalent('wealth_opens_heaven')) drawButton(14,340,347,40,'灵石祈福  +'+Math.round(gameData.temporaryBreakthroughBonus*100)+'%','#8b3a3a',buyTemporaryBreakthroughBonus)
  else drawText('装备强化消耗：200 + 装备战力 × 0.2。',27,360,12,'#625c50')

  if (!gameData.cultivationPath) {
    drawRoundedRect(14,390,347,104,10,'#fffdf7','#ded7c8')
    drawText('功法道路：尚未选择（筑基期后解锁）',27,408,13,'#8b4513','bold')
    drawButton(20,428,102,40,'选择剑修','#8b3a3a',function(){selectCultivationPath('sword')})
    drawButton(136,428,102,40,'选择丹修','#8b6b35',function(){selectCultivationPath('alchemy')})
    drawButton(252,428,102,40,'选择阵修','#456b78',function(){selectCultivationPath('formation')})
    return
  }
  // 洞府效果只读取统一的计算函数，避免显示数值与实际结算规则不一致。
  const mansionLevel = gameData.mansionLevel
  const cultivationBonus = Math.round((getMansionCultivationRate() - 1) * 100)
  const breakthroughBonus = Math.round(getMansionBreakthroughBonus() * 100)
  const injuryReduce = Math.round((1 - getMansionInjuryDurationRate()) * 100)
  const equipmentBonus = Math.round(getMansionEquipmentChanceBonus() * 100)
  const offlineHours = getOfflineGuardLimitSeconds() / (60 * 60)
  drawRoundedRect(14,390,347,118,10,'#fffdf7','#ded7c8')
  drawText('洞府等级：'+mansionLevel+'    升级消耗：'+formatNumber(getMansionUpgradeCost())+' 灵石',27,408,12,'#8b4513','bold')
  drawText('修炼收益：+'+cultivationBonus+'%  大境界突破率：+'+breakthroughBonus+'%',27,426,11,'#625c50')
  drawText('受伤时间：-'+injuryReduce+'%  装备掉率：+'+equipmentBonus+'%',27,444,11,'#625c50')
  drawText('离线修炼效率：'+Math.round(getOfflineCultivationRate()*100)+'%  离线镇守上限：'+offlineHours+'小时',27,462,11,'#625c50')
  drawText('镇守收益：'+getGuardStonePerSecond().toFixed(2)+' 灵石/秒',27,480,11,'#625c50')
  if(isSystemUnlocked('primordialSpirit')){
    const p=gameData.primordialSpirit
    drawRoundedRect(14,518,347,72,10,'#fffdf7','#ded7c8');drawText('元神：'+p.level+'级  经验 '+p.exp+' / '+getPrimordialSpiritLevelCost()+'  试炼 '+p.trialLevel+'层',27,538,12,'#8b4513','bold');drawText('神通槽：'+p.equippedAbilityIds.length+' / '+getPrimordialSpiritSlots(),27,558,11,'#625c50');drawButton(244,542,102,30,'元神试炼','#526d5b',challengeSpiritTrial)
  }
  if(isSystemUnlocked('law')){
    const law=gameData.lawSystem
    drawRoundedRect(14,596,347,72,10,'#fffdf7','#ded7c8');drawText('法则碎片：'+law.lawFragments+'  主修：'+(LAW_CONFIG.find(x=>x.id===law.selectedLawId)||{name:'未选择'}).name,27,616,12,'#8b4513','bold');LAW_CONFIG.slice(0,3).forEach(function(item,i){drawButton(20+i*112,632,104,28,item.name,law.selectedLawId===item.id?'#8b4513':'#737a70',function(){law.selectedLawId=item.id;saveAndDraw()})})
  }
}

// 功法详情页：把功法、灵根和最终修炼倍率拆开显示，方便确认实际生效情况。
function drawTechniquePage() {
  const t = gameData.currentTechnique
  const bottom = getNavigationY() - 8
  drawRoundedRect(14,68,347,bottom-60,10,'#fffdf7','#ded7c8')
  drawCenteredText('当前功法',92,18,'#8b4513','bold')
  if (!t) {
    drawCenteredText('尚未获得可修炼功法',160,14,'#8a857a')
    drawButton(105,bottom-44,165,34,'返回修炼','#737a70',function(){currentPage='cultivate';drawGame()})
    return
  }
  drawText(getTechniqueDisplayName(),27,124,17,'#8b4513','bold')
  drawText('属性：'+((SPIRIT_ROOT_TYPES.find(function(root){return root.id===t.element})||{}).name||t.element)+'    等级：'+t.level,27,148,12,'#625c50')
  drawText('基础修炼增幅：+'+Math.round((t.baseRate||0)*100)+'%    等级增幅：+'+Math.max(0,t.level-1)*2+'%',27,170,12,'#625c50')
  drawText('功法词条',27,202,15,'#37474f','bold')
  const effects=(t.effects||[])
  if (!effects.length) drawText('暂无额外词条',27,224,12,'#8a857a')
  effects.forEach(function(effect,index){drawText('· '+effect.name+' +'+Math.round(effect.value*100)+'%',27,224+index*20,12,'#625c50')})
  const breakdown=getCultivationSpeedBreakdown()
  // 每个词条占一行，避免词条较多时覆盖下面的倍率说明。
  const y=effects.length ? 252 + effects.length * 20 : 252
  drawText('修炼速度组成',27,y,15,'#37474f','bold')
  let lineY=y+24
  breakdown.items.forEach(function(item){drawText(item.name+'：×'+formatRate(item.rate),27,lineY,12,item.highlight?'#8b4513':'#625c50',item.highlight?'bold':'normal');lineY+=18})
  drawText('最终修炼倍率：×'+formatRate(breakdown.total),27,lineY+8,15,'#8b4513','bold')
  drawWrappedText('此倍率已用于主动修炼、聚灵阵自动修炼与离线自动修炼。',27,lineY+34,310,17,11,'#8a857a')
  drawButton(105,bottom-44,165,34,'返回修炼','#737a70',function(){currentPage='cultivate';drawGame()})
}

// 轮回页只展示永久数据，避免和本轮修炼数据混在一起。
function drawRebirthPage() {
  const top=68, bottom=getNavigationY()-8, viewportHeight=bottom-top
  drawRoundedRect(14, top, 347, viewportHeight, 10, '#fffdf7', '#ded7c8')
  const highestRealm = REALMS[gameData.highestRealmIndex]
  const quality = getRebirthQuality()
  let y=91-rebirthPageScrollY
  context.save(); context.beginPath(); context.rect(14,top,347,viewportHeight); context.clip()
  drawText('轮回重生', 27, y, 18, '#8b4513', 'bold')
  drawText('首通：' + getBossDefeatedCount() + '/' + ADVENTURE_MAPS.length, 270, y, 12, '#625c50'); y+=27
  drawLabelValue('轮回次数', gameData.rebirthCount, y); y+=24
  drawLabelValue('历史最高境界', highestRealm.name, y); y+=24
  drawLabelValue('本次天赋品质', quality ? TALENT_QUALITIES[quality].name : '筑基期后解锁', y); y+=24
  drawWrappedText('可用轮回点：' + formatNumber(gameData.rebirthPoints) + '  累计：' + formatNumber(gameData.totalRebirthPoints) + '  修炼：+' + formatNumber(gameData.totalRebirthPoints) + '%',27,y,310,17,11,'#625c50'); y+=38
  drawText('常规天赋（同类型仅保留最高品质）', 27, y, 14, '#37474f', 'bold'); y+=22

  const talentTypes = [
    { type: 'cultivation', label: '修炼' },
    { type: 'breakthrough', label: '突破' },
    { type: 'adventure', label: '历练' },
    { type: 'combat', label: '战斗' }
  ]
  for (let i = 0; i < talentTypes.length; i++) {
    const item = talentTypes[i]
    const talent = gameData.talents[item.type]
    drawText(item.label + '：', 27, y, 13, '#2f3542')
    if (talent) {
      drawWrappedText(talent.qualityName + '·' + talent.name + '：' + talent.description,78,y,250,17,12,TALENT_QUALITIES[talent.quality].color)
      y+=Math.max(28,wrapTextLines(talent.qualityName+'·'+talent.name+'：'+talent.description,250,12,'normal').length*17+8)
    } else {
      drawText('未获得', 78, y, 12, '#8a857a')
      y+=28
    }
  }
  y+=8
  drawText('本世特殊天赋（下一世最多继承一个）', 27, y, 14, '#37474f', 'bold'); y+=22
  for (let i = 0; i < 2; i++) {
    const talent = gameData.specialTalents[i]
    if (talent) {
      const description=talent.description + getSpecialTalentProgressText(talent.id)
      const lines=wrapTextLines(description,210,11,'normal')
      const cardHeight=42+lines.length*17
      drawRoundedRect(20,y-14,330,cardHeight,8,'#f8f4e9','#ded7c8')
      drawText('①②'.charAt(i)+' '+talent.name,27,y+2,13,'#8b4513','bold')
      drawWrappedText(description,27,y+20,210,17,11,'#625c50')
      const selected = gameData.selectedInheritedSpecialTalentId === talent.id
      drawButton(250, y+2,90,28, selected ? '已选择继承' : '选择继承', selected ? '#8b4513' : '#526d5b', function () {
        selectInheritedSpecialTalent(talent.id)
      },function(){showSelectionDetail({name:talent.name,rarity:'特殊天赋',description:talent.description+getSpecialTalentProgressText(talent.id)})})
      y+=cardHeight+10
    } else {
      drawText('特殊天赋 ' + (i + 1) + '：尚未获得', 27, y, 13, '#8a857a')
      y+=28
    }
  }
  y+=6
  drawButton(27,y,321,32,'任务与成就','#456b78',function(){currentPage='goals';drawGame()}); y+=40
  drawButton(27,y,140,32,'不继承任何天赋','#737a70',clearInheritedSpecialTalent)
  const buttonText = canRebirth() ? '轮回重生' : '筑基期后解锁重生'
  drawButton(177,y,171,32,buttonText,canRebirth()?'#8b3a3a':'#737a70',clickRebirthButton)
  y+=52
  context.restore()
  rebirthPageContentHeight=y-top
  rebirthPageViewportHeight=viewportHeight
  clampRebirthPageScroll()
}

function drawRandomEventPage() {
  const event = currentRandomEvent || RANDOM_EVENTS.find(function (item) { return item[0] === gameData.pendingEventId })
  if (!event) { currentPage = 'cultivate'; drawGame(); return }
  currentRandomEvent = event
  drawRoundedRect(14, 68, 347, 300, 10, '#fffdf7', '#ded7c8')
  drawCenteredText('机缘事件：' + event[1], 100, 18, '#8b4513', 'bold')
  drawWrappedText(event[2], 28, 136, 320, 20, 14, '#625c50')
  for (let i = 3; i < event.length; i++) {
    const choice = event[i]
    drawButton(28, 190 + (i - 3) * 58, 319, 42, choice[0], '#456b78', function () { resolveRandomEvent(choice[1]) })
  }
}

function drawGoalsPage() {
  drawRoundedRect(14, 68, 347, 438, 10, '#fffdf7', '#ded7c8')
  drawCenteredText('任务与成就', 92, 18, '#8b4513', 'bold')
  drawButton(28, 108, 145, 32, '本轮任务', goalsTab==='tasks'?'#8b4513':'#737a70', function(){goalsTab='tasks';drawGame()})
  drawButton(202, 108, 145, 32, '成就图鉴', goalsTab==='achievements'?'#8b4513':'#737a70', function(){goalsTab='achievements';drawGame()})
  if (goalsTab === 'tasks') {
    gameData.runTasks.forEach(function(task, index) {
      const y=165+index*105; drawText(task.name,27,y,15,'#37474f','bold'); drawText(task.description,27,y+20,12,'#625c50'); drawText('进度：'+task.progress+' / '+(typeof task.target==='number'?task.target:1),27,y+40,12,'#625c50'); drawText('奖励：灵石'+task.rewards.spiritStone+' 丹药'+task.rewards.pill+' 轮回点'+task.rewards.rebirthPoint,27,y+60,11,'#8a857a'); if(task.completed&&!task.claimed) drawButton(255,y+28,82,30,'领取','#456b78',function(){claimRunTaskReward(task.id)})
    })
  } else {
    const list=ACHIEVEMENTS.slice(0,8)
    list.forEach(function(item,index){const y=160+index*42;const state=gameData.achievements[item[0]];drawText(item[2],27,y,14,'#37474f','bold');drawText(state.claimed?'已领取':state.completed?'已完成':'未完成',190,y,12,state.completed?'#526d5b':'#8a857a');if(state.completed&&!state.claimed)drawButton(268,y-14,68,28,'领取','#456b78',function(){claimAchievementReward(item[0])})})
    drawText('成就共 '+ACHIEVEMENTS.length+' 项，当前页展示前8项。',27,498,11,'#8a857a')
  }
  drawButton(112, getNavigationY()-44, 150, 34, '返回轮回页', '#737a70', function(){currentPage='rebirth';drawGame()})
}

function drawRebirthPreparePage() {
  const p = gameData.nextLifePreparation
  const bottom = getNavigationY() - 98
  const contentY = 188
  const contentHeight = Math.max(80, bottom - contentY - 8)
  drawRoundedRect(14,68,347,bottom-60,10,'#fffdf7','#ded7c8')
  drawCenteredText('轮回重生准备',90,18,'#8b4513','bold')
  drawText('选择你的下一世命运；点击“开启下一世”后才会生效。',27,112,11,'#8a857a')
  const bg=REBIRTH_BACKGROUNDS.find(function(item){return item.id===p.backgroundId})
  const fortune=REBIRTH_FORTUNES.find(function(item){return item.id===p.fortuneId})
  drawText('出生：'+(bg?bg.name:'未选择')+'  气运：'+(fortune?fortune.name:'免费随机'),27,130,11,'#625c50')
  const tabs=[['origin','出身与祝福'],['talent','天赋构筑'],['destiny','气运与命运']]
  tabs.forEach(function(tab,index){drawButton(15+index*116,142,112,34,tab[1],rebirthPrepareTab===tab[0]?'#8b4513':'#737a70',function(){rebirthPrepareTab=tab[0];rebirthPrepareScrollY=0;drawGame()})})
  context.save(); context.beginPath(); context.rect(14,contentY,347,contentHeight); context.clip()
  if (rebirthPrepareTab === 'origin') drawPrepareOriginContent(p, contentY)
  else if (rebirthPrepareTab === 'talent') drawPrepareTalentContent(p, contentY)
  else drawPrepareDestinyContent(p, contentY)
  context.restore()
  const cost=getNextLifePreparationCost(), remaining=gameData.rebirthPoints-cost
  drawRoundedRect(14,bottom+2,347,92,10,'#ede5d4','#ded7c8')
  drawText(remaining>=0?'本次消耗：'+cost+'  可用：'+gameData.rebirthPoints+'  剩余：'+remaining:'本次消耗：'+cost+'  还差：'+(-remaining)+' 点',27,bottom+21,12,remaining>=0?'#625c50':'#8b3a3a','bold')
  drawButton(20,bottom+38,155,42,'返回本世','#737a70',cancelNextLifePreparation)
  drawButton(200,bottom+38,155,42,'开启下一世',remaining>=0?'#8b4513':'#aaa398',confirmStartNextLife)
}

// 已经扣费的多选一流程会单独占用页面，玩家只能完成选择，避免中途退出造成损失。
function drawSpecialTalentChoicePage() {
  const choices=gameData.pendingSpecialTalentChoices||[]
  const top=68, bottom=getNavigationY()-8, viewportHeight=bottom-top
  drawRoundedRect(14,top,347,viewportHeight,10,'#fffdf7','#ded7c8')
  drawCenteredText('选择新特殊天赋',94,18,'#8b4513','bold')
  drawText('点击选择，长按“选择”可查看完整效果。',27,120,11,'#625c50')
  context.save(); context.beginPath(); context.rect(14,128,347,bottom-128); context.clip()
  let y=145-rebirthPageScrollY
  choices.forEach(function(talent,index){
    const lines=wrapTextLines(talent.description,220,11,'normal')
    const height=Math.max(72,34+lines.length*17+12)
    drawRoundedRect(22,y,331,height,8,'#f8f4e9','#ded7c8')
    drawText((index+1)+'、'+talent.name,36,y+18,15,'#8b4513','bold')
    drawWrappedText(talent.description,36,y+38,220,17,11,'#625c50')
    drawButton(267,y+17,72,32,'选择','#8b4513',function(){choosePendingSpecialTalent(talent.id)},function(){showSelectionDetail({name:talent.name,rarity:'特殊天赋',description:talent.description})})
    y+=height+10
  })
  context.restore()
  // 内容高度由说明文字实际行数决定，超过一屏时可上下滑动查看。
  rebirthPageContentHeight=y+rebirthPageScrollY-top+12
  rebirthPageViewportHeight=bottom-top
  clampRebirthPageScroll()
}
function choosePendingSpecialTalent(id) {
  if(!rebirthPreparationSubmitting)return
  const choices=gameData.pendingSpecialTalentChoices||[]
  const selected=choices.find(function(item){return item&&item.id===id})
  const preparation=gameData.pendingRebirthPreparation
  if(!selected||!preparation){showMessage('候选天赋已失效');rebirthPreparationSubmitting=false;gameData.pendingSpecialTalentChoices=[];gameData.pendingRebirthPreparation=null;currentPage='rebirth';saveAndDraw();return}
  beginPreparedRebirth(preparation,selected)
}

function drawPrepareButton(x,y,text,selected,onTap,onLongPress,color) {
  const top=188, bottom=getNavigationY()-106
  if(y+38<top||y>bottom)return
  drawButton(x,y,160,34,(selected?'✓ ':'')+text,color||(selected?'#8b4513':'#737a70'),onTap,onLongPress)
}
function drawPrepareOriginContent(p,y0) {
  let y=y0+18-rebirthPrepareScrollY
  drawRoundedRect(20,y-8,330,42,7,'#f8f4e9','#ded7c8')
  drawText('灵根：开启下一世时重新随机',30,y+5,13,'#456b78','bold')
  drawText('灵根越纯，基础修炼倍率越高。',30,y+23,11,'#625c50')
  y+=54
  drawText('出生背景',27,y,15,'#37474f','bold'); y+=18
  REBIRTH_BACKGROUNDS.forEach(function(item,i){const x=20+(i%2)*170;const yy=y+Math.floor(i/2)*40;drawPrepareButton(x,yy,'['+item.rarity+'] '+item.name+' '+item.cost+'点',p.backgroundId===item.id,function(){setNextLifeBackground(item.id)},function(){showSelectionDetail(item,item.cost,'效果持续当前这一世。')},getRebirthRarityColor(item.rarity))});y+=Math.ceil(REBIRTH_BACKGROUNDS.length/2)*40+18
  drawText('开局祝福：'+p.blessingIds.length+' / 2',27,y,15,'#37474f','bold');y+=18
  REBIRTH_BLESSINGS.forEach(function(item,i){const selected=p.blessingIds.indexOf(item.id)>=0;const x=20+(i%2)*170;const yy=y+Math.floor(i/2)*40;drawPrepareButton(x,yy,item.name+' '+item.cost+'点',selected,function(){toggleNextLifeBlessing(item.id)},function(){showSelectionDetail(item,item.cost,'每次轮回最多选择2个。')})});
  rebirthPrepareContentHeight=y+Math.ceil(REBIRTH_BLESSINGS.length/2)*40-y0+12
  rebirthPrepareViewportHeight=getNavigationY()-106-y0
}
function drawPrepareTalentContent(p,y0) {
  let y=y0+18-rebirthPrepareScrollY
  const names={cultivation:'修炼',breakthrough:'突破',adventure:'历练',combat:'战斗'}
  drawText('常规天赋：'+(p.lockedRegularTalentType?'锁定'+names[p.lockedRegularTalentType]:'随机类型'),27,y,15,'#37474f','bold');y+=18
  ;[null,'cultivation','breakthrough','adventure','combat'].forEach(function(type,i){const x=20+(i%2)*170,yy=y+Math.floor(i/2)*40;const text=type?names[type]+' 3点':'随机 0点';const detail={name:type?'锁定'+names[type]+'天赋':'随机天赋',rarity:type?'稀有':'普通',description:type?'下一世常规天赋必定为该类型，品质仍由本次境界决定。':'不锁定类型，免费随机生成常规天赋。'};drawPrepareButton(x,yy,text,p.lockedRegularTalentType===type,function(){toggleLockedRegularTalentType(type)},function(){showSelectionDetail(detail,type?3:0)})});y+=120
  drawText('新特殊天赋候选数量',27,y,15,'#37474f','bold');y+=18
  ;[1,2,3,5].forEach(function(count,i){const x=20+(i%2)*170,yy=y+Math.floor(i/2)*40;const cost=getSpecialTalentChoiceCost(count),detail={name:'特殊天赋 '+(count===1?'随机':'候选'+count+'选1'),rarity:'传承',description:'候选与继承天赋不会重复，确认轮回后才生成结果。'};drawPrepareButton(x,yy,(count===1?'随机1个':count+'选1')+' '+cost+'点',p.specialTalentChoiceCount===count,function(){setSpecialTalentChoiceCount(count)},function(){showSelectionDetail(detail,cost)})});y+=98
  drawText('额外继承：'+(p.extraInheritedSpecialTalentId?(SPECIAL_TALENTS.find(t=>t.id===p.extraInheritedSpecialTalentId)||{}).name:'未选择'),27,y,15,'#37474f','bold');y+=18
  gameData.specialTalents.forEach(function(talent,i){const yy=y+i*40;drawPrepareButton(20,yy,'额外继承 '+talent.name+' 15点',p.extraInheritedSpecialTalentId===talent.id,function(){p.extraInheritedSpecialTalentId=p.extraInheritedSpecialTalentId===talent.id?null:talent.id;saveAndDraw()},function(){showSelectionDetail({name:'额外继承 '+talent.name,rarity:'传承',description:talent.description},15,'下一世最多拥有3个特殊天赋。')})})
  y+=Math.max(1,gameData.specialTalents.length)*40
  rebirthPrepareContentHeight=y-y0+12; rebirthPrepareViewportHeight=getNavigationY()-106-y0
}
function drawPrepareDestinyContent(p,y0) {
  let y=y0+18-rebirthPrepareScrollY
  drawText('下一世气运：'+(p.fortuneId?(REBIRTH_FORTUNES.find(f=>f.id===p.fortuneId)||{}).name:'免费随机'),27,y,15,'#37474f','bold');y+=18
  drawPrepareButton(20,y,'免费随机',!p.fortuneId,function(){p.fortuneMode='random';p.fortuneId=null;saveAndDraw()},function(){showSelectionDetail({name:'免费随机气运',rarity:'普通',description:'下一世随机获得一项气运。'},0)})
  REBIRTH_FORTUNES.forEach(function(item,i){const x=20+(i%2)*170,yy=y+40+Math.floor(i/2)*40;drawPrepareButton(x,yy,'['+item.rarity+'] '+item.name,p.fortuneId===item.id,function(){p.fortuneMode='choose';p.fortuneId=item.id;saveAndDraw()},function(){showSelectionDetail(item,0,'效果持续当前这一世。')},getRebirthRarityColor(item.rarity))});y+=40+Math.ceil(REBIRTH_FORTUNES.length/2)*40+18
  drawText('命运事件：'+(p.destinyEventId?(DESTINY_EVENTS.find(d=>d.id===p.destinyEventId)||{}).name:'无'),27,y,15,'#37474f','bold');y+=18
  DESTINY_EVENTS.forEach(function(item,i){const x=20+(i%2)*170,yy=y+Math.floor(i/2)*40;drawPrepareButton(x,yy,item.name+' '+item.cost+'点',p.destinyEventId===item.id,function(){p.destinyEventId=p.destinyEventId===item.id?null:item.id;saveAndDraw()},function(){showOptionDetail(item.name,'下一世会触发对应命运事件。',item.cost)})});rebirthPrepareContentHeight=y+Math.ceil(DESTINY_EVENTS.length/2)*40-y0+20;rebirthPrepareViewportHeight=getNavigationY()-106-y0
}

function tryTriggerRandomEvent() {
  if (gameData.injuryStatus !== 'none' || Math.random() >= 0.20) return false
  currentRandomEvent = RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)]
  gameData.pendingEventId = currentRandomEvent[0]
  gameData.lifetimeStats.totalRandomEvents += 1
  gameData.runStats.randomEvents += 1
  currentPage = 'event'
  return true
}

function resolveRandomEvent(action) {
  const map = getSelectedMap()
  const realm = REALMS[gameData.realmIndex]
  let text = '你谨慎离开，没有额外收获。'
  const stone = Math.max(1, Math.floor(40 * map.rewardMultiplier))
  const equip = function () { return autoEquip(generateEquipment(map.dropRankWeights)) }
  if (action === 'alchemy_furnace_invest' && gameData.spiritStone >= getPillCost() * 2) { gameData.spiritStone -= getPillCost() * 2; const r=Math.random(); if(r<.7){gameData.pillCount+=2;text='丹炉复苏，获得聚气丹2枚。'}else if(r<.9){gameData.pillCount+=4;text='丹炉大放灵光，获得聚气丹4枚。'}else{setInjury('light',30);text='丹炉爆炸，你受了轻伤。'} }
  else if (action === 'alchemy_furnace_dismantle') { gameData.spiritStone += stone * 2; if(Math.random()<.2)setInjury('light',30); text='你拆解丹炉，获得灵石 +' + stone * 2 + '。' }
  else if (action === 'help_cultivator' && gameData.spiritStone >= getHealCost()) { gameData.spiritStone -= getHealCost(); text='你救治修士，' + equip() }
  else if (action === 'loot_cultivator') { if(Math.random()<.7){gameData.spiritStone+=stone*2;text='你获得灵石 +' + stone*2 + '。'}else{setInjury('heavy',60);gameData.spiritStone=Math.max(0,gameData.spiritStone-Math.floor(gameData.spiritStone*.05));text='修士反击，你身受重伤。'} }
  else if (action === 'study_stele') { const r=Math.random(); if(r<.6){gameData.cultivation+=Math.floor(realm.cost*.05);text='参悟有得，获得修为。'}else if(r<.9){gameData.currentTechnique.level+=1;gameData.skillLevel=gameData.currentTechnique.level;gameData.clickPower=getClickPowerBySkillLevel(gameData.skillLevel);text='当前功法精进一级。'}else{setInjury('heavy',60);text='心神受损，身受重伤。'} }
  else if (action === 'copy_stele') { gameData.cultivation+=Math.floor(realm.cost*.02); if(Math.random()<.5)setInjury('light',30); text='你拓印石碑，获得少量修为。' }
  else if (action === 'cultivate_at_spring') { gameData.cultivation += getOfflineAutoCultivationGainPerSecond()*600; text='灵泉静坐，获得十分钟自动修为。' }
  else if (action === 'collect_spring') { const n=1+Math.floor(Math.random()*3);gameData.pillCount+=n;text='收集灵泉，获得聚气丹 +' + n + '。' }
  else if (action === 'buy_random_equipment' && gameData.spiritStone >= Math.floor(map.boss.stoneReward*.1)) { gameData.spiritStone-=Math.floor(map.boss.stoneReward*.1);text='你购买了神秘装备，'+equip() }
  else if (action === 'buy_discount_pill' && gameData.spiritStone >= Math.floor(getPillCost()*.5)) { gameData.spiritStone-=Math.floor(getPillCost()*.5);gameData.pillCount+=1;text='你购买了折扣聚气丹。' }
  else if (action === 'break_cave_by_power') { if(Math.random()<Math.min(.8,getCombatPower()/map.recommendPower*.8)){gameData.spiritStone+=stone*3;text='破阵成功，获得灵石。'+equip()}else{setInjury('heavy',60);text='破阵失败，身受重伤。'} }
  else if (action === 'break_cave_by_stone' && gameData.spiritStone >= Math.floor(getMansionUpgradeCost()*.1)) { gameData.spiritStone-=Math.floor(getMansionUpgradeCost()*.1);text='灵石破解成功，'+equip() }
  else if (action === 'accept_thunder') { if(Math.random()<.5){gameData.battleBuffEndTime=Date.now()+120000;text='天雷淬体成功，战力暂时提升。'}else{setInjury('heavy',60);text='天雷反噬，身受重伤。'} }
  else if (action === 'feed_spirit_beast' && gameData.pillCount>0) { gameData.pillCount--;gameData.runEquipmentChanceBonus=Math.min(.10,gameData.runEquipmentChanceBonus+.02);text='灵兽感恩，本轮装备掉率 +2%。' }
  else if (action === 'accept_duel') { if(Math.random()<Math.min(.8,getCombatPower()/map.recommendPower)){gameData.spiritStone+=stone*2;gameData.battleBuffEndTime=Date.now()+60000;text='切磋获胜，获得灵石并短暂提升战力。'}else{setInjury('light',30);text='切磋失利，受了轻伤。'} }
  else if (action === 'pay_for_guidance' && gameData.spiritStone >= getPillCost()) { gameData.spiritStone-=getPillCost();gameData.cultivation+=Math.floor(realm.cost*.03);text='请教有得，获得修为。' }
  else if (action === 'open_storage_bag' || action === 'inspect_storage_bag') { const r=Math.random(); if(r<.5){gameData.spiritStone+=Math.floor(stone*(action==='inspect_storage_bag'?.8:1));text='储物袋中有灵石。'}else if(r<.75||action==='inspect_storage_bag'){text='储物袋中有装备，'+equip()}else{setInjury('light',30);gameData.spiritStone=Math.max(0,gameData.spiritStone-Math.floor(gameData.spiritStone*.05));text='触发陷阱，受了轻伤。'} }
  else if (action === 'accept_demonic_power') { gameData.runCultivationBonus=Math.min(.30,gameData.runCultivationBonus+.30);gameData.runBreakthroughPenalty=Math.min(.05,gameData.runBreakthroughPenalty+.05);text='心魔赐力，本轮修炼 +30%，突破 -5%。' }
  else if (action === 'resist_demon') { gameData.cultivation+=Math.floor(realm.cost*.05);if(hasSpecialTalent('accumulated_breakthrough'))gameData.failedBreakthroughBonus=Math.min(.20,gameData.failedBreakthroughBonus+.05);text='你坚守道心，获得修为。' }
  else if (action === 'accept_sect_mission') { if(Math.random()<.7){gameData.spiritStone+=stone*2;text='宗门委托成功，获得双倍历练灵石。'}else{setInjury('light',30);text='委托受挫，受了轻伤。'} }
  else if (action !== 'leave') text = '资源不足，未能完成此选择。'
  gameData.pendingEventId = null; currentRandomEvent = null; gameData.lifetimeStats.eventChoicesMade += 1
  updateRunTaskProgress('random_event',1); checkAchievements(); addAdventureLog(text)
  gameData.adventureCooldownEndTime = Date.now() + getAdventureCooldownSeconds()*1000
  currentPage='cultivate'; saveAndDraw()
}

function getSpecialTalentProgressText(id) {
  if (id === 'sudden_enlightenment') {
    if (gameData.enlightenmentReady) return '（顿悟已准备）'
    const seconds = getRemainingSeconds(gameData.nextEnlightenmentTime)
    return seconds > 0 ? '（准备中' + seconds + '秒）' : '（准备中）'
  }
  if (id === 'perfect_cycle') return '（' + (gameData.manualCultivationCount % 10) + '/10）'
  if (id === 'accumulated_breakthrough') return '（累计+' + Math.round(gameData.failedBreakthroughBonus * 100) + '%）'
  if (id === 'wealth_opens_heaven') return '（祈福+' + Math.round(gameData.temporaryBreakthroughBonus * 100) + '%）'
  if (id === 'rebirth_mark') return '（修炼+' + (gameData.rebirthCount * 2) + '%）'
  return ''
}

function drawMapPage() {
  if(!isSystemUnlocked('adventure')){drawLockedSystemCard('历练地图','炼气期解锁','突破炼气后可外出历练、挑战妖兽并获取装备。');return}
  const selectedMapId = gameData.selectedMapId
  const selectedMap = getSelectedMap()
  const mapImage = getGameAsset('backgrounds', 'map_' + selectedMap.id)
  drawRoundedRect(14, 68, 347, 104, 9, '#27343a', '#ded7c8')
  if (mapImage) drawImageCover(mapImage, 14, 68, 347, 104)
  context.fillStyle = 'rgba(10,18,22,0.48)'
  context.fillRect(14, 128, 347, 44)
  drawText(selectedMap.name, 27, 146, 17, '#fff8e7', 'bold')
  drawText('推荐：'+selectedMap.recommendRealm+'  战力 '+formatNumber(selectedMap.recommendPower), 27, 163, 11, '#f0e6d2')

  // 顶部加入当前地图插图后，每页显示三张地图卡片，避免小屏幕内容拥挤。
  const pageSize = 3
  const totalPages = Math.ceil(ADVENTURE_MAPS.length / pageSize)
  mapPage = Math.min(mapPage, totalPages - 1)
  const maps = ADVENTURE_MAPS.slice(mapPage * pageSize, (mapPage + 1) * pageSize)

  for (let i = 0; i < maps.length; i++) {
    const map = maps[i]
    const y = 184 + i * 98
    const isSelected = map.id === selectedMapId
    drawRoundedRect(14, y, 347, 92, 9, isSelected ? 'rgba(247,234,210,0.96)' : 'rgba(255,253,247,0.96)', '#ded7c8')
    drawText(map.name, 27, y + 17, 15, '#8b4513', 'bold')
    drawText('推荐：' + map.recommendRealm + '  战力 ' + map.recommendPower, 27, y + 35, 11, '#625c50')
    const mapPowerRatio = getCombatPower() / map.recommendPower
    const risk = getAdventureRisk(mapPowerRatio)
    const lossText = risk.lossRate > 0
      ? '修为、灵石 ' + Math.round(risk.lossRate * 100) + '%'
      : '无'
    drawText('奖励×' + map.rewardMultiplier + '  掉落：' + formatDropRankWeights(map.dropRankWeights), 27, y + 51, 11, '#625c50')
    drawText('当前风险：' + getAdventureRiskLabel(mapPowerRatio) + '  失败损失：' + lossText, 27, y + 67, 11, '#8b3a3a')
    drawText('首通：' + (gameData.bossDefeated[map.id] ? '已击败' : '未击败'), 27, y + 84, 11, '#8a857a')

    if (isSelected) {
      drawText('当前选择', 286, y + 43, 12, '#8b4513', 'bold')
    } else {
      drawButton(283, y + 27, 65, 32, '选择', '#456b78', function () {
        selectMap(map.id)
      })
    }
  }

  if (totalPages > 1) {
    const pageY = Math.min(486, getNavigationY() - 92)
    drawButton(91, pageY, 90, 32, '上一页', '#737a70', function () {
      mapPage = Math.max(0, mapPage - 1)
      drawGame()
    })
    drawButton(194, pageY, 90, 32, '下一页', '#737a70', function () {
      mapPage = Math.min(totalPages - 1, mapPage + 1)
      drawGame()
    })
  }

  // 无论当前地图位于哪一页，底部都显示它对应的妖兽挑战入口。
  const boss = selectedMap.boss
  const bossY = getNavigationY() - 48
  const bossCooldown = getRemainingSeconds(gameData.bossCooldownEndTime)
  drawText(
    '当前妖兽：' + boss.name + '  首通：' + (gameData.bossDefeated[selectedMap.id] ? '已完成' : '未完成') +
      (bossCooldown > 0 ? '  冷却 ' + bossCooldown + ' 秒' : '  可挑战'),
    20,
    bossY - 12,
    11,
    '#8b3a3a'
  )
  drawButton(14, bossY, 347, 40, '挑战妖兽：' + boss.name, '#8b3a3a', challengeBoss)
}

function formatDropRankWeights(dropRankWeights) {
  return dropRankWeights.map(function (item) {
    return item.rank + ' ' + item.weight + '%'
  }).join('，')
}

function getAdventureRiskLabel(powerRatio) {
  if (powerRatio >= 1.5) return '碾压'
  if (powerRatio >= 1.0) return '安全'
  if (powerRatio >= 0.7) return '危险'
  if (powerRatio >= 0.4) return '高危'
  return '九死一生'
}

// 以下是六个按钮对应的游戏逻辑。
function cultivateOnce() {
  const cultivationBefore = gameData.cultivation
  if (refreshInjuryStatus()) {
    saveGame()
  }
  const canCultivateWhileInjured =
    gameData.injuryStatus === 'light' && hasSpecialTalent('injured_cultivation')
  if (gameData.injuryStatus !== 'none' && !canCultivateWhileInjured) {
    showMessage('你正在受伤，无法手动修炼')
    return
  }

  gameData.manualCultivationCount += 1
  let specialMultiplier = 1
  let triggerText = ''
  // 顿悟优先级最高，触发后不再判定十连击；周天圆满仍可与顿悟叠加。
  if (hasSpecialTalent('sudden_enlightenment') && gameData.enlightenmentReady) {
    specialMultiplier = 100
    gameData.enlightenmentReady = false
    gameData.nextEnlightenmentTime = Date.now() + 60 * 1000
    triggerText = '一念顿悟触发！'
  } else {
    if (hasSpecialTalent('tenfold_cultivation') && Math.random() < 0.10) {
      specialMultiplier = 10
      triggerText = '十连击触发！'
    }
  }
  if (hasSpecialTalent('perfect_cycle') && gameData.manualCultivationCount % 10 === 0) {
    specialMultiplier *= 5
    triggerText += '周天圆满触发！'
  }

  // 这里是真实按下修炼按钮，苦修之道的 10 倍效果只在此处生效。
  let gain = getManualCultivationGain(gameData.clickPower, true) * specialMultiplier
  if (canCultivateWhileInjured) {
    gain = Math.max(1, Math.floor(gain * 0.5))
  }
  gameData.cultivation += gain
  gameData.lifetimeStats.totalCultivationClicks += 1
  gameData.runStats.manualClicks += 1
  gameData.lifetimeStats.highestSingleCultivationGain = Math.max(
    gameData.lifetimeStats.highestSingleCultivationGain,
    gain
  )
  if (triggerText) {
    addAdventureLog(triggerText + '本次获得修为 +' + gain + '。')
  }
  updateRunTaskProgress('manual_click', 1)
  checkAchievements()
  saveAndDraw()
  // 凡人首次达到 10 点修为时给出明确引导；只在跨过门槛的那一次弹出。
  if (gameData.realmIndex === 0 && cultivationBefore < REALMS[0].cost && gameData.cultivation >= REALMS[0].cost) {
    platform.showModal({
      title:'修为已达到突破条件！',
      content:'是否尝试突破？\n\n突破后解锁：\n- 历练\n- 地图\n- 装备\n- 宗门',
      confirmText:'尝试突破',
      cancelText:'稍后再说',
      success:function(res){if(res.confirm)breakthrough()}
    })
  }
}

// 疗伤每点击一次，将受伤结束时间提前 1 秒。
function healInjury() {
  if (gameData.injuryStatus === 'none') {
    return
  }

  gameData.injuryEndTime -= 1000
  if (getRemainingSeconds(gameData.injuryEndTime) <= 0) {
    gameData.injuryStatus = 'none'
    gameData.injuryEndTime = 0
    activatePostInjuryBuff()
    addAdventureLog('你的伤势已经痊愈。')
  } else {
    addAdventureLog('你运转灵力疗伤，伤势有所恢复。')
  }
  saveAndDraw()
}

function upgradeSkill() {
  if(!gameData.currentTechnique){showMessage('当前没有可参悟的功法');return}
  const cost = getSkillCost()
  if (gameData.cultivation < cost) {
    showMessage('修为不足')
    return
  }

  gameData.cultivation -= cost
  gameData.currentTechnique.level += 1
  // skillLevel 同步保留，确保旧任务、战力和升级成本仍然兼容。
  gameData.skillLevel = gameData.currentTechnique.level
  gameData.clickPower = getClickPowerBySkillLevel(gameData.skillLevel)
  addAdventureLog('你参悟【'+gameData.currentTechnique.name+'】，功法提升至 '+gameData.currentTechnique.level+' 级。','talent')
  saveAndDraw()
}

function upgradeArray() {
  const cost = getArrayCost()
  if (gameData.spiritStone < cost) {
    showMessage('灵石不足')
    return
  }

  gameData.spiritStone -= cost
  gameData.arrayLevel += 1
  gameData.autoPower += 1
  saveAndDraw()
}

function usePill() {
  if (gameData.pillCount <= 0) {
    showMessage('聚气丹数量不足')
    return
  }

  const freeUse = gameData.cultivationPath === 'alchemy' && Math.random() < 0.20
  if (!freeUse) {
    gameData.pillCount = Math.max(0, getGatheringPillCount() - 1)
  } else {
    addAdventureLog('丹道感悟触发，本次使用未消耗聚气丹。')
  }
  const durationSeconds = (hasSpecialTalent('pill_mastery') ? 120 : 60) * getAlchemyPathPillDurationRate() * getLifeBackgroundPillDurationRate() * getLifeFortunePillDurationRate()
  gameData.pillBuffEndTime = Date.now() + durationSeconds * (1 + getTechniqueEffectRate('pill')) * 1000
  gameData.runStats.pillsUsed += 1
  updateRunTaskProgress('pill_used', 1)
  saveAndDraw()
  showMessage('聚气丹生效')
}

// 根据境界下标换算大境界等级，突破和轮回都可复用。
function getMajorRealmLevelByIndex(realmIndex) {
  const name = REALMS[realmIndex].name
  if (name === '凡人') return 0
  if (name.indexOf('炼气') === 0) return 1
  if (name.indexOf('筑基') === 0) return 2
  if (name.indexOf('金丹') === 0) return 3
  if (name.indexOf('元婴') === 0) return 4
  if (name.indexOf('化神') === 0) return 5
  return 0
}

function getMajorRealmLevel() {
  return getMajorRealmLevelByIndex(gameData.realmIndex)
}

function isSystemUnlocked(systemId){if(DEBUG_MODE&&gmUnlockedSystems[systemId])return true;const need=SYSTEM_UNLOCK_MAJOR_REALM[systemId];return typeof need!=='number'||getMajorRealmLevel()>=need}
function getSystemUnlockRealmName(systemId){const names=['凡人','炼气期','筑基期','金丹期','元婴期','化神期'];return names[SYSTEM_UNLOCK_MAJOR_REALM[systemId]]||'未知境界'}
function showSystemLocked(systemId){showMessage('达到'+getSystemUnlockRealmName(systemId)+'后才能使用此功能')}
function hasDivineAbility(id){return isSystemUnlocked('divineAbility')&&gameData.primordialSpirit.equippedAbilityIds.indexOf(id)>=0}
function getPrimordialSpiritLevelCost(){return Math.floor(100*Math.pow(gameData.primordialSpirit.level,1.8))}
function getPrimordialSpiritCombatRate(){return !isSystemUnlocked('primordialSpirit')?1:1+Math.min(2,(gameData.primordialSpirit.level-1)*0.02)}
function getPrimordialSpiritCultivationRate(){return !isSystemUnlocked('primordialSpirit')?1:1+Math.min(1,(gameData.primordialSpirit.level-1)*0.01)}
function getPrimordialSpiritSlots(){const l=gameData.primordialSpirit.level;return l>=25?3:l>=10?2:1}
function addPrimordialSpiritExp(amount){if(!isSystemUnlocked('primordialSpirit'))return;gameData.primordialSpirit.exp+=Math.max(1,Math.floor(amount));while(gameData.primordialSpirit.exp>=getPrimordialSpiritLevelCost()){gameData.primordialSpirit.exp-=getPrimordialSpiritLevelCost();gameData.primordialSpirit.level+=1;gameData.primordialSpirit.breakthroughCount+=1;addAdventureLog('元神突破至 '+gameData.primordialSpirit.level+' 级。','talent')}}
function getLawLevel(id){return isSystemUnlocked('law')?gameData.lawSystem.lawLevels[id]||0:0}
function getLawUpgradeCost(level){return Math.floor(10*Math.pow(level+1,1.5))}
function getNextMajorRealmUnlockText(oldIndex,newIndex){const a=getMajorRealmLevelByIndex(oldIndex),b=getMajorRealmLevelByIndex(newIndex);if(a===b)return '';const texts={1:'历练、装备与妖兽',2:'功法分支、宗门、任务与轮回',3:'洞府、离线修炼与炼器',4:'元神、神通与元神试炼',5:'法则参悟与天劫挑战'};return texts[b]||''}
function getSpiritTrialRecommendPower(level){return Math.floor(500000*Math.pow(1.45,level))}
function challengeSpiritTrial(){if(!isSystemUnlocked('spiritTrial')){showSystemLocked('spiritTrial');return}const p=gameData.primordialSpirit;if(getRemainingSeconds(p.trialCooldownEndTime)>0){showMessage('元神试炼冷却中');return}const need=getSpiritTrialRecommendPower(p.trialLevel);const ratio=getCombatPower()/need;const chance=ratio>=1.5?1:Math.max(.1,ratio>=1?.8:ratio*.8);p.trialCooldownEndTime=Date.now()+60000;if(Math.random()<chance){p.trialLevel++;addPrimordialSpiritExp(Math.max(10,Math.floor(need/1000)));if([1,5,10,20].indexOf(p.trialLevel)>=0){const pool=DIVINE_ABILITIES.filter(a=>!gameData.discoveredDivineAbilities[a.id]);if(pool.length){const ability=pool[Math.floor(Math.random()*pool.length)];gameData.discoveredDivineAbilities[ability.id]=true;if(p.equippedAbilityIds.length<getPrimordialSpiritSlots())p.equippedAbilityIds.push(ability.id);addAdventureLog('元神试炼第'+p.trialLevel+'层通过，获得神通【'+ability.name+'】。','talent')}}addAdventureLog('元神试炼成功，元神经验大增。','talent')}else addAdventureLog('元神试炼失败，神魂受挫但未受重伤。','talent');saveAndDraw()}
function upgradeSelectedLaw(){if(!isSystemUnlocked('law')){showSystemLocked('law');return}const law=gameData.lawSystem.selectedLawId;if(!law){showMessage('请先选择主修法则');return}const level=getLawLevel(law),cost=getLawUpgradeCost(level);if(level>=20){showMessage('该法则已圆满');return}if(gameData.lawSystem.lawFragments<cost){showMessage('法则碎片不足');return}gameData.lawSystem.lawFragments-=cost;gameData.lawSystem.lawLevels[law]++;addAdventureLog('你参悟'+(LAW_CONFIG.find(x=>x.id===law)||{}).name+'至 '+(level+1)+'级。','talent');saveAndDraw()}

function getPillCost() {
  const base=PILL_COST_BY_MAJOR_REALM[getMajorRealmLevel()] || 100
  return Math.max(1,Math.floor(base*getLifeBackgroundPillCostRate()))
}
function getGatheringPillCount(){return Math.max(0,Math.floor(Number(gameData.pillCount)||0))}
function canBuyGatheringPill(amount){return getGatheringPillCount()+amount<=MAX_GATHERING_PILLS}

function getHealCost() {
  const costs = HEAL_COST_BY_MAJOR_REALM[getMajorRealmLevel()] || HEAL_COST_BY_MAJOR_REALM[0]
  if (gameData.injuryStatus === 'light') {
    return Math.max(1, Math.floor(costs.light * getAlchemyPathShopRate()))
  }
  if (gameData.injuryStatus === 'heavy') {
    return Math.max(1, Math.floor(costs.heavy * getAlchemyPathShopRate()))
  }
  return 0
}

// 保留灵石购买聚气丹的基础逻辑，供随机事件等原有系统复用。
function buyPill() {
  if(!canBuyGatheringPill(1)){showMessage('聚气丹最多持有10颗');return}
  const cost = getPillCost()
  if (gameData.spiritStone < cost) {
    showMessage('灵石不足')
    return
  }

  gameData.spiritStone -= cost
  gameData.pillCount = getGatheringPillCount()+1
  addAdventureLog('你花费 ' + cost + ' 灵石购买了一枚聚气丹。')
  saveAndDraw()
}

// 财可通神：花费灵石购买仅对下一次概率突破生效的临时成功率。
function buyTemporaryBreakthroughBonus() {
  if(!isSystemUnlocked('breakthroughPrayer')){showSystemLocked('breakthroughPrayer');return}
  if (!hasSpecialTalent('wealth_opens_heaven')) {
    return
  }
  if (!REALMS[gameData.realmIndex].chance) {
    showMessage('当前境界无需祈福')
    return
  }
  if (gameData.temporaryBreakthroughBonus >= 0.10) {
    showMessage('本次祈福加成已达到上限')
    return
  }
  const cost = getPillCost() * 2
  if (gameData.spiritStone < cost) {
    showMessage('灵石不足')
    return
  }
  gameData.spiritStone -= cost
  gameData.temporaryBreakthroughBonus = Math.min(
    0.10,
    gameData.temporaryBreakthroughBonus + 0.01
  )
  addAdventureLog('你花费 ' + cost + ' 灵石祈福，下一次突破成功率 +' + Math.round(gameData.temporaryBreakthroughBonus * 100) + '%。')
  saveAndDraw()
}

// 用灵石立即治愈伤势，不会新增额外的疗伤道具。
function healInjuryByStone() {
  if (gameData.injuryStatus === 'none') {
    showMessage('你没有受伤')
    return
  }

  const cost = getHealCost()
  if (gameData.spiritStone < cost) {
    showMessage('灵石不足')
    return
  }

  gameData.spiritStone -= cost
  gameData.injuryStatus = 'none'
  gameData.injuryEndTime = 0
  activatePostInjuryBuff()
  addAdventureLog('你花费 ' + cost + ' 灵石疗伤，伤势迅速痊愈。')
  saveAndDraw()
}

// 自动选择四个已装备部位中战斗力最低的一件进行强化。
function enhanceEquipment() {
  if(!isSystemUnlocked('equipmentEnhance')){showSystemLocked('equipmentEnhance');return}
  let targetEquipment = null
  for (let i = 0; i < EQUIPMENT_SLOTS.length; i++) {
    const equipment = gameData.equipmentSlots[EQUIPMENT_SLOTS[i].id]
    if (!equipment) {
      continue
    }
    if (!targetEquipment || equipment.power < targetEquipment.power) {
      targetEquipment = equipment
    }
  }

  if (!targetEquipment) {
    showMessage('暂无装备可强化')
    return
  }

  const cost = Math.floor(200 + targetEquipment.power * 0.2)
  if (gameData.spiritStone < cost) {
    showMessage('灵石不足')
    return
  }

  gameData.spiritStone -= cost
  const increaseRate = hasSpecialTalent('forging_genius') ? 0.20 : 0.10
  const increase = Math.max(1, Math.floor(targetEquipment.power * increaseRate))
  targetEquipment.power = Math.floor(targetEquipment.power + increase)
  const rankMessage = normalizeEquipmentRankAfterEnhance(targetEquipment)
  addAdventureLog(
    '你花费 ' + cost + ' 灵石强化了【' + targetEquipment.rank + '·' +
    targetEquipment.name + '】，战斗力提升到 ' + targetEquipment.power + '。' + rankMessage
  )
  // 战斗力由 getEquipmentPower 实时读取装备 power，不需要单独保存数值。
  saveAndDraw()
}

function goAdventure() {
  if(!isSystemUnlocked('adventure')){showMessage('突破至炼气期后解锁外出历练');return}
  if (refreshInjuryStatus()) {
    saveGame()
  }
  // 受伤期间不能历练，也不会消耗历练次数或进入冷却。
  if (gameData.injuryStatus !== 'none') {
    showMessage('你正在受伤，无法外出历练。')
    return
  }

  const remaining = getRemainingSeconds(gameData.adventureCooldownEndTime)
  if (remaining > 0) {
    showMessage('还需等待 ' + remaining + ' 秒')
    return
  }

  const map = getSelectedMap()
  const stoneBeforeAdventure = gameData.spiritStone
  const cultivationBeforeAdventure = gameData.cultivation
  gameData.lifetimeStats.totalAdventures += 1
  gameData.runStats.adventures += 1
  const currentBattlePower = getCombatPower()
  // 战斗力倍率最高 3 倍，再叠加地图倍率和地图风险修正。
  const battleRewardRate = Math.min(3, 1 + currentBattlePower / 500)
  const powerRatio = currentBattlePower / map.recommendPower
  const risk = getAdventureRisk(powerRatio)
  const isOverLevelChallenge = currentBattlePower < map.recommendPower
  const random = Math.random()
  let baseStone = 0
  let getPill = false
  if (random < 0.70) {
    baseStone = 40
  } else if (random < 0.90) {
    baseStone = 100
  } else if (random < 0.98) {
    baseStone = 50
    getPill = true
  } else {
    baseStone = 300
    getPill = true
  }

  let actualStone = Math.floor(
    baseStone * battleRewardRate * map.rewardMultiplier * risk.rewardModifier *
    getAdventureTalentRate()
  )
  let specialAdventureRate = 1
  if (hasSpecialTalent('battle_proves_dao') && isOverLevelChallenge) {
    specialAdventureRate *= 2
  }
  if (hasSpecialTalent('narrow_escape') && powerRatio < 0.40) {
    specialAdventureRate *= 3
  }
  // 特殊天赋奖励可继续叠加；统一转成安全整数，避免异常存档导致 NaN 或 Infinity。
  actualStone = toSafeInteger(actualStone * specialAdventureRate * (1 + getTechniqueEffectRate('adventureStone')))
  // 剑心通明只提高普通地图历练的灵石，不影响妖兽、洞府或装备分解收益。
  if (hasSpecialTalent('sword_heart')) {
    actualStone = toSafeInteger(actualStone * 1.5)
  }
  let adventureMessage = '你前往' + map.name + '历练。'

  // 洞府和寻宝灵瞳都会提高历练装备掉率，最终不会超过 100%。
  const equipmentChance = Math.min(
    1,
    0.15 + getMansionEquipmentChanceBonus() +
    gameData.runEquipmentChanceBonus +
    (hasSpecialTalent('treasure_eye') ? 0.10 : 0)
  )
  let droppedEquipment = null
  if (Math.random() < equipmentChance) {
    droppedEquipment = generateEquipment(map.dropRankWeights)
  }

  // 地图风险按战斗力比例计算，碾压地图时不会受伤。
  const injuryRandom = Math.random()
  let injuryText = ''
  let isInjured = false
  let isHeavyInjury = false
  let lightInjuryChance = risk.lightChance
  let heavyInjuryChance = risk.heavyChance
  // 金刚法身按乘法降低两种历练受伤概率，两个区间仍然首尾相接。
  if (hasSpecialTalent('diamond_body')) {
    lightInjuryChance *= 0.8
    heavyInjuryChance *= 0.8
  }
  if (injuryRandom < lightInjuryChance) {
    setInjury('light', 30)
    injuryText = '你在历练中遭遇妖兽，受了轻伤。'
    isInjured = true
  } else if (injuryRandom < lightInjuryChance + heavyInjuryChance) {
    setInjury('heavy', 60)
    injuryText = '你在历练中误入险地，身受重伤。'
    isInjured = true
    isHeavyInjury = true
  }

  // 只有发生资源损失时才视为危险失败：不发灵石、丹药和普通装备。
  const hasResourceLoss = isInjured && risk.lossRate > 0
  if (!hasResourceLoss) {
    gameData.spiritStone += actualStone
    const pillGranted = getPill && canBuyGatheringPill(1)
    if (pillGranted) gameData.pillCount = getGatheringPillCount() + 1
    else if (getPill) gameData.spiritStone += Math.floor(getPillCost() * 0.5)
    adventureMessage += '获得灵石 +' + actualStone + '。'
    if (getPill) adventureMessage += pillGranted ? '获得聚气丹 +1。' : '聚气丹已满，改获灵石补偿。'
    if (droppedEquipment) {
      adventureMessage += autoEquip(droppedEquipment)
    }
  } else if (isHeavyInjury && hasSpecialTalent('fortune_in_disaster')) {
    // 福祸相依是危险失败中的唯一装备例外，且必定先升一阶。
    const disasterEquipment = droppedEquipment || generateEquipment(map.dropRankWeights)
    upgradeEquipmentRank(disasterEquipment)
    adventureMessage += '本次未获得灵石和丹药。' +
      autoEquip(disasterEquipment)
  } else {
    adventureMessage += '本次未获得灵石、丹药和装备。'
  }
  if (!hasResourceLoss && isOverLevelChallenge && hasSpecialTalent('grow_through_battle')) {
    gameData.battleBuffEndTime = Date.now() + 60 * 1000
    adventureMessage += '以战养战触发，基础战斗力提升60秒。'
  }

  if (isInjured) {
    adventureMessage += injuryText
    // 危险和找死地图受伤时，额外损失当前资源；不会扣成负数。
    if (risk.lossRate > 0) {
      let lossRate = risk.lossRate
      if (hasSpecialTalent('battle_proves_dao') && isOverLevelChallenge) {
        lossRate *= 1.5
      }
      let lostStone = Math.floor(stoneBeforeAdventure * lossRate)
      let lostCultivation = Math.floor(cultivationBeforeAdventure * lossRate)
      if (hasSpecialTalent('turn_danger_to_luck')) {
        lostStone = Math.floor(lostStone * 0.5)
        lostCultivation = Math.floor(lostCultivation * 0.5)
      }
      gameData.spiritStone = Math.max(0, gameData.spiritStone - lostStone)
      gameData.cultivation = Math.max(0, gameData.cultivation - lostCultivation)
      adventureMessage += '损失修为 ' + lostCultivation + '，损失灵石 ' + lostStone + '。'
    }
  }

  // 踏虚而行只影响本次结束后新生成的冷却，不会改变已经开始的冷却。
  const cooldownSeconds = getAdventureCooldownSeconds()
  gameData.adventureCooldownEndTime = Date.now() + cooldownSeconds * 1000
  addAdventureLog(adventureMessage)
  if (!hasResourceLoss && isOverLevelChallenge) {
    gameData.runStats.overlevelWins += 1
    updateRunTaskProgress('overlevel_win', 1)
  }
  updateRunTaskProgress('adventure_count', 1)
  addPrimordialSpiritExp(Math.max(1,Math.floor(map.recommendPower/1000)))
  checkAchievements()
  if (tryTriggerRandomEvent()) {
    saveAndDraw()
    return
  }
  saveAndDraw()
}

// 根据当前地图的品阶权重，生成一件随机装备。
function generateEquipment(dropRankWeights) {
  const slot = EQUIPMENT_SLOTS[Math.floor(Math.random() * EQUIPMENT_SLOTS.length)]
  let rankName = getRandomRankByWeights(dropRankWeights)
  let rankUpgradeChance = hasSpecialTalent('treasure_eye') ? 0.20 : 0
  if (hasSpecialTalent('heavenly_accessory')) {
    rankUpgradeChance += 0.10
  }
  if (rankUpgradeChance > 0 && Math.random() < rankUpgradeChance) {
    rankName = getNextEquipmentRank(rankName)
  }
  const rank = EQUIPMENT_RANKS.find(function (item) {
    return item.name === rankName
  })
  const power = rank.powerMin + Math.floor(
    Math.random() * (rank.powerMax - rank.powerMin + 1)
  )
  const names = EQUIPMENT_NAMES[slot.id]

  return {
    id: 'equipment_' + Date.now() + '_' + Math.floor(Math.random() * 100000),
    name: names[Math.floor(Math.random() * names.length)],
    slot: slot.id,
    slotName: slot.name,
    rank: rank.name,
    power: power
  }
}

function upgradeEquipmentRank(equipment) {
  const nextRankName = getNextEquipmentRank(equipment.rank)
  if (nextRankName === equipment.rank) {
    return
  }
  const nextRank = EQUIPMENT_RANKS.find(function (rank) {
    return rank.name === nextRankName
  })
  equipment.rank = nextRank.name
  equipment.power = nextRank.powerMin + Math.floor(
    Math.random() * (nextRank.powerMax - nextRank.powerMin + 1)
  )
}

function getNextEquipmentRank(rankName) {
  const index = EQUIPMENT_RANKS.findIndex(function (rank) {
    return rank.name === rankName
  })
  if (index === -1 || index >= EQUIPMENT_RANKS.length - 1) {
    return rankName
  }
  return EQUIPMENT_RANKS[index + 1].name
}

// 按地图配置的权重随机品阶，例如 75 / 25 就代表 75% / 25%。
function getRandomRankByWeights(dropRankWeights) {
  const totalWeight = dropRankWeights.reduce(function (total, item) {
    return total + item.weight
  }, 0)
  let randomWeight = Math.random() * totalWeight

  for (let i = 0; i < dropRankWeights.length; i++) {
    randomWeight -= dropRankWeights[i].weight
    if (randomWeight < 0) {
      return dropRankWeights[i].rank
    }
  }

  // 配置权重有小数误差时，兜底返回最后一个品阶。
  return dropRankWeights[dropRankWeights.length - 1].rank
}

// 新装备只会在同部位更强时替换，较弱装备会自动分解为灵石。
function autoEquip(equipment) {
  const rankIndex = EQUIPMENT_RANKS.findIndex(function (rank) { return rank.name === equipment.rank })
  gameData.runStats.highestEquipmentRankIndex = Math.max(gameData.runStats.highestEquipmentRankIndex, rankIndex)
  updateRunTaskProgress('equipment_rank', rankIndex)
  checkAchievements()
  const slot = equipment.slot
  const current = gameData.equipmentSlots[slot]
  const equipmentText = '【' + equipment.rank + '·' + equipment.name + '】'

  if (!current) {
    gameData.equipmentSlots[slot] = equipment
    return '获得装备' + equipmentText + '战斗力 +' + equipment.power + '，已自动装备。'
  }
  if (equipment.power > current.power) {
    const oldText = '【' + current.rank + '·' + current.name + '】'
    gameData.equipmentSlots[slot] = equipment
    return '获得装备' + equipmentText + '战斗力 +' + equipment.power + '，替换了' + oldText + '。'
  }

  const salvageStone = getEquipmentSalvageStone(equipment)
  gameData.spiritStone += salvageStone
  return '获得装备' + equipmentText + '战斗力 +' + equipment.power + '，低于当前装备，已自动分解为灵石 +' + salvageStone + '。'
}

// 分解最低获得 1 枚灵石，后续可在这里加入品阶倍率。
function getEquipmentSalvageStone(equipment) {
  const rate = hasSpecialTalent('stone_from_equipment') ? 0.40 : 0.20
  return Math.max(1, Math.floor(equipment.power * rate))
}

// 强化后的战力超过当前品阶上限时，自动逐阶晋升；天阶不再继续提升。
function normalizeEquipmentRankAfterEnhance(equipment) {
  let rankIndex = EQUIPMENT_RANKS.findIndex(function (item) {
    return item.name === equipment.rank
  })
  const originalRank = equipment.rank
  while (
    rankIndex >= 0 &&
    rankIndex < EQUIPMENT_RANKS.length - 1 &&
    equipment.power > EQUIPMENT_RANKS[rankIndex].powerMax
  ) {
    rankIndex += 1
    equipment.rank = EQUIPMENT_RANKS[rankIndex].name
    equipment.name = EQUIPMENT_NAMES[equipment.slot][rankIndex]
  }
  return equipment.rank !== originalRank
    ? '装备突破品阶，晋升为' + equipment.rank + '！'
    : ''
}

// 挑战当前地图的妖兽。所有 Boss 共用冷却，首通和重复挑战奖励不同。
function challengeBoss() {
  if (refreshInjuryStatus()) saveGame()
  if (gameData.injuryStatus !== 'none') { showMessage('你正在受伤，无法挑战妖兽。'); return }
  if (getRemainingSeconds(gameData.bossCooldownEndTime) > 0) { showMessage('妖兽挑战仍在冷却中'); return }
  const map=getSelectedMap(), imagePath=getBossStoryImage(map.id)
  if(imagePath&&showStoryDialog({image:imagePath,title:map.boss.name,unlockKey:'boss_encounter_'+map.id,text:'山林间妖气骤然暴涨，'+map.boss.name+'拦住了你的去路。\n\n妖兽战力：'+formatNumber(map.boss.power)+'\n你的战力：'+formatNumber(getCombatPower()),buttons:[{text:'迎战',color:'#8b3a3a',action:executeBossChallenge},{text:'暂避锋芒',color:'#737a70',action:function(){drawGame()}}]}))return
  executeBossChallenge()
}

function executeBossChallenge() {
  if (refreshInjuryStatus()) {
    saveGame()
  }
  if (gameData.injuryStatus !== 'none') {
    showMessage('你正在受伤，无法挑战妖兽。')
    return
  }
  const cooldownRemaining = getRemainingSeconds(gameData.bossCooldownEndTime)
  if (cooldownRemaining > 0) {
    showMessage('妖兽挑战还需等待 ' + cooldownRemaining + ' 秒')
    return
  }

  const map = getSelectedMap()
  const boss = map.boss
  const currentBattlePower = getCombatPower()
  const powerRatio = currentBattlePower / boss.power
  const winChance = getBossWinChance(powerRatio)
  const isOverLevelChallenge = currentBattlePower < map.recommendPower
  const isFirstClear = !gameData.bossDefeated[map.id]

  if (Math.random() < winChance) {
    let stoneReward = isFirstClear
      ? boss.stoneReward
      : Math.floor(boss.stoneReward * 0.20)
    if (hasSpecialTalent('battle_proves_dao') && isOverLevelChallenge) {
      stoneReward *= 2
    }
    gameData.spiritStone += stoneReward
    let message = '你击败了' + boss.name + '，获得灵石 +' + stoneReward + '。'
    if (isFirstClear) {
      gameData.bossDefeated[map.id] = true
      gameData.runStats.bossFirstClears += 1
      updateRunTaskProgress('boss_first_clear', 1)
      message = '首次击败【' + boss.name + '】，获得首通奖励！' + message
    }

    const rewardRate = isFirstClear ? 1 : 0.5
    if (Math.random() < boss.pillChance * rewardRate) {
      if(canBuyGatheringPill(1)){gameData.pillCount=getGatheringPillCount()+1;message+='获得聚气丹 +1。'}else{gameData.spiritStone+=Math.floor(getPillCost()*0.5);message+='聚气丹已满，获得灵石补偿。'}
    }
    if (Math.random() < boss.equipmentChance * rewardRate) {
      const equipment = generateEquipment(map.dropRankWeights)
      message += autoEquip(equipment)
    }

    gameData.bossCooldownEndTime = Date.now() + 120 * 1000
    gameData.lifetimeStats.totalBossWins += 1
    if(isSystemUnlocked('sect'))addSectContribution(50*getMajorRealmLevel(),20)
    gameData.runStats.bossWins += 1
    updateRunTaskProgress('boss_win', 1)
    checkAchievements()
    addPrimordialSpiritExp(Math.max(1,Math.floor(boss.power/500)))
    if(isSystemUnlocked('law'))gameData.lawSystem.lawFragments+=1+Math.floor(Math.random()*3)
    addAdventureLog(message)
    saveAndDraw()
    showMessage('挑战胜利')
    return
  }

  // 战力接近妖兽时只会轻伤，差距较大时则进入重伤。
  if (powerRatio >= 0.7) {
    setInjury('light', 30)
  } else {
    setInjury('heavy', 60)
  }
  const lossRate = hasSpecialTalent('battle_proves_dao') && isOverLevelChallenge
    ? 0.15
    : 0.10
  let lostCultivation = Math.floor(gameData.cultivation * lossRate)
  let lostStone = Math.floor(gameData.spiritStone * lossRate)
  if (hasSpecialTalent('turn_danger_to_luck')) {
    lostCultivation = Math.floor(lostCultivation * 0.5)
    lostStone = Math.floor(lostStone * 0.5)
  }
  gameData.cultivation = Math.max(0, gameData.cultivation - lostCultivation)
  gameData.spiritStone = Math.max(0, gameData.spiritStone - lostStone)
  gameData.bossCooldownEndTime = Date.now() + 30 * 1000
  addAdventureLog(
    '你挑战' + boss.name + '失败，身受重创，损失修为 ' + lostCultivation +
    '，损失灵石 ' + lostStone + '。'
  )
  saveAndDraw()
  showMessage('挑战失败')
}

// 根据玩家与妖兽的战斗力比例，换算本次挑战的胜率。
function getBossWinChance(powerRatio) {
  if (powerRatio >= 1.5) {
    return 1
  }
  if (powerRatio >= 1.0) {
    return 0.8
  }
  if (powerRatio >= 0.7) {
    return 0.5
  }
  if (powerRatio >= 0.4) {
    return 0.25
  }
  return 0.05
}

function selectMap(mapId) {
  gameData.selectedMapId = mapId
  saveAndDraw()
  showMessage('已选择' + getSelectedMap().name)
}

function getRebirthQuality() {
  const majorRealmLevel = getMajorRealmLevel()
  if (majorRealmLevel >= 5) return 'gold'
  if (majorRealmLevel >= 4) return 'purple'
  if (majorRealmLevel >= 3) return 'blue'
  if (majorRealmLevel >= 2) return 'green'
  return null
}

function canRebirth() {
  return getMajorRealmLevel() >= 2
}

// 优先抽取还没有、或能提升品质的天赋类型，减少无效重复。
function generateRebirthTalent(quality, forcedType) {
  const talentTypes = ['cultivation', 'breakthrough', 'adventure', 'combat']
  const qualityInfo = TALENT_QUALITIES[quality]
  const candidates = talentTypes.filter(function (type) {
    const oldTalent = gameData.talents[type]
    return !oldTalent || oldTalent.qualityLevel < qualityInfo.level
  })
  const availableTypes = candidates.length > 0 ? candidates : talentTypes
  // 锁定类型要优先于“优先补齐未拥有类型”的随机规则。
  const type = talentTypes.indexOf(forcedType) >= 0 ? forcedType : availableTypes[Math.floor(Math.random() * availableTypes.length)]
  const config = TALENT_CONFIG[quality][type]

  // 复制配置对象，避免后续操作意外修改全局天赋配置。
  return {
    type: config.type,
    name: config.name,
    value: config.value,
    description: config.description,
    quality: quality,
    qualityName: qualityInfo.name,
    qualityLevel: qualityInfo.level
  }
}

function applyRebirthTalent(newTalent) {
  const oldTalent = gameData.talents[newTalent.type]
  if (!oldTalent) {
    gameData.talents[newTalent.type] = newTalent
    return 'obtained'
  }
  if (newTalent.qualityLevel > oldTalent.qualityLevel) {
    gameData.talents[newTalent.type] = newTalent
    return 'upgraded'
  }
  return 'kept'
}

function generateRandomSpecialTalent(excludeIds) {
  const excluded = excludeIds || []
  const available = SPECIAL_TALENTS.filter(function (talent) {
    return excluded.indexOf(talent.id) === -1
  })
  if (available.length === 0) {
    return null
  }
  const index = Math.floor(Math.random() * available.length)
  return Object.assign({}, available[index])
}

function selectInheritedSpecialTalent(id) {
  if (!gameData.specialTalents.some(function (talent) { return talent.id === id })) {
    return
  }
  gameData.selectedInheritedSpecialTalentId = id
  saveAndDraw()
}

function clearInheritedSpecialTalent() {
  gameData.selectedInheritedSpecialTalentId = null
  saveAndDraw()
}

// 轮回页唯一入口：这里只确认进入“准备阶段”，绝不扣点或重置本世数据。
function clickRebirthButton() {
  if (!canRebirth()) {
    showMessage('筑基后才能进行轮回重生')
    return
  }
  if(showStoryDialog({image:GAME_IMAGES.backgrounds.rebirth,imageMode:'cover',title:'轮回池',unlockKey:'rebirth_pool_first',text:'轮回池中星辉流转，前尘与来世在水面交叠。\n\n进入准备阶段不会立刻结束本世，你仍可以返回本世。',buttons:[{text:'进入准备',action:openNextLifePreparation},{text:'暂不轮回',color:'#737a70',action:function(){drawGame()}}]}))return
  platform.showModal({
    title: '开始轮回',
    content: '即将进入下一世准备阶段。\n\n当前这一世不会立即结束，\n你可以选择下一世的出身、祝福和天赋。',
    confirmText: '进入准备',
    cancelText: '取消',
    success: function (res) {
      if (res.confirm) openNextLifePreparation()
    }
  })
}

function openNextLifePreparation() {
  // 只由 clickRebirthButton 调用；此函数只初始化临时选择，不产生永久变化。
  resetNextLifePreparation()
  isPreparingRebirth=true; rebirthPreparationSubmitting=false; rebirthPrepareTab='origin'; rebirthPrepareScrollY=0
  currentPage='rebirth_prepare'
  if(!gameData.hasShownRebirthPrepareGuide){gameData.hasShownRebirthPrepareGuide=true;saveGame();platform.showModal({title:'下一世准备',content:'点击按钮进行选择，长按按钮可查看详细效果。所有费用只在最终确认后扣除。',showCancel:false})}
  drawGame()
}
function cancelNextLifePreparation() {
  if(rebirthPreparationSubmitting)return
  resetNextLifePreparation();isPreparingRebirth=false;currentPage='rebirth';saveAndDraw()
}
function buildNextLifePreparationSummary() {
  const p=gameData.nextLifePreparation,bg=REBIRTH_BACKGROUNDS.find(b=>b.id===p.backgroundId)||REBIRTH_BACKGROUNDS[0]
  const blessings=p.blessingIds.map(id=>(REBIRTH_BLESSINGS.find(b=>b.id===id)||{}).name).filter(Boolean)
  const labels={cultivation:'修炼',breakthrough:'突破',adventure:'历练',combat:'战斗'}
  const destiny=DESTINY_EVENTS.find(d=>d.id===p.destinyEventId)
  return '出生：'+bg.name+'\n祝福：'+(blessings.join('、')||'无')+'\n常规天赋：'+(p.lockedRegularTalentType?'锁定'+labels[p.lockedRegularTalentType]:'随机')+'\n特殊天赋：'+(p.specialTalentChoiceCount===1?'随机1个':p.specialTalentChoiceCount+'选1')+'\n额外继承：'+(p.extraInheritedSpecialTalentId?'已选择':'无')+'\n气运：'+(p.fortuneId?(REBIRTH_FORTUNES.find(f=>f.id===p.fortuneId)||{}).name:'免费随机')+'\n命运事件：'+(destiny?destiny.name:'无')
}

// 返回空字符串表示配置完整；否则返回玩家可以直接理解的阻止原因。
function getRebirthValidationError() {
  if(!canRebirth())return '筑基后才能进行轮回重生'
  if(currentPage!=='rebirth_prepare'||!isPreparingRebirth)return '请先从轮回页面进入下一世准备'
  const p=gameData.nextLifePreparation
  if(!p||typeof p!=='object')return '下一世准备数据已失效，请返回本世后重新进入'
  if(!REBIRTH_BACKGROUNDS.some(function(item){return item.id===p.backgroundId}))return '请选择出生背景'
  if(p.lockedRegularTalentType!==null&&['cultivation','breakthrough','adventure','combat'].indexOf(p.lockedRegularTalentType)<0)return '请选择常规天赋'
  if([1,2,3,5].indexOf(p.specialTalentChoiceCount)<0)return '请选择特殊天赋方案'
  if(p.fortuneMode==='choose'&&!REBIRTH_FORTUNES.some(function(item){return item.id===p.fortuneId}))return '请选择气运，或改为免费随机'
  if(['random','choose'].indexOf(p.fortuneMode)<0)return '请选择气运'
  if(p.extraInheritedSpecialTalentId&&!gameData.specialTalents.some(function(item){return item.id===p.extraInheritedSpecialTalentId}))return '继承的特殊天赋已失效，请重新选择'
  const cost=getNextLifePreparationCost()
  if(gameData.rebirthPoints<cost)return '轮回点不足，还需要 '+(cost-gameData.rebirthPoints)+' 点'
  return ''
}
function canExecuteRebirth(){return getRebirthValidationError()===''}

function confirmStartNextLife() {
  if(rebirthPreparationSubmitting||rebirthConfirmOpen){showMessage('轮回正在处理中，请勿重复点击');return}
  const reason=getRebirthValidationError()
  if(reason){platform.showModal({title:'无法开始下一世',content:reason,showCancel:false,confirmText:'继续选择'});return}
  const cost=getNextLifePreparationCost()
  rebirthConfirmOpen=true
  platform.showModal({title:'确认开启下一世',content:buildNextLifePreparationSummary()+'\n\n本次消耗轮回点：'+cost+'\n轮回后剩余：'+(gameData.rebirthPoints-cost),confirmText:'开启下一世',cancelText:'继续调整',success:function(result){rebirthConfirmOpen=false;if(result.confirm)executePreparedRebirth()},fail:function(){rebirthConfirmOpen=false}})
}
function executePreparedRebirth() {
  if(rebirthPreparationSubmitting)return
  const reason=getRebirthValidationError()
  if(reason){showMessage('无法开始下一世：'+reason);return}
  rebirthPreparationSubmitting=true
  const cost=getNextLifePreparationCost()
  if(!spendRebirthPoints(cost,'完成下一世准备')){rebirthPreparationSubmitting=false;return}
  const preparation=JSON.parse(JSON.stringify(gameData.nextLifePreparation))
  const inheritedIds=[gameData.selectedInheritedSpecialTalentId,preparation.extraInheritedSpecialTalentId].filter(Boolean)
  const choices=generateSpecialTalentChoices(preparation.specialTalentChoiceCount,inheritedIds)
  if(preparation.specialTalentChoiceCount>1&&choices.length){
    gameData.pendingSpecialTalentChoices=choices
    gameData.pendingRebirthPreparation=preparation
    rebirthPageScrollY=0
    currentPage='special_talent_choice';saveAndDraw();return
  }
  beginPreparedRebirth(preparation,choices[0]||null)
}

function beginPreparedRebirth(preparation, selectedNewSpecialTalent) {
  // 保留快照供本函数中的既有祝福判断读取，随后会在结算末尾恢复默认值。
  gameData.nextLifePreparation=preparation
  const quality = getRebirthQuality()
  const talent = generateRebirthTalent(quality, preparation.lockedRegularTalentType)
  const oldTalent = gameData.talents[talent.type]
  const applyResult = applyRebirthTalent(talent)
  const inheritedTalent = gameData.specialTalents.find(function (specialTalent) {
    return specialTalent.id === gameData.selectedInheritedSpecialTalentId
  })
  // 先记录洞府继承等级，避免本轮数据重置后丢失原始等级。
  const inheritedMansionLevel = Math.max(1, Math.floor(gameData.mansionLevel * (hasNextLifeBlessing('mansion_inheritance') ? 0.30 : 0.20)))

  // 正常继承一个，额外继承一个（可选），再加入玩家选中的新特殊天赋。
  gameData.specialTalents = []
  if (inheritedTalent) {
    gameData.specialTalents.push(Object.assign({}, inheritedTalent))
  }
  const sourceExtra=preparation.extraInheritedSpecialTalentId&&preparation.extraInheritedSpecialTalentId!==gameData.selectedInheritedSpecialTalentId?SPECIAL_TALENTS.find(function(t){return t.id===preparation.extraInheritedSpecialTalentId}):null
  if(sourceExtra)gameData.specialTalents.push(Object.assign({},sourceExtra))
  const newSpecialTalent = selectedNewSpecialTalent || generateRandomSpecialTalent(gameData.specialTalents.map(function(t){return t.id}))
  if (newSpecialTalent) {
    gameData.specialTalents.push(newSpecialTalent)
    gameData.discoveredSpecialTalents[newSpecialTalent.id] = true
  }
  if (inheritedTalent) gameData.discoveredSpecialTalents[inheritedTalent.id] = true

  gameData.rebirthCount += 1
  gameData.lifetimeStats.totalRebirths += 1
  gameData.highestRealmIndex = Math.max(gameData.highestRealmIndex, gameData.realmIndex)

  // 重置所有本轮资源；轮回次数、历史最高境界和 talents 保持不变。
  gameData.cultivation = 0
  gameData.clickPower = getClickPowerBySkillLevel(1)
  gameData.autoPower = 0
  gameData.skillLevel = 1
  randomSpiritRoot(hasSpecialTalent('heavenly_root_rebirth'))
  let initialTechniqueElement=gameData.spiritRoots[0]
  if(preparation.backgroundId==='sword_family'&&Math.random()<.7){initialTechniqueElement='metal';if(gameData.spiritRoots.indexOf('metal')<0)gameData.spiritRoots[gameData.spiritRoots.length-1]='metal'}
  gameData.currentTechnique = getRandomTechnique(initialTechniqueElement, '洪阶')
  if(preparation.backgroundId==='cultivation_family')improveTechniqueQuality(gameData.currentTechnique)
  if(preparation.backgroundId==='ancient_heritage')addRandomTechniqueEffect(gameData.currentTechnique)
  gameData.techniqueCollection = []
  gameData.lastTechniqueRewardPositionIndex = 0
  gameData.sect = { joined:true, contribution:0, dailyTasks:[], completedTasks:0, shopRefreshTime:0, sectLevel:1, sectFavor:0, lastTaskRefreshDate:'', shopEquipmentStock:[], secretCooldownEndTime:0, forgeMaterials:0 }
  gameData.sectTaskRefreshTime = 0
  gameData.sectContribution = 0
  gameData.arrayLevel = 0
  gameData.realmIndex = 0
  gameData.spiritStone = 0
  gameData.pillCount = 0
  gameData.pillBuffEndTime = 0
  gameData.adventureCooldownEndTime = 0
  gameData.bossCooldownEndTime = 0
  gameData.injuryStatus = 'none'
  gameData.injuryEndTime = 0
  gameData.selectedMapId = 'qingyun'
  gameData.mansionLevel = inheritedMansionLevel
  gameData.guardStoneProgress = 0
  gameData.lastGuardRewardTime = Date.now()
  gameData.lastUpdateTime = gameData.lastGuardRewardTime
  gameData.equipmentSlots = { weapon: null, armor: null, shoes: null, accessory: null }
  // 宗门属于本世成长内容，下一世重新从基础宗门进度开始。
  gameData.primordialSpirit = { level:1, exp:0, breakthroughCount:0, trialLevel:0, equippedAbilityIds:[], trialCooldownEndTime:0 }
  gameData.lawSystem = { selectedLawId:null, lawLevels:{life:0,destruction:0,space:0,time:0,fortune:0}, lawFragments:0, tribulationLevel:0, tribulationCooldownEndTime:0 }
  gameData.selectedInheritedSpecialTalentId = null
  gameData.failedBreakthroughBonus = 0
  gameData.postInjuryBuffEndTime = 0
  gameData.manualCultivationCount = 0
  gameData.nextEnlightenmentTime = hasSpecialTalent('sudden_enlightenment')
    ? Date.now() + 60 * 1000
    : 0
  gameData.enlightenmentReady = false
  gameData.battleBuffEndTime = 0
  gameData.temporaryBreakthroughBonus = 0
  gameData.cultivationPath = null
  gameData.pendingEventId = null
  gameData.runEquipmentChanceBonus = 0
  gameData.runCultivationBonus = 0
  gameData.runBreakthroughPenalty = 0
  gameData.runStats = createDefaultRunStats()
  gameData.runTasks = generateRunTasks()
  gameData.currentLifeBackgroundId = preparation.backgroundId
  // 未指定气运时仍随机发放一项免费气运。
  gameData.currentLifeFortuneId = preparation.fortuneId || REBIRTH_FORTUNES[Math.floor(Math.random()*REBIRTH_FORTUNES.length)].id
  gameData.currentLifeDestinyEventId = preparation.destinyEventId
  gameData.destinyEventTriggered = false
  if (hasNextLifeBlessing('stone_bag')) gameData.spiritStone += 500
  if (hasNextLifeBlessing('pill_gourd')) gameData.pillCount += 3
  if (hasNextLifeBlessing('cultivation_infusion')) gameData.cultivation += 500
  if (hasNextLifeBlessing('array_inheritance')) { gameData.arrayLevel=3;gameData.autoPower=3 }
  if (hasNextLifeBlessing('skill_inheritance')) { gameData.skillLevel=3;gameData.clickPower=getClickPowerBySkillLevel(3) }
  if (hasNextLifeBlessing('equipment_blessing')) autoEquip(generateEquipment([{rank:'洪阶',weight:100}]))
  if (preparation.backgroundId==='cultivation_family') gameData.spiritStone += 500
  gameData.currentTechnique.level=gameData.skillLevel
  gameData.discoveredTechniques[gameData.currentTechnique.name]=true
  gameData.lastTechniqueRewardPositionIndex=Math.max(0,Math.min(SECT_POSITIONS.length-1,Math.floor(Number(gameData.lastTechniqueRewardPositionIndex)||0)))
  gameData.nextLifePreparation = createDefaultNextLifePreparation()
  gameData.pendingSpecialTalentChoices=[]
  gameData.pendingRebirthPreparation=null
  rebirthPreparationSubmitting=false
  isPreparingRebirth=false
  delete gameData.heavyInjuryShieldUsed
  // 页面属于本轮临时状态，轮回后回到默认修炼页。
  currentPage = 'cultivate'
  sectPage = 'home'
  mapPage = 0
  checkAchievements()

  let resultText = '你踏入轮回，获得' + talent.qualityName + '天赋【' + talent.name + '】：' + talent.description + '。'
  if (applyResult === 'upgraded') {
    resultText = '你踏入轮回，获得' + talent.qualityName + '天赋【' + talent.name + '】，替换了' + oldTalent.qualityName + '天赋【' + oldTalent.name + '】。' + talent.description + '。'
  } else if (applyResult === 'kept') {
    resultText = '你踏入轮回，获得' + talent.qualityName + '天赋【' + talent.name + '】，但已有更高或同品质的' + oldTalent.qualityName + '天赋【' + oldTalent.name + '】，因此保留原天赋。'
  }
  if (inheritedTalent) {
    resultText += '继承特殊天赋【' + inheritedTalent.name + '】成功。'
  }
  if (newSpecialTalent) {
    resultText += '本次获得特殊天赋【' + newSpecialTalent.name + '】：' + newSpecialTalent.description
  }

  // 本轮见闻清空后写入轮回结果，便于玩家回顾本次永久收获。
  gameData.adventureLogs = []
  gameData.adventureLog = ''
  addAdventureLog(resultText)
  saveAndDraw()
  platform.showModal({ title: '轮回完成', content: resultText, showCancel: false })
}

function breakthrough() {
  if (gameData.realmIndex >= REALMS.length - 1) {
    showMessage('已达到最高境界')
    return
  }

  const realm = REALMS[gameData.realmIndex]
  if (gameData.cultivation < realm.cost) {
    showMessage('修为不足，无法突破')
    return
  }

  // 概率突破会叠加战斗力和宗门职位加成，最高仍限制为 95%。
  const chance = getBreakthroughChance(realm)
  if (Math.random() >= chance) {
    gameData.cultivation = realm.chance && hasSpecialTalent('defy_fate')
      ? Math.floor(gameData.cultivation * 0.50)
      : 0
    if (realm.chance) {
      gameData.temporaryBreakthroughBonus = 0
    }
    if (realm.chance && hasSpecialTalent('accumulated_breakthrough')) {
      gameData.failedBreakthroughBonus = Math.min(
        0.20,
        gameData.failedBreakthroughBonus + 0.05
      )
    }
    // 炼气九层和筑基后期是冲击大境界，失败后会进入重伤。
    const isMajorBreakthrough =
      realm.name === '炼气九层' ||
      realm.name === '筑基后期' ||
      realm.name === '金丹后期' ||
      realm.name === '元婴后期'
    if (isMajorBreakthrough) {
      setInjury('heavy', 60)
      addAdventureLog('你冲击大境界失败，经脉受损，身受重伤。')
    } else {
      setInjury('light', 30)
      addAdventureLog('你突破失败，气血翻涌，受了轻伤。')
    }
    const failureText = realm.chance && hasSpecialTalent('defy_fate')
      ? '突破失败，逆天改命保留了50%当前修为，并进入重伤状态。'
      : '突破失败，当前修为已全部清空，并进入重伤状态。'
    addAdventureLog(failureText)
    saveAndDraw()
    platform.showModal({
      title: '突破失败',
      content: failureText,
      showCancel: false
    })
    return
  }

  const previousRealmIndex = gameData.realmIndex
  gameData.cultivation -= realm.cost
  gameData.realmIndex += 1
  if (realm.chance) {
    gameData.temporaryBreakthroughBonus = 0
  }
  if (realm.chance && hasSpecialTalent('accumulated_breakthrough')) {
    gameData.failedBreakthroughBonus = 0
  }
  // 每次成功突破都记录历史最高境界，轮回后也不会丢失。
  gameData.highestRealmIndex = Math.max(
    gameData.highestRealmIndex,
    gameData.realmIndex
  )
  const newRealm = REALMS[gameData.realmIndex]
  const spiritStoneReward = gameData.realmIndex * 100
  gameData.spiritStone += spiritStoneReward
  let breakthroughMessage =
    '你突破到了' + newRealm.name + '，修炼速度提升，获得灵石 +' + spiritStoneReward + '。'
  if(isSystemUnlocked('sect'))addSectContribution(100*getMajorRealmLevel(),50)

  // 一步登天只能在同一大境界内额外突破，绝不会跨入下一个大境界。
  const nextRealmIndex = gameData.realmIndex + 1
  if (
    hasSpecialTalent('double_breakthrough') &&
    nextRealmIndex < REALMS.length &&
    getMajorRealmLevelByIndex(previousRealmIndex) === getMajorRealmLevelByIndex(gameData.realmIndex) &&
    getMajorRealmLevelByIndex(gameData.realmIndex) === getMajorRealmLevelByIndex(nextRealmIndex) &&
    !REALMS[gameData.realmIndex].chance &&
    Math.random() < 0.10
  ) {
    gameData.realmIndex += 1
    gameData.highestRealmIndex = Math.max(
      gameData.highestRealmIndex,
      gameData.realmIndex
    )
    breakthroughMessage += '一步登天触发！你额外突破到了' + REALMS[gameData.realmIndex].name + '。'
  }
  // 跨越大境界后更新宗门装备兑换池，让新境界对应的品阶及时出现。
  if (getMajorRealmLevelByIndex(previousRealmIndex)!==getMajorRealmLevelByIndex(gameData.realmIndex)) {
    gameData.sect.shopEquipmentStock=generateSectEquipmentStock()
    breakthroughMessage += ' 宗门装备兑换已随新境界更新。'
  }
  const unlockText=getNextMajorRealmUnlockText(previousRealmIndex,gameData.realmIndex)
  const noticeKeys={1:'qi',2:'foundation',3:'core',4:'nascent',5:'deity'}
  const major=getMajorRealmLevel()
  if(unlockText&&!gameData.systemUnlockNotices[noticeKeys[major]]){gameData.systemUnlockNotices[noticeKeys[major]]=true;breakthroughMessage+=' 新系统解锁：'+unlockText+'。'}
  addAdventureLog(breakthroughMessage)
  updateRunTaskProgress('reach_realm', 1)
  updateRunTaskProgress('challenge', 1)
  checkAchievements()
  saveAndDraw()
  const finalRealm=REALMS[gameData.realmIndex]
  if(!showStoryDialog({image:GAME_IMAGES.backgrounds.cultivate,imageMode:'cover',title:'破境成功',unlockKey:'breakthrough_'+finalRealm.name,text:'灵气汇聚，经脉轰鸣。\n\n你成功突破至【'+finalRealm.name+'】！\n修炼速度与战斗力随之大涨。'+(unlockText?'\n\n新系统解锁：'+unlockText:''),buttons:[{text:'继续修行',action:function(){drawGame()}}]}))showMessage('突破到了' + finalRealm.name)
}

// 数值计算工具。
function getSkillCost() {
  const level = Math.max(1, Math.floor(gameData.skillLevel))
  const majorRealmMultiplier = [1, 1, 4, 20, 100, 500][getMajorRealmLevel()] || 1
  return getSafeGrowthCost(20 * Math.pow(level, 2.2) * majorRealmMultiplier)
}

function getArrayCost() {
  const level = Math.max(1, Math.floor(gameData.arrayLevel) + 1)
  const majorRealmMultiplier = [1, 1, 5, 25, 150, 1000][getMajorRealmLevel()] || 1
  return getSafeGrowthCost(100 * Math.pow(level, 1.8) * majorRealmMultiplier * getLifeBackgroundArrayCostRate())
}

function getSafeGrowthCost(value) {
  return Number.isFinite(value)
    ? Math.min(Number.MAX_SAFE_INTEGER, Math.floor(value))
    : Number.MAX_SAFE_INTEGER
}

function getClickPowerBySkillLevel(level) {
  const safeLevel = Math.max(1, Math.floor(level))
  // 新玩家首次修炼即可获得 10 点修为，正好满足凡人突破炼气的条件。
  return Math.max(10, Math.floor(10 * Math.pow(1.18, safeLevel - 1)))
}

function randomSpiritRoot(forceSingle){const ids=SPIRIT_ROOT_TYPES.map(function(x){return x.id});const roll=Math.random();const count=forceSingle?1:roll<.05?1:roll<.20?2:roll<.50?3:roll<.85?4:5;for(let i=ids.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));const t=ids[i];ids[i]=ids[j];ids[j]=t}gameData.spiritRoots=ids.slice(0,count);return gameData.spiritRoots}
function getSpiritRootMultiplier(){const n=(gameData.spiritRoots||[]).length;return n===1?2:n===2?1.5:n===3?1.2:n===4?1:.8}
function getSpiritRootText(){const roots=gameData.spiritRoots||[];const names=roots.map(function(id){return (SPIRIT_ROOT_TYPES.find(function(x){return x.id===id})||{}).color||id});if(roots.length===1)return '天灵根·'+names[0];if(roots.length===2)return '双灵根·'+names.join('');if(roots.length===3)return '三灵根·'+names.join('');if(roots.length===5)return '杂灵根';return '四灵根·'+names.join('')}
function canUseTechniqueElement(element){const roots=gameData.spiritRoots||[];return roots.length===5||roots.indexOf(element)>=0}
function getRandomTechnique(element,rankName){const elementId=element||gameData.spiritRoots[Math.floor(Math.random()*gameData.spiritRoots.length)]||'fire';const rank=rankName||'洪阶',range=TECHNIQUE_EFFECT_RANGE[rank]||[.05,.1],quality=['low','middle','high'][Math.floor(Math.random()*3)],effectCount=quality==='high'?2:quality==='middle'?1:0,effects=[],pool=TECHNIQUE_EFFECTS.slice();for(let i=0;i<effectCount;i++){const source=pool.splice(Math.floor(Math.random()*pool.length),1)[0];effects.push({type:source.type,name:source.name,value:source.range[0]+Math.random()*(source.range[1]-source.range[0])})}return {id:'technique_'+Date.now()+'_'+Math.floor(Math.random()*100000),name:TECHNIQUE_NAMES[elementId][Math.floor(Math.random()*TECHNIQUE_NAMES[elementId].length)],element:elementId,rank:rank,quality:quality,level:1,baseRate:range[0]+Math.random()*(range[1]-range[0]),effects:effects}}
// 基础功法效果与“修炼增幅”词条分开计算，详情页能准确展示每一项来源。
function getTechniqueBaseCultivationRate(){const t=gameData.currentTechnique;if(!t)return 1;return 1+(t.baseRate||0)+(t.level-1)*.02}
function getTechniqueEffectCultivationRate(){return 1+getTechniqueEffectRate('cultivation')}
function getTechniqueCultivationRate(){return getTechniqueBaseCultivationRate()*getTechniqueEffectCultivationRate()}
function getTechniqueEffectRate(type){const t=gameData.currentTechnique;if(!t)return 0;return (t.effects||[]).filter(function(e){return e.type===type}).reduce(function(sum,e){return sum+(Number(e.value)||0)},0)}
function getTechniqueQualityName(quality){return quality==='high'?'上品':quality==='middle'?'中品':'下品'}
function improveTechniqueQuality(technique){if(!technique)return;if(technique.quality==='low')technique.quality='middle';else if(technique.quality==='middle')technique.quality='high'}
function addRandomTechniqueEffect(technique){if(!technique)return;const used=(technique.effects||[]).map(function(item){return item.type}),pool=TECHNIQUE_EFFECTS.filter(function(item){return used.indexOf(item.type)<0});if(!pool.length)return;const source=pool[Math.floor(Math.random()*pool.length)];technique.effects=technique.effects||[];technique.effects.push({type:source.type,name:source.name,value:source.range[0]+Math.random()*(source.range[1]-source.range[0])})}
function getTechniqueDisplayName(){const t=gameData.currentTechnique;return t?t.rank+getTechniqueQualityName(t.quality)+'·'+t.name:'未修炼功法'}
function showCurrentTechniqueDetail(){if(!gameData.currentTechnique){showMessage('当前没有功法');return}currentPage='technique';drawGame()}

function formatRate(rate){return (Number(rate)||1).toFixed(2)}
function getCultivationSpeedBreakdown(){
  const items=[
    {name:'基础',rate:1},
    {name:'境界',rate:REALMS[gameData.realmIndex].cultivateRate},
    {name:'灵根',rate:getSpiritRootMultiplier(),highlight:true},
    {name:'功法',rate:getTechniqueBaseCultivationRate(),highlight:true},
    {name:'功法词条',rate:getTechniqueEffectCultivationRate(),highlight:true},
    {name:'常规天赋 / 轮回印记',rate:getCultivationTalentRate()},
    {name:'洞府',rate:getMansionCultivationRate()},
    {name:'累计轮回点',rate:getTotalRebirthPointCultivationRate()},
    {name:'元神',rate:getPrimordialSpiritCultivationRate()},
    {name:'气运 / 本轮事件',rate:getLifeFortuneCultivationRate()*(1+gameData.runCultivationBonus)},
    {name:'特殊天赋',rate:hasSpecialTalent('spirit_body_awakened')?1.5:1},
    {name:'聚气丹 / 伤后增益',rate:(Date.now()<gameData.pillBuffEndTime?1.5:1)*(Date.now()<gameData.postInjuryBuffEndTime?1.5:1)}
  ]
  const total=items.reduce(function(value,item){return value*item.rate},1)
  return {items:items,total:total}
}

function getCultivationGain(basePower) {
  const realmRate = REALMS[gameData.realmIndex].cultivateRate
  const pillRate = Date.now() < gameData.pillBuffEndTime ? 1.5 : 1
  const postInjuryRate = Date.now() < gameData.postInjuryBuffEndTime ? 1.5 : 1

  // 最终收益向下取整；只要基础收益大于 0，最低获得 1 点修为。
  // 自动修炼尚未解锁时 basePower 为 0，因此仍然返回 0。
  if (basePower <= 0) {
    return 0
  }
  return Math.max(
    1,
    Math.floor(
      basePower * realmRate * getSpiritRootMultiplier() * getTechniqueCultivationRate() * (hasSpecialTalent('spirit_body_awakened')?1.5:1) * pillRate * getCultivationTalentRate() *
      getMansionCultivationRate() * getTotalRebirthPointCultivationRate() *
      getPrimordialSpiritCultivationRate() * getLifeFortuneCultivationRate() * (1 + gameData.runCultivationBonus) * postInjuryRate
    )
  )
}

// 区分真实点击和自我管理，避免苦修之道错误加成到模拟点击。
function getManualCultivationGain(basePower, isPlayerClick) {
  let gain = getCultivationGain(basePower)
  if (isPlayerClick) {
    gain *= getSwordPathManualRate() * getFormationPathManualRate()
  }
  if (isPlayerClick && hasSpecialTalent('ascetic_path')) {
    gain *= 10
  }
  return Math.max(0, Math.floor(gain))
}

// 自动修炼在原本收益的基础上，再乘以受伤的修炼倍率。
function getAutoCultivationGain(basePower) {
  // 苦修之道封印聚灵阵等所有使用本函数的自动修炼收益。
  if (hasSpecialTalent('ascetic_path')) {
    return 0
  }
  if (basePower <= 0) {
    return 0
  }
  const realmRate = REALMS[gameData.realmIndex].cultivateRate
  const pillRate = Date.now() < gameData.pillBuffEndTime ? 1.5 : 1
  const postInjuryRate = Date.now() < gameData.postInjuryBuffEndTime ? 1.5 : 1
  let gain = Math.max(
    1,
    Math.floor(
      basePower * realmRate * getSpiritRootMultiplier() * getTechniqueCultivationRate() * (hasSpecialTalent('spirit_body_awakened')?1.5:1) * pillRate * getCultivationTalentRate() *
      getMansionCultivationRate() * getTotalRebirthPointCultivationRate() *
      getPrimordialSpiritCultivationRate() * getLifeFortuneCultivationRate() * (1 + gameData.runCultivationBonus) * postInjuryRate *
      getInjuryCultivationRate()
    )
  )
  if (Date.now() < gameData.pillBuffEndTime && hasSpecialTalent('pill_resonance')) {
    gain = Math.max(1, Math.floor(gain * 1.5))
  }
  return Math.max(0, Math.floor(gain * getSwordPathAutoRate() * getFormationPathAutoRate()))
}

function getInjuryCultivationRate() {
  if (gameData.injuryStatus === 'light') {
    return 0.5
  }
  if (gameData.injuryStatus === 'heavy') {
    return 0.2
  }
  return 1
}

function getInjuryCombatRate() {
  if (gameData.injuryStatus === 'light') {
    return 0.7
  }
  if (gameData.injuryStatus === 'heavy') {
    return 0.4
  }
  return 1
}

// 基础战斗力不受伤势影响，便于和当前战斗力做对比。
function getBaseCombatPower() {
  const realm = REALMS[gameData.realmIndex]
  let realmBasePower = realm.basePower
  if (hasSpecialTalent('next_realm_power') && gameData.realmIndex < REALMS.length - 1) {
    realmBasePower = REALMS[gameData.realmIndex + 1].basePower
  }
  const rawPower =
    realmBasePower +
    gameData.skillLevel * 10 +
    gameData.arrayLevel * 5 +
    getEquipmentPower()
  let power = Math.floor(rawPower * getCombatTalentRate() * (1 + getTechniqueEffectRate('combat')))
  if (hasSpecialTalent('mansion_resonance')) {
    const mansionStages = Math.floor(gameData.mansionLevel / 10)
    power = Math.floor(power * Math.min(2, 1 + mansionStages * 0.05))
  }
  if (Date.now() < gameData.battleBuffEndTime) {
    power = Math.floor(power * 1.30)
  }
  return Math.floor(power * getSwordPathCombatRate() * getAlchemyPathCombatRate() * getLifeFortuneCombatRate() * getPrimordialSpiritCombatRate() * (1 + getLawLevel('destruction') * 0.03))
}

// 四个装备位中已穿戴装备的战斗力总和。
function getEquipmentPower() {
  let totalPower = 0
  for (let i = 0; i < EQUIPMENT_SLOTS.length; i++) {
    const slot = EQUIPMENT_SLOTS[i].id
    const equipment = gameData.equipmentSlots[slot]
    if (equipment) {
      let power = equipment.power
      if (
        (slot === 'weapon' && hasSpecialTalent('sword_heart')) ||
        (slot === 'armor' && hasSpecialTalent('diamond_body')) ||
        (slot === 'shoes' && hasSpecialTalent('void_step')) ||
        (slot === 'accessory' && hasSpecialTalent('heavenly_accessory'))
      ) {
        power *= 2
      }
      if (slot === 'weapon') {
        power *= getSwordPathWeaponRate() * getLifeBackgroundWeaponRate()
      }
      totalPower += power
    }
  }
  return totalPower
}

function getCombatPower() {
  // 当前战斗力会用于历练奖励和受伤概率的计算。
  return Math.floor(getBaseCombatPower() * getInjuryCombatRate())
}

// 宗门职位按基础战斗力判断，因此受伤不会导致职位临时下降。
function getSectPosition() {
  const favor=gameData.sect&&Number.isFinite(gameData.sect.sectFavor)?gameData.sect.sectFavor:0
  const power = getBaseCombatPower() * (1 + Math.min(.5, favor / 10000))
  let result = SECT_POSITIONS[0]
  let resultIndex=0
  for (let i = 0; i < SECT_POSITIONS.length; i++) {
    if (power >= SECT_POSITIONS[i].needPower) {
      result = SECT_POSITIONS[i]
      resultIndex=i
    }
  }
  gameData.highestSectPositionIndex=Math.max(Number(gameData.highestSectPositionIndex)||0,resultIndex)
  if(gameData.sectAchievements){if(resultIndex>=1)gameData.sectAchievements.outer_first=true;if(resultIndex>=3)gameData.sectAchievements.core_disciple=true;if(resultIndex>=5)gameData.sectAchievements.elder=true;if(resultIndex>=7)gameData.sectAchievements.ancestor=true}
  return result
}

function getSectPositionIndex(){const position=getSectPosition();return SECT_POSITIONS.findIndex(function(item){return item.name===position.name})}
function getTechniqueRanksForSectPosition(index){if(index>=7)return ['天阶'];if(index===6)return ['地阶'];if(index===5)return ['玄阶'];if(index===4)return ['黄阶'];if(index===3)return ['宙阶','宇阶'];if(index===2)return ['洪阶','宇阶'];return []}
function offerTechnique(technique){
  gameData.discoveredTechniques[technique.name]=true
  const elder=getTechniqueStoryCharacter(technique.element)
  const accept=function(){if(gameData.currentTechnique)gameData.techniqueCollection.push(gameData.currentTechnique);gameData.currentTechnique=technique;gameData.skillLevel=technique.level;gameData.clickPower=getClickPowerBySkillLevel(technique.level);addAdventureLog('你接受传承，开始修炼【'+technique.name+'】。','talent');saveAndDraw()}
  const collect=function(){gameData.techniqueCollection.push(technique);addAdventureLog('你将【'+technique.name+'】收入功法收藏。','talent');saveAndDraw()}
  const storyText='“你的灵根资质不错，但修行之路漫长。\n\n此《'+technique.name+'》乃本峰传承，今日赐予你，望你勤加修炼。”\n\n获得：'+technique.rank+getTechniqueQualityName(technique.quality)+' · '+technique.name
  if(showStoryDialog({image:elder.image,title:elder.title,unlockKey:'technique_gift_'+technique.name,text:storyText,buttons:[{text:'接受传承',action:accept},{text:'收入收藏',color:'#737a70',action:collect}]}))return
  platform.showModal({title:'宗门赐予功法',content:'获得：'+getTechniqueDisplayText(technique)+'\n\n是否替换当前功法？',confirmText:'修炼此法',cancelText:'收入收藏',success:function(res){if(res.confirm)accept();else collect()}})
}
function getTechniqueDisplayText(t){return t.rank+getTechniqueQualityName(t.quality)+'·'+t.name+'（修炼 +'+Math.round((t.baseRate||0)*100)+'%）'}
function checkSectTechniqueReward(){if(!isSystemUnlocked('sect'))return false;const index=getSectPositionIndex();if(index<=gameData.lastTechniqueRewardPositionIndex||index<2)return false;gameData.lastTechniqueRewardPositionIndex=index;const ranks=getTechniqueRanksForSectPosition(index),rank=ranks[Math.floor(Math.random()*ranks.length)],element=gameData.spiritRoots[Math.floor(Math.random()*gameData.spiritRoots.length)];offerTechnique(getRandomTechnique(element,rank));return true}

// 战斗力越接近推荐突破战力，提供的成功率加成越高，最高 20%。
function getCombatBreakthroughBonus(realm) {
  if (!realm.recommendBreakPower) {
    return 0
  }
  return Math.min(0.20, getCombatPower() / realm.recommendBreakPower * 0.10)
}

function getCultivationTalentRate() {
  const talent = gameData.talents.cultivation
  const regularRate = talent ? 1 + talent.value : 1
  return regularRate * getRebirthMarkRate()
}

// 轮回印记没有上限：每次重生固定提供 2% 修炼收益。
function getRebirthMarkRate() {
  if (!hasSpecialTalent('rebirth_mark')) {
    return 1
  }
  return 1 + gameData.rebirthCount * 0.02
}

// 历史累计的轮回点永久提供修炼收益，每点固定 +1%，没有上限。
function getTotalRebirthPointCultivationRate() {
  const totalPoints = Math.max(0, Math.floor(Number(gameData.totalRebirthPoints) || 0))
  return 1 + totalPoints * 0.01
}

// 所有轮回点来源都走这里：可用点与累计点同步增加，累计点永远不因消费减少。
function addRebirthPoints(amount, sourceText) {
  const safeAmount = Math.max(0, Math.floor(Number(amount) || 0))
  if (safeAmount <= 0) return
  gameData.rebirthPoints += safeAmount
  gameData.totalRebirthPoints += safeAmount
  if (sourceText) {
    addAdventureLog(sourceText + '，获得轮回点 +' + safeAmount + '，累计轮回点达到 ' + gameData.totalRebirthPoints + '。')
  }
}

function createDefaultNextLifePreparation() { return { backgroundId:'wanderer', blessingIds:[], lockedRegularTalentType:null, specialTalentChoiceCount:1, extraInheritedSpecialTalentId:null, fortuneMode:'random', fortuneId:null, destinyEventId:null } }
function resetNextLifePreparation() { gameData.nextLifePreparation=createDefaultNextLifePreparation() }
function spendRebirthPoints(cost, reasonText) {
  const safeCost=Math.max(0,Math.floor(Number(cost)||0)); if(!safeCost)return true
  if(gameData.rebirthPoints<safeCost){showMessage('轮回点不足');return false}
  gameData.rebirthPoints-=safeCost
  if(reasonText)addAdventureLog('你消耗轮回点 '+safeCost+'，'+reasonText+'。')
  return true
}
function hasNextLifeBlessing(id){return gameData.nextLifePreparation.blessingIds.indexOf(id)!==-1}
function getSpecialTalentChoiceCost(count){return count===2?2:count===3?5:count===5?10:0}
function getNextLifePreparationCost(){const p=gameData.nextLifePreparation;const bg=REBIRTH_BACKGROUNDS.find(x=>x.id===p.backgroundId)||REBIRTH_BACKGROUNDS[0];let cost=bg.cost+getSpecialTalentChoiceCost(p.specialTalentChoiceCount)+(p.lockedRegularTalentType?3:0)+(p.extraInheritedSpecialTalentId?15:0);p.blessingIds.forEach(id=>{const b=REBIRTH_BLESSINGS.find(x=>x.id===id);if(b)cost+=b.cost});const d=DESTINY_EVENTS.find(x=>x.id===p.destinyEventId);return cost+(d?d.cost:0)}
function generateSpecialTalentChoices(count, excludeIds){const pool=SPECIAL_TALENTS.filter(t=>excludeIds.indexOf(t.id)===-1);const out=[];while(out.length<count&&pool.length){out.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0])}return out}
function toggleNextLifeBlessing(id){const p=gameData.nextLifePreparation;const i=p.blessingIds.indexOf(id);if(i>=0)p.blessingIds.splice(i,1);else if(p.blessingIds.length>=2)showMessage('最多选择2个开局祝福');else p.blessingIds.push(id);saveAndDraw()}
function setNextLifeBackground(id){if(REBIRTH_BACKGROUNDS.some(x=>x.id===id)){gameData.nextLifePreparation.backgroundId=id;saveAndDraw()}}
function toggleLockedRegularTalentType(type){const p=gameData.nextLifePreparation;p.lockedRegularTalentType=p.lockedRegularTalentType===type?null:type;saveAndDraw()}
function setSpecialTalentChoiceCount(count){if([1,2,3,5].indexOf(count)>=0){gameData.nextLifePreparation.specialTalentChoiceCount=count;saveAndDraw()}}

// 所有特殊天赋效果统一通过这个函数判断，避免散落遍历数组。
function hasSpecialTalent(id) {
  return gameData.specialTalents.some(function (talent) {
    return talent.id === id
  })
}

// 功法道路只在本世生效；各倍率函数集中在一起，方便新手查看叠加关系。
function getSwordPathManualRate() { return gameData.cultivationPath === 'sword' ? 1.5 : 1 }
function getSwordPathCombatRate() { return gameData.cultivationPath === 'sword' ? 1.3 : 1 }
function getSwordPathWeaponRate() { return gameData.cultivationPath === 'sword' ? 1.5 : 1 }
function getSwordPathAutoRate() { return gameData.cultivationPath === 'sword' ? 0.8 : 1 }
function getAlchemyPathPillDurationRate() { return gameData.cultivationPath === 'alchemy' ? 1.5 : 1 }
function getAlchemyPathShopRate() { return gameData.cultivationPath === 'alchemy' ? 0.7 : 1 }
function getAlchemyPathCombatRate() { return gameData.cultivationPath === 'alchemy' ? 0.9 : 1 }
function getFormationPathAutoRate() { return gameData.cultivationPath === 'formation' ? 1.5 : 1 }
function getFormationPathMansionRate() { return gameData.cultivationPath === 'formation' ? 1.5 : 1 }
function getFormationPathUpgradeCostRate() { return gameData.cultivationPath === 'formation' ? 0.8 : 1 }
function getFormationPathGuardRate() { return gameData.cultivationPath === 'formation' ? 1.3 : 1 }
function getFormationPathManualRate() { return gameData.cultivationPath === 'formation' ? 0.8 : 1 }

// 出生与气运只影响当前这一世，集中在这里便于后续继续扩展。
function hasLifeBackground(id){return gameData.currentLifeBackgroundId===id}
function hasLifeFortune(id){return gameData.currentLifeFortuneId===id}
function getLifeBackgroundPillCostRate(){return hasLifeBackground('alchemy_family')?.8:1}
function getLifeBackgroundPillDurationRate(){return hasLifeBackground('alchemy_family')?1.2:1}
function getLifeBackgroundArrayCostRate(){return hasLifeBackground('array_family')?.8:1}
function getLifeBackgroundMansionRate(){return hasLifeBackground('array_family')?1.1:1}
function getLifeBackgroundWeaponRate(){return hasLifeBackground('sword_family')?1.1:1}
function getLifeBackgroundBreakthroughBonus(){return hasLifeBackground('ancient_heritage')?.03:0}
function getLifeFortunePillDurationRate(){return hasLifeFortune('pill_fortune')?1.2:1}
function getLifeFortuneCultivationRate(){if(hasLifeFortune('envied_genius'))return 1.35;if(hasLifeFortune('late_bloomer'))return getMajorRealmLevel()>=2?1.3:.9;if(hasLifeFortune('hard_fate'))return 1.2;return 1}
function getLifeFortuneBreakthroughBonus(){if(hasLifeFortune('great_luck'))return .05;if(hasLifeFortune('envied_genius'))return -.05;return 0}
function getLifeFortuneCombatRate(){return hasLifeFortune('battle_fortune')?1.15:1}

function selectCultivationPath(pathId) {
  const path = CULTIVATION_PATHS.find(function (item) { return item.id === pathId })
  if (!path) return
  if (getMajorRealmLevel() < path.unlockMajorRealm) {
    showMessage('达到筑基期后才能选择功法道路')
    return
  }
  if (gameData.cultivationPath) {
    showMessage('本世已经选择功法道路，重生后才能重新选择')
    return
  }
  platform.showModal({ title:'选择功法道路', content:'确认选择' + path.name + '之路？本世无法免费更改。', success:function (result) {
    if (result.confirm) {
      gameData.cultivationPath = path.id
      addAdventureLog('你选择了' + path.name + '之路，本世将以此证道。')
      saveAndDraw()
    }
  } })
}

function createDefaultRunStats() {
  return { manualClicks:0, adventures:0, bossWins:0, bossFirstClears:0, overlevelWins:0, randomEvents:0, pillsUsed:0, highestEquipmentRankIndex:-1 }
}

function getTaskReward(difficulty) {
  if (difficulty === 'hard') return { spiritStone:50000, pill:3, rebirthPoint:3 }
  if (difficulty === 'medium') return { spiritStone:5000, pill:2, rebirthPoint:2 }
  return { spiritStone:500, pill:1, rebirthPoint:1 }
}

function generateRunTasks() {
  let pool = RUN_TASK_TEMPLATES.slice()
  if (!isSystemUnlocked('mansion')) pool = pool.filter(function (t) { return t[1] !== 'mansion_level' })
  // 尚未达到元婴时，不生成天阶装备任务；尚未筑基时，不生成金丹目标。
  if (gameData.highestRealmIndex < REALMS.findIndex(function (r) { return r.name === '元婴初期' })) pool = pool.filter(function (t) { return t[0] !== 'equipment_heaven' })
  if (gameData.highestRealmIndex < REALMS.findIndex(function (r) { return r.name === '筑基初期' })) pool = pool.filter(function (t) { return t[0] !== 'reach_core' })
  const tasks = []
  while (tasks.length < 3 && pool.length > 0) {
    const index = Math.floor(Math.random() * pool.length)
    const item = pool.splice(index, 1)[0]
    const task = { id:item[0], type:item[1], name:item[2], description:item[3], target:item[4], progress:0, completed:false, claimed:false, rewards:getTaskReward(item[5]) }
    if (task.type === 'reach_realm' || task.type === 'challenge') task.targetRealmName = task.target
    if (task.type === 'equipment_rank') task.targetRank = task.target
    tasks.push(task)
  }
  return tasks
}

function updateRunTaskProgress(eventType, value) {
  for (let i = 0; i < gameData.runTasks.length; i++) {
    const task = gameData.runTasks[i]
    if (task.completed) continue
    let progress = task.progress
    if (task.type === eventType) progress += value || 1
    if (task.type === 'reach_realm' || task.type === 'challenge') {
      const targetIndex = REALMS.findIndex(function (r) { return r.name === task.targetRealmName })
      progress = gameData.realmIndex >= targetIndex && (task.type !== 'challenge' || gameData.runStats.pillsUsed === 0) ? 1 : progress
    }
    if (task.type === 'mansion_level') progress = Math.max(progress, gameData.mansionLevel)
    if (task.type === 'equipment_rank') progress = Math.max(progress, gameData.runStats.highestEquipmentRankIndex)
    task.progress = progress
    const target = task.type === 'equipment_rank' ? EQUIPMENT_RANKS.findIndex(function (r) { return r.name === task.targetRank }) : (typeof task.target === 'number' ? task.target : 1)
    if (task.progress >= target) {
      task.completed = true
      addAdventureLog('本轮任务【' + task.name + '】已经完成，可以领取奖励。')
    }
  }
}

function claimRunTaskReward(taskId) {
  const task = gameData.runTasks.find(function (item) { return item.id === taskId })
  if (!task || !task.completed || task.claimed) { showMessage('该任务暂不可领取'); return }
  gameData.spiritStone += task.rewards.spiritStone || 0
  gameData.pillCount += task.rewards.pill || 0
  if (task.rewards.rebirthPoint) addRebirthPoints(task.rewards.rebirthPoint, '领取任务【' + task.name + '】奖励')
  task.claimed = true
  addAdventureLog('领取任务【' + task.name + '】奖励。')
  saveAndDraw()
}

function checkAchievements() {
  // GM运行只用于测试，不写入或触发永久成就。
  if (DEBUG_MODE && gmSessionActive) return
  const realmName = REALMS[gameData.highestRealmIndex].name
  const rankIndex = gameData.runStats.highestEquipmentRankIndex
  const conditions = {
    first_foundation: realmName.indexOf('筑基') === 0 || getMajorRealmLevelByIndex(gameData.highestRealmIndex) >= 2, first_core:getMajorRealmLevelByIndex(gameData.highestRealmIndex)>=3, first_nascent:getMajorRealmLevelByIndex(gameData.highestRealmIndex)>=4, first_deity:getMajorRealmLevelByIndex(gameData.highestRealmIndex)>=5,
    rebirth_1:gameData.rebirthCount>=1, rebirth_10:gameData.rebirthCount>=10, rebirth_50:gameData.rebirthCount>=50, click_1000:gameData.lifetimeStats.totalCultivationClicks>=1000, click_10000:gameData.lifetimeStats.totalCultivationClicks>=10000, adventure_100:gameData.lifetimeStats.totalAdventures>=100, adventure_1000:gameData.lifetimeStats.totalAdventures>=1000, boss_win_10:gameData.lifetimeStats.totalBossWins>=10, boss_win_100:gameData.lifetimeStats.totalBossWins>=100, all_boss_first_clear:getBossDefeatedCount()>=ADVENTURE_MAPS.length,
    first_yellow_equipment:rankIndex>=4, first_earth_equipment:rankIndex>=6, first_heaven_equipment:rankIndex>=7, mansion_10:gameData.mansionLevel>=10, mansion_50:gameData.mansionLevel>=50, special_talent_10:Object.keys(gameData.discoveredSpecialTalents).length>=10, special_talent_all:Object.keys(gameData.discoveredSpecialTalents).length>=30, random_event_50:gameData.lifetimeStats.totalRandomEvents>=50, overlevel_50:gameData.runStats.overlevelWins>=50, single_gain_million:gameData.lifetimeStats.highestSingleCultivationGain>=1000000
  }
  ACHIEVEMENTS.forEach(function (item) {
    const id = item[0]
    if (conditions[id] && !gameData.achievements[id].completed) {
      gameData.achievements[id] = { completed:true, claimed:false, completedAt:Date.now() }
      addAdventureLog('成就达成：【' + item[2] + '】')
    }
  })
}

function claimAchievementReward(id) {
  const config = ACHIEVEMENTS.find(function (item) { return item[0] === id })
  const state = gameData.achievements[id]
  if (!config || !state || !state.completed || state.claimed) { showMessage('该成就暂不可领取'); return }
  const reward = config[4]
  gameData.spiritStone += reward.spiritStone || 0
  if (reward.rebirthPoint) addRebirthPoints(reward.rebirthPoint, '领取成就【' + config[2] + '】奖励')
  state.claimed = true
  addAdventureLog('领取成就【' + config[2] + '】奖励。')
  saveAndDraw()
}

function activatePostInjuryBuff() {
  if (hasSpecialTalent('stronger_after_injury')) {
    gameData.postInjuryBuffEndTime = Date.now() + 60 * 1000
  }
}

function getBreakthroughTalentBonus() {
  const talent = gameData.talents.breakthrough
  return talent ? talent.value : 0
}

function getAdventureTalentRate() {
  const talent = gameData.talents.adventure
  return talent ? 1 + talent.value : 1
}

function getCombatTalentRate() {
  const talent = gameData.talents.combat
  return talent ? 1 + talent.value : 1
}

function getBreakthroughChance(realm) {
  const baseChance = realm.chance || 1
  if (!realm.chance) {
    return baseChance
  }
  const combatBonus = getCombatBreakthroughBonus(realm)
  const sectBonus = getSectPosition().breakthroughBonus
  const regularTalentBonus = getBreakthroughTalentBonus()
  const mansionBonus = getMansionBreakthroughBonus()
  const accumulatedBonus = hasSpecialTalent('accumulated_breakthrough')
    ? gameData.failedBreakthroughBonus
    : 0
  const permanentBonus = Math.min(
    0.30,
    combatBonus + sectBonus + regularTalentBonus + mansionBonus + getTechniqueEffectRate('breakthrough') + getLifeBackgroundBreakthroughBonus() + getLifeFortuneBreakthroughBonus()
  )
  const temporaryBonus = Math.min(
    0.20,
    accumulatedBonus + gameData.temporaryBreakthroughBonus
  )
  return Math.max(0.01, Math.min(0.85, baseChance + permanentBonus + temporaryBonus - gameData.runBreakthroughPenalty))
}

function getMansionUpgradeCost() {
  const level = getSafeMansionLevel()
  const cost = 300 * level * level * Math.pow(1.18, level)
  // 洞府没有等级上限；仅在数值过大时保护为安全整数，避免出现 Infinity。
  const pathCost = cost * getFormationPathUpgradeCostRate()
  return Number.isFinite(pathCost)
    ? Math.min(Number.MAX_SAFE_INTEGER, Math.floor(pathCost))
    : Number.MAX_SAFE_INTEGER
}

// 洞府升级只消耗灵石；主要提升修炼、突破和辅助能力，而不是大量产出灵石。
function upgradeMansion() {
  if(!isSystemUnlocked('mansion')){showSystemLocked('mansion');return}
  const cost = getMansionUpgradeCost()
  if (gameData.spiritStone < cost) {
    showMessage('灵石不足')
    return
  }
  gameData.spiritStone -= cost
  gameData.mansionLevel += 1
  updateRunTaskProgress('mansion_level', gameData.mansionLevel)
  checkAchievements()
  let message = '你消耗 ' + cost + ' 灵石，将洞府提升至 ' + gameData.mansionLevel + ' 级。修炼速度、突破底蕴和洞府能力得到增强。'
  if (gameData.mansionLevel % 5 === 0 || gameData.mansionLevel % 10 === 0) {
    message += '洞府底蕴突破，获得新的阶段加成。'
  }
  addAdventureLog(message)
  saveAndDraw()
}

// 将异常存档中的洞府等级安全回退，正常等级不设硬上限。
function getSafeMansionLevel() {
  if (!Number.isFinite(gameData.mansionLevel) || gameData.mansionLevel < 1) {
    return 1
  }
  return Math.floor(gameData.mansionLevel)
}

// 每级洞府提高 2% 修炼收益，最高额外 +200%。
function getMansionCultivationRate() {
  if(!isSystemUnlocked('mansion'))return 1
  const bonus = Math.min(2, getSafeMansionLevel() * 0.02) * getFormationPathMansionRate() * getLifeBackgroundMansionRate()
  return 1 + bonus
}

// 每 5 级洞府为概率突破增加 1%，最高 +15%。
function getMansionBreakthroughBonus() {
  if(!isSystemUnlocked('mansion'))return 0
  const bonus = Math.floor(getSafeMansionLevel() / 5) * 0.01
  return Math.min(0.15, bonus)
}

// 每 10 级洞府缩短 10% 受伤时间，最多缩短 50%。
function getMansionInjuryDurationRate() {
  if(!isSystemUnlocked('mansion'))return 1
  const reduceRate = Math.min(0.50, Math.floor(getSafeMansionLevel() / 10) * 0.10)
  return 1 - reduceRate
}

// 每 10 级洞府增加 2 个百分点装备掉率，最高 +10 个百分点。
function getMansionEquipmentChanceBonus() {
  if(!isSystemUnlocked('mansion'))return 0
  const bonus = Math.floor(getSafeMansionLevel() / 10) * 0.02
  return Math.min(0.10, bonus)
}

// 洞府等级提高离线镇守的结算上限，最高 12 小时。
function getOfflineGuardLimitSeconds() {
  const extraHours = Math.floor(getSafeMansionLevel() / 10)
  const totalHours = Math.min(12, 1 + extraHours)
  return totalHours * 60 * 60
}

function getGuardStonePerSecond() {
  if(!isSystemUnlocked('mansion'))return 0
  const position = getSectPosition()
  // 在线镇守不再随洞府等级线性膨胀，洞府的价值转为成长辅助与离线上限。
  let result = 0.02 * position.guardRewardRate * getFormationPathGuardRate()
  if (hasSpecialTalent('blessed_mansion')) {
    result *= 2
  }
  return result
}

// 洞府等级决定离线自动修炼的效率，只结算聚灵阵收益。
function getOfflineCultivationRate() {
  if(!isSystemUnlocked('offlineCultivation'))return 0
  const mansionLevel = getSafeMansionLevel()
  if (mansionLevel >= 50) return 0.50
  if (mansionLevel >= 40) return 0.40
  if (mansionLevel >= 30) return 0.35
  if (mansionLevel >= 20) return 0.30
  if (mansionLevel >= 10) return 0.25
  return 0.20
}

// 离线时不消耗或读取聚气丹、破而后立等临时状态，只保留永久自动修炼基础。
function getOfflineAutoCultivationGainPerSecond() {
  if (hasSpecialTalent('ascetic_path') || gameData.autoPower <= 0) {
    return 0
  }
  const realmRate = REALMS[gameData.realmIndex].cultivateRate
  const gain = gameData.autoPower * realmRate * getSpiritRootMultiplier() * getTechniqueCultivationRate() * (hasSpecialTalent('spirit_body_awakened')?1.5:1) * getCultivationTalentRate() *
    getMansionCultivationRate() * getTotalRebirthPointCultivationRate() *
    getPrimordialSpiritCultivationRate() * getLifeFortuneCultivationRate() * (1 + gameData.runCultivationBonus) * (1 + getLawLevel('time') * 0.03)
  return toSafeInteger(gain)
}

// 统一按真实时间差结算收益。前台定时器被浏览器降频时，也会补上遗漏秒数。
function calculateOfflineProgress(isOffline) {
  const result = { offlineSeconds: 0, stoneGain: 0, cultivationGain: 0 }
  const now = Date.now()
  if (!Number.isFinite(gameData.lastUpdateTime) || gameData.lastUpdateTime <= 0) {
    gameData.lastUpdateTime = now
    gameData.lastGuardRewardTime = now
    return result
  }
  let seconds = Math.floor((now - gameData.lastUpdateTime) / 1000)
  if (seconds <= 0) return result
  // 离开页面时遵守洞府的离线收益上限；前台偶发卡顿则按真实时间完整补算。
  if (isOffline) seconds = Math.min(seconds, getOfflineGuardLimitSeconds())
  seconds = Math.max(0, seconds)
  let cultivationPerSecond = isOffline
    ? getOfflineAutoCultivationGainPerSecond() * getOfflineCultivationRate()
    : getAutoCultivationGain(gameData.autoPower)
  // 自我管理本质上也是每秒一次模拟手动修炼，后台补算时同样不能遗漏。
  if (hasSpecialTalent('self_management') && gameData.injuryStatus === 'none') {
    let selfGain = getManualCultivationGain(gameData.clickPower, false)
    if (!isOffline && Date.now() < gameData.pillBuffEndTime && hasSpecialTalent('pill_resonance')) {
      selfGain = Math.max(1, Math.floor(selfGain * 1.5))
    }
    cultivationPerSecond += selfGain
  }
  const cultivationGain = toSafeInteger(seconds * cultivationPerSecond)
  gameData.guardStoneProgress += seconds * getGuardStonePerSecond()
  const stoneGain = Math.floor(gameData.guardStoneProgress)
  if (stoneGain > 0) {
    gameData.spiritStone += stoneGain
    gameData.guardStoneProgress -= stoneGain
  }
  if (cultivationGain > 0) gameData.cultivation += cultivationGain
  gameData.lastUpdateTime = now
  gameData.lastGuardRewardTime = now
  result.offlineSeconds = seconds
  result.stoneGain = stoneGain
  result.cultivationGain = cultivationGain
  return result
}

// 保留旧函数名，现有前后台流程仍能进入统一的真实时间结算。
function settleOfflineRewards() {
  return calculateOfflineProgress(true)
}

// 保留旧函数名作为兼容入口，后续旧调用也会走新的统一结算。
function settleOfflineGuardReward() {
  return settleOfflineRewards()
}

function formatOfflineDuration(seconds) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) {
    return hours + '小时' + minutes + '分钟'
  }
  return Math.max(1, minutes) + '分钟'
}

function showOfflineSettlementModal(result) {
  if (
    result.offlineSeconds <= 60 ||
    (result.stoneGain <= 0 && result.cultivationGain <= 0)
  ) {
    return
  }
  platform.showModal({
    title: '闭关结束',
    content: '离线时间：' + formatOfflineDuration(result.offlineSeconds) +
      '\n获得修为：' + formatNumber(result.cultivationGain) +
      '\n镇守洞府获得灵石：' + formatNumber(result.stoneGain),
    showCancel: false
  })
}

function getInjuryName() {
  if (gameData.injuryStatus === 'light') {
    return '轻伤'
  }
  if (gameData.injuryStatus === 'heavy') {
    return '重伤'
  }
  return '无伤'
}

function getSelectedMap() {
  const selectedMap = ADVENTURE_MAPS.find(function (map) {
    return map.id === gameData.selectedMapId
  })
  // 存档里的地图 ID 异常时，回退到第一张新手地图。
  return selectedMap || ADVENTURE_MAPS[0]
}

function getBossDefeatedCount() {
  return Object.keys(gameData.bossDefeated).filter(function (mapId) {
    return gameData.bossDefeated[mapId]
  }).length
}

// 风险表集中在一个函数里，便于新手统一调整历练难度。
function getAdventureRisk(powerRatio) {
  if (powerRatio >= 1.5) {
    return { name: '碾压', lightChance: 0, heavyChance: 0, lossRate: 0, rewardModifier: 1 }
  }
  if (powerRatio >= 1.0) {
    return { name: '稳妥', lightChance: 0.08, heavyChance: 0.02, lossRate: 0, rewardModifier: 1 }
  }
  if (powerRatio >= 0.7) {
    return { name: '勉强', lightChance: 0.20, heavyChance: 0.10, lossRate: 0, rewardModifier: 0.8 }
  }
  if (powerRatio >= 0.4) {
    return { name: '危险', lightChance: 0.35, heavyChance: 0.35, lossRate: 0.10, rewardModifier: 0.5 }
  }
  return { name: '找死', lightChance: 0.20, heavyChance: 0.70, lossRate: 0.30, rewardModifier: 0.2 }
}

// 历练完成后生成新的冷却时间；踏虚而行将其固定缩短至 10 秒。
function getAdventureCooldownSeconds() {
  const base=hasSpecialTalent('void_step')?10:20
  return Math.max(5,base-getLawLevel('space'))
}

// 奖励数值统一向下取整，并防止异常计算写入 Infinity 或 NaN。
function toSafeInteger(value) {
  if (!Number.isFinite(value)) {
    return 0
  }
  return Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.floor(value)))
}

// 设置伤势时统一换算秒数，避免不同事件写出不一致的结束时间。
function setInjury(status, seconds) {
  // 金丹前洞府、元婴前元神和化神前生命法则都不会提前生效。
  seconds=Math.max(1,Math.floor(seconds*getMansionInjuryDurationRate()*(1-getTechniqueEffectRate('injury'))*(hasDivineAbility('soul_recovery')?0.7:1)*Math.pow(0.98,getLawLevel('life'))))
  if (hasSpecialTalent('undying_body')) {
    seconds *= 0.20
  }
  // 不灭之体与洞府疗伤能力按乘法叠加，所有伤势来源都会走这里。
  seconds *= getMansionInjuryDurationRate()
  seconds = Math.max(1, Math.ceil(seconds))
  gameData.injuryStatus = status
  gameData.injuryEndTime = Date.now() + seconds * 1000
}

// 每秒检查一次伤势是否自然结束。返回值用于决定是否需要保存存档。
function refreshInjuryStatus() {
  if (
    gameData.injuryStatus !== 'none' &&
    Date.now() >= gameData.injuryEndTime
  ) {
    gameData.injuryStatus = 'none'
    gameData.injuryEndTime = 0
    activatePostInjuryBuff()
    addAdventureLog('你的伤势已经痊愈。')
    return true
  }
  return false
}

function getRemainingSeconds(endTime) {
  return Math.max(0, Math.ceil((endTime - Date.now()) / 1000))
}

function formatNumber(value) {
  if (!Number.isFinite(value)) {
    return '0'
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

// 新见闻插到最前面，只保留最近 10 条，方便存档和界面展示。
function addAdventureLog(text, type) {
  const safeText=String(text||'').trim().slice(0,500)
  if(!safeText)return
  if(!Array.isArray(gameData.adventureLogs))gameData.adventureLogs=[]
  gameData.adventureLogs.unshift({id:'log_'+Date.now()+'_'+Math.floor(Math.random()*100000),type:type||'system',text:safeText,time:Date.now()})
  gameData.adventureLogs=gameData.adventureLogs.slice(0,100)
  // 继续同步旧字段，保证旧代码和旧存档读取时也有最新一条内容。
  gameData.adventureLog = gameData.adventureLogs[0].text
  adventureLogScrollY = 0
}

// 本地存档。Object.assign 会把读取到的字段覆盖到默认数据上，
// 即使以后增加新字段，旧存档也仍然可以继续使用。
function saveGame() {
  updateHighestCombatPower()
  // GM测试数据仅保留在内存中，绝不覆盖玩家的正常本地存档。
  if (DEBUG_MODE && gmSessionActive) return
  platform.setStorageSync(SAVE_KEY, gameData)
}

function loadGame() {
  const savedData = platform.getStorageSync(SAVE_KEY)
  if (savedData) {
    Object.assign(gameData, savedData)
  }

  // 图片剧情只保存“是否看过”，图片对象本身绝不写入本地存档。
  if (!gameData.unlockedImages || typeof gameData.unlockedImages !== 'object') {
    gameData.unlockedImages = {}
  }

  // 防止异常存档让境界下标超出范围。
  gameData.realmIndex = Math.max(
    0,
    Math.min(gameData.realmIndex, REALMS.length - 1)
  )
  // 旧存档的聚气丹统一收敛到本世 10 颗上限。
  gameData.pillCount = Math.min(MAX_GATHERING_PILLS, Math.max(0, Math.floor(Number(gameData.pillCount) || 0)))

  // 旧存档没有受伤字段时会保留默认值；异常值也会自动修正。
  if (['none', 'light', 'heavy'].indexOf(gameData.injuryStatus) === -1) {
    gameData.injuryStatus = 'none'
  }
  if (typeof gameData.injuryEndTime !== 'number') {
    gameData.injuryEndTime = 0
  }

  // 兼容旧存档：装备和地图字段不存在时补齐默认值。
  if (!gameData.equipmentSlots || typeof gameData.equipmentSlots !== 'object') {
    gameData.equipmentSlots = {}
  }
  // 新系统字段兼容：旧存档保留原数据，只补齐本世元神和法则结构。
  if(!gameData.systemUnlockNotices||typeof gameData.systemUnlockNotices!=='object')gameData.systemUnlockNotices={qi:false,foundation:false,core:false,nascent:false,deity:false}
  ;['qi','foundation','core','nascent','deity'].forEach(function(id){gameData.systemUnlockNotices[id]=!!gameData.systemUnlockNotices[id]})
  if(!gameData.primordialSpirit||typeof gameData.primordialSpirit!=='object')gameData.primordialSpirit={}
  const spirit=gameData.primordialSpirit;spirit.level=Math.max(1,Math.floor(Number(spirit.level)||1));spirit.exp=Math.max(0,Math.floor(Number(spirit.exp)||0));spirit.breakthroughCount=Math.max(0,Math.floor(Number(spirit.breakthroughCount)||0));spirit.trialLevel=Math.max(0,Math.floor(Number(spirit.trialLevel)||0));spirit.trialCooldownEndTime=Math.max(0,Number(spirit.trialCooldownEndTime)||0);if(!Array.isArray(spirit.equippedAbilityIds))spirit.equippedAbilityIds=[];spirit.equippedAbilityIds=spirit.equippedAbilityIds.filter(function(id){return DIVINE_ABILITIES.some(function(a){return a.id===id})}).slice(0,3)
  if(!gameData.discoveredDivineAbilities||typeof gameData.discoveredDivineAbilities!=='object')gameData.discoveredDivineAbilities={}
  if(!gameData.lawSystem||typeof gameData.lawSystem!=='object')gameData.lawSystem={};const law=gameData.lawSystem;if(!LAW_CONFIG.some(function(x){return x.id===law.selectedLawId}))law.selectedLawId=null;if(!law.lawLevels||typeof law.lawLevels!=='object')law.lawLevels={};LAW_CONFIG.forEach(function(item){law.lawLevels[item.id]=Math.max(0,Math.min(20,Math.floor(Number(law.lawLevels[item.id])||0)))});law.lawFragments=Math.max(0,Math.floor(Number(law.lawFragments)||0));law.tribulationLevel=Math.max(0,Math.floor(Number(law.tribulationLevel)||0));law.tribulationCooldownEndTime=Math.max(0,Number(law.tribulationCooldownEndTime)||0)
  for (let i = 0; i < EQUIPMENT_SLOTS.length; i++) {
    const slotId = EQUIPMENT_SLOTS[i].id
    if (!gameData.equipmentSlots[slotId]) {
      gameData.equipmentSlots[slotId] = null
    }
  }
  // 旧版背包数据不再使用，删除后会在下一次保存时从存档中移除。
  delete gameData.equipmentBag

  // 旧坊市商品不再使用，读取旧存档时直接移除，不影响灵石、装备等其他数据。
  delete gameData.marketEquipmentStock
  delete gameData.marketEquipmentRefreshTime

  // 兼容旧存档中的洞府字段缺失或异常情况。
  if (!Number.isFinite(gameData.mansionLevel) || gameData.mansionLevel < 1) {
    gameData.mansionLevel = 1
  } else {
    gameData.mansionLevel = Math.floor(gameData.mansionLevel)
  }
  if (!Number.isFinite(gameData.guardStoneProgress) || gameData.guardStoneProgress < 0) {
    gameData.guardStoneProgress = 0
  }
  if (!Number.isFinite(gameData.lastGuardRewardTime) || gameData.lastGuardRewardTime <= 0) {
    gameData.lastGuardRewardTime = Date.now()
  }
  // 旧存档没有统一更新时间时，从原镇守时间继承，避免第一次打开漏算或重复结算。
  if (!Number.isFinite(gameData.lastUpdateTime) || gameData.lastUpdateTime <= 0) {
    gameData.lastUpdateTime = gameData.lastGuardRewardTime
  }

  // 功法和聚灵阵等级异常时修正，并始终以功法等级重新计算点击基础值。
  if (!Number.isFinite(gameData.skillLevel) || gameData.skillLevel < 1) {
    gameData.skillLevel = 1
  }
  gameData.skillLevel = Math.floor(gameData.skillLevel)
  if(!Array.isArray(gameData.spiritRoots))gameData.spiritRoots=[]
  gameData.spiritRoots=gameData.spiritRoots.filter(function(id,index,list){return SPIRIT_ROOT_TYPES.some(function(root){return root.id===id})&&list.indexOf(id)===index}).slice(0,5)
  if(gameData.spiritRoots.length<1)randomSpiritRoot(Array.isArray(gameData.specialTalents)&&gameData.specialTalents.some(function(t){return t&&t.id==='heavenly_root_rebirth'}))
  if(!Array.isArray(gameData.techniqueCollection))gameData.techniqueCollection=[]
  if(!gameData.discoveredTechniques||typeof gameData.discoveredTechniques!=='object')gameData.discoveredTechniques={}
  const validTechnique=function(t){return t&&typeof t==='object'&&typeof t.id==='string'&&typeof t.name==='string'&&TECHNIQUE_RANKS.indexOf(t.rank)>=0&&['low','middle','high'].indexOf(t.quality)>=0&&SPIRIT_ROOT_TYPES.some(function(root){return root.id===t.element})&&Number.isFinite(t.level)&&Number.isFinite(t.baseRate)}
  gameData.techniqueCollection=gameData.techniqueCollection.filter(validTechnique).slice(0,50)
  if(!validTechnique(gameData.currentTechnique)||!canUseTechniqueElement(gameData.currentTechnique.element)){
    gameData.currentTechnique=getRandomTechnique(gameData.spiritRoots[0],'洪阶')
    gameData.currentTechnique.level=gameData.skillLevel
  }
  gameData.currentTechnique.level=Math.max(1,Math.floor(gameData.currentTechnique.level))
  gameData.currentTechnique.effects=Array.isArray(gameData.currentTechnique.effects)?gameData.currentTechnique.effects:[]
  gameData.skillLevel=gameData.currentTechnique.level
  gameData.discoveredTechniques[gameData.currentTechnique.name]=true
  gameData.lastTechniqueRewardPositionIndex=Math.max(0,Math.min(SECT_POSITIONS.length-1,Math.floor(Number(gameData.lastTechniqueRewardPositionIndex)||0)))
  // 兼容旧存档：旧版本没有宗门对象时补齐默认字段，但不覆盖已有贡献和进度。
  if(!gameData.sect||typeof gameData.sect!=='object')gameData.sect={}
  const sectDefaults={joined:true,contribution:0,dailyTasks:[],completedTasks:0,shopRefreshTime:0,sectLevel:1,sectFavor:0,lastTaskRefreshDate:'',shopEquipmentStock:[],secretCooldownEndTime:0,forgeMaterials:0}
  Object.keys(sectDefaults).forEach(function(key){if(typeof gameData.sect[key]===typeof sectDefaults[key])return;gameData.sect[key]=sectDefaults[key]})
  gameData.sect.joined=true
  gameData.sectContribution=Math.max(0,Math.floor(Number(gameData.sectContribution)||Number(gameData.sect.contribution)||0))
  gameData.sect.contribution=gameData.sectContribution
  gameData.sect.completedTasks=Math.max(0,Math.floor(Number(gameData.sect.completedTasks)||0))
  gameData.sect.sectLevel=Math.max(1,Math.floor(Number(gameData.sect.sectLevel)||1))
  gameData.sect.sectFavor=Math.max(0,Math.floor(Number(gameData.sect.sectFavor)||0))
  gameData.sect.forgeMaterials=Math.max(0,Math.floor(Number(gameData.sect.forgeMaterials)||0))
  gameData.sect.secretCooldownEndTime=Math.max(0,Number(gameData.sect.secretCooldownEndTime)||0)
  if(!Array.isArray(gameData.sect.dailyTasks))gameData.sect.dailyTasks=[]
  if(!Array.isArray(gameData.sect.shopEquipmentStock))gameData.sect.shopEquipmentStock=[]
  gameData.sectTaskRefreshTime=Math.max(0,Number(gameData.sectTaskRefreshTime)||0)
  // 旧版按日期刷新的存档进入后立即切换到新的两小时刷新周期。
  if(gameData.sect.dailyTasks.length!==5)gameData.sectTaskRefreshTime=0
  gameData.totalSectContribution=Math.max(gameData.sectContribution,Math.floor(Number(gameData.totalSectContribution)||0))
  gameData.highestSectPositionIndex=Math.max(0,Math.min(SECT_POSITIONS.length-1,Math.floor(Number(gameData.highestSectPositionIndex)||0)))
  if(!gameData.sectAchievements||typeof gameData.sectAchievements!=='object')gameData.sectAchievements={}
  if (!Number.isFinite(gameData.arrayLevel) || gameData.arrayLevel < 0) {
    gameData.arrayLevel = 0
  }
  gameData.arrayLevel = Math.floor(gameData.arrayLevel)
  gameData.clickPower = getClickPowerBySkillLevel(gameData.skillLevel)
  if (!Number.isFinite(gameData.autoPower) || gameData.autoPower < 0) {
    gameData.autoPower = gameData.arrayLevel
  }
  gameData.autoPower = Math.floor(gameData.autoPower)

  // Boss 冷却、首通状态和长期进度均补齐缺失子字段，不影响已有存档。
  if (!Number.isFinite(gameData.bossCooldownEndTime) || gameData.bossCooldownEndTime < 0) {
    gameData.bossCooldownEndTime = 0
  }
  if (!gameData.bossDefeated || typeof gameData.bossDefeated !== 'object') {
    gameData.bossDefeated = {}
  }
  for (let i = 0; i < ADVENTURE_MAPS.length; i++) {
    const mapId = ADVENTURE_MAPS[i].id
    if (typeof gameData.bossDefeated[mapId] !== 'boolean') {
      gameData.bossDefeated[mapId] = false
    }
  }
  if (!gameData.achievements || typeof gameData.achievements !== 'object' || Array.isArray(gameData.achievements)) {
    gameData.achievements = {}
  }
  if (!Array.isArray(gameData.runTasks)) {
    gameData.runTasks = []
  }
  if (!gameData.lifetimeStats || typeof gameData.lifetimeStats !== 'object') {
    gameData.lifetimeStats = {}
  }
  const lifetimeStatKeys = [
    'totalCultivationClicks',
    'totalAdventures',
    'totalBossWins',
    'totalRebirths',
    'highestSingleCultivationGain',
    'highestCombatPower', 'totalRandomEvents', 'eventChoicesMade'
  ]
  for (let i = 0; i < lifetimeStatKeys.length; i++) {
    const key = lifetimeStatKeys[i]
    if (!Number.isFinite(gameData.lifetimeStats[key]) || gameData.lifetimeStats[key] < 0) {
      gameData.lifetimeStats[key] = 0
    } else {
      gameData.lifetimeStats[key] = Math.floor(gameData.lifetimeStats[key])
    }
  }
  if (!CULTIVATION_PATHS.some(function (path) { return path.id === gameData.cultivationPath })) gameData.cultivationPath = null
  // 旧存档首次没有累计字段时，使用当时的可用轮回点作为历史累计起点。
  gameData.rebirthPoints = Math.max(0, Math.floor(Number(gameData.rebirthPoints) || 0))
  if (typeof gameData.totalRebirthPoints === 'undefined') {
    gameData.totalRebirthPoints = gameData.rebirthPoints
  }
  gameData.totalRebirthPoints = Math.max(
    gameData.rebirthPoints,
    Math.floor(Number(gameData.totalRebirthPoints) || 0)
  )
  if (!gameData.nextLifePreparation || typeof gameData.nextLifePreparation !== 'object') gameData.nextLifePreparation = createDefaultNextLifePreparation()
  const prep = gameData.nextLifePreparation
  const legacyBackgroundMap={merchant_family:'wanderer',sect_heir:'cultivation_family',born_sword_bone:'sword_family',formation_heir:'array_family'}
  if(legacyBackgroundMap[prep.backgroundId])prep.backgroundId=legacyBackgroundMap[prep.backgroundId]
  if (!REBIRTH_BACKGROUNDS.some(x=>x.id===prep.backgroundId)) prep.backgroundId='wanderer'
  if (!Array.isArray(prep.blessingIds)) prep.blessingIds=[]
  prep.blessingIds=prep.blessingIds.filter(id=>REBIRTH_BLESSINGS.some(b=>b.id===id)).slice(0,2)
  if (['cultivation','breakthrough','adventure','combat'].indexOf(prep.lockedRegularTalentType)<0) prep.lockedRegularTalentType=null
  if ([1,2,3,5].indexOf(prep.specialTalentChoiceCount)<0) prep.specialTalentChoiceCount=1
  if (['random','choose'].indexOf(prep.fortuneMode)<0) prep.fortuneMode='random'
  if (!REBIRTH_FORTUNES.some(x=>x.id===prep.fortuneId)) prep.fortuneId=null
  if (!DESTINY_EVENTS.some(x=>x.id===prep.destinyEventId)) prep.destinyEventId=null
  if (!Array.isArray(gameData.pendingSpecialTalentChoices)) gameData.pendingSpecialTalentChoices=[]
  gameData.pendingSpecialTalentChoices=gameData.pendingSpecialTalentChoices.filter(function(item){return item&&SPECIAL_TALENTS.some(function(t){return t.id===item.id})})
  if (!gameData.pendingRebirthPreparation || typeof gameData.pendingRebirthPreparation!=='object') gameData.pendingRebirthPreparation=null
  if (typeof gameData.hasShownRebirthPrepareGuide !== 'boolean') gameData.hasShownRebirthPrepareGuide=false
  if(legacyBackgroundMap[gameData.currentLifeBackgroundId])gameData.currentLifeBackgroundId=legacyBackgroundMap[gameData.currentLifeBackgroundId]
  if (!REBIRTH_BACKGROUNDS.some(x=>x.id===gameData.currentLifeBackgroundId)) gameData.currentLifeBackgroundId='wanderer'
  if (!gameData.runStats || typeof gameData.runStats !== 'object') gameData.runStats = createDefaultRunStats()
  const defaultRunStats = createDefaultRunStats()
  Object.keys(defaultRunStats).forEach(function (key) { if (!Number.isFinite(gameData.runStats[key])) gameData.runStats[key] = defaultRunStats[key] })
  if (!Number.isFinite(gameData.runEquipmentChanceBonus)) gameData.runEquipmentChanceBonus = 0
  gameData.runEquipmentChanceBonus = Math.max(0, Math.min(0.10, gameData.runEquipmentChanceBonus))
  if (!Number.isFinite(gameData.runCultivationBonus)) gameData.runCultivationBonus = 0
  if (!Number.isFinite(gameData.runBreakthroughPenalty)) gameData.runBreakthroughPenalty = 0
  if (!gameData.discoveredSpecialTalents || typeof gameData.discoveredSpecialTalents !== 'object') gameData.discoveredSpecialTalents = {}
  // 旧版“重抽本轮天赋”字段不再使用，保存时自动清理。
  delete gameData.currentRebirthNewSpecialTalentId
  delete gameData.rebirthRerollCount
  delete prep.rerollTasks
  if (!Array.isArray(gameData.runTasks) || gameData.runTasks.length !== 3) gameData.runTasks = generateRunTasks()
  if (!RANDOM_EVENTS.some(function (event) { return event[0] === gameData.pendingEventId })) gameData.pendingEventId = null
  ACHIEVEMENTS.forEach(function (item) {
    const state = gameData.achievements[item[0]]
    if (!state || typeof state !== 'object') gameData.achievements[item[0]] = { completed:false, claimed:false, completedAt:0 }
    else gameData.achievements[item[0]] = { completed:!!state.completed, claimed:!!state.claimed, completedAt:Number.isFinite(state.completedAt) ? state.completedAt : 0 }
  })

  // 兼容旧存档：轮回字段不存在时补齐，且不会清除已有本轮进度。
  if (!Number.isFinite(gameData.rebirthCount) || gameData.rebirthCount < 0) {
    gameData.rebirthCount = 0
  }
  gameData.rebirthCount = Math.floor(gameData.rebirthCount)
  if (!Number.isFinite(gameData.highestRealmIndex)) {
    gameData.highestRealmIndex = gameData.realmIndex
  }
  gameData.highestRealmIndex = Math.max(
    gameData.realmIndex,
    Math.min(Math.floor(gameData.highestRealmIndex), REALMS.length - 1)
  )
  if (!gameData.talents || typeof gameData.talents !== 'object') {
    gameData.talents = {}
  }
  const talentTypes = ['cultivation', 'breakthrough', 'adventure', 'combat']
  for (let i = 0; i < talentTypes.length; i++) {
    const type = talentTypes[i]
    const talent = gameData.talents[type]
    // 兼容旧版白色天赋存档，打开游戏后自动迁移为更醒目的绿色天赋。
    if (talent && talent.quality === 'white') {
      talent.quality = 'green'
    }
    const qualityInfo = talent && TALENT_QUALITIES[talent.quality]
    if (!talent || !qualityInfo || typeof talent.value !== 'number') {
      gameData.talents[type] = null
    } else {
      // 修补旧版或不完整的天赋显示字段，不改变原本的天赋数值。
      gameData.talents[type] = Object.assign({}, talent, {
        type: type,
        qualityName: qualityInfo.name,
        qualityLevel: qualityInfo.level
      })
    }
  }

  // 特殊天赋存档兼容：过滤无效和重复内容，始终限制为最多两个。
  if (!Array.isArray(gameData.specialTalents)) {
    gameData.specialTalents = []
  }
  const validSpecialTalentIds = {}
  gameData.specialTalents = gameData.specialTalents.filter(function (talent) {
    const isValid = talent && SPECIAL_TALENTS.some(function (config) {
      return config.id === talent.id
    })
    if (!isValid || validSpecialTalentIds[talent.id]) {
      return false
    }
    validSpecialTalentIds[talent.id] = true
    return true
  }).slice(0, 2)
  if (!gameData.specialTalents.some(function (talent) {
    return talent.id === gameData.selectedInheritedSpecialTalentId
  })) {
    gameData.selectedInheritedSpecialTalentId = null
  }
  if (!Number.isFinite(gameData.failedBreakthroughBonus) || gameData.failedBreakthroughBonus < 0) {
    gameData.failedBreakthroughBonus = 0
  }
  gameData.failedBreakthroughBonus = Math.min(0.20, gameData.failedBreakthroughBonus)
  // 新版不灭之体不再使用旧的重伤护盾字段。
  delete gameData.heavyInjuryShieldUsed
  if (!Number.isFinite(gameData.postInjuryBuffEndTime) || gameData.postInjuryBuffEndTime < 0) {
    gameData.postInjuryBuffEndTime = 0
  }
  if (!Number.isFinite(gameData.manualCultivationCount) || gameData.manualCultivationCount < 0) {
    gameData.manualCultivationCount = 0
  }
  gameData.manualCultivationCount = Math.floor(gameData.manualCultivationCount)
  if (!Number.isFinite(gameData.nextEnlightenmentTime) || gameData.nextEnlightenmentTime < 0) {
    gameData.nextEnlightenmentTime = 0
  }
  if (typeof gameData.enlightenmentReady !== 'boolean') {
    gameData.enlightenmentReady = false
  }
  // 旧存档首次获得“一念顿悟”时，从现在开始计算第一轮 60 秒，
  // 避免因为没有时间戳而让进度显示异常。
  if (
    hasSpecialTalent('sudden_enlightenment') &&
    !gameData.enlightenmentReady &&
    gameData.nextEnlightenmentTime === 0
  ) {
    gameData.nextEnlightenmentTime = Date.now() + 60 * 1000
  }
  if (!Number.isFinite(gameData.battleBuffEndTime) || gameData.battleBuffEndTime < 0) {
    gameData.battleBuffEndTime = 0
  }
  if (!Number.isFinite(gameData.temporaryBreakthroughBonus) || gameData.temporaryBreakthroughBonus < 0) {
    gameData.temporaryBreakthroughBonus = 0
  }
  gameData.temporaryBreakthroughBonus = Math.min(0.10, gameData.temporaryBreakthroughBonus)
  if (!ADVENTURE_MAPS.some(function (map) {
    return map.id === gameData.selectedMapId
  })) {
    gameData.selectedMapId = 'qingyun'
  }

  // 旧存档只有 adventureLog 一条文字时，自动转换为新的日志数组。
  if (!Array.isArray(gameData.adventureLogs)) gameData.adventureLogs = gameData.adventureLog ? [gameData.adventureLog] : []
  gameData.adventureLogs = gameData.adventureLogs.map(function(log,index){if(typeof log==='string')return {id:'legacy_log_'+index,type:'system',text:log.slice(0,500),time:0};if(!log||typeof log!=='object')return null;return {id:log.id||'legacy_log_'+index,type:LOG_TYPE_STYLES[log.type]?log.type:'system',text:String(log.text||'').slice(0,500),time:Number(log.time)||0}}).filter(function(log){return log&&log.text}).slice(0,100)
  if (gameData.adventureLogs.length === 0) {
    gameData.adventureLogs = [{id:'initial_log',type:'system',text:'山门外云雾缭绕，等待你前去探索。',time:Date.now()}]
  }
  gameData.adventureLog = gameData.adventureLogs[0].text
  // 离线结算只由 onShow 统一执行，避免读档与回前台时重复发放。
  refreshInjuryStatus()
  if (gameData.pendingEventId) {
    currentRandomEvent = RANDOM_EVENTS.find(function (event) { return event[0] === gameData.pendingEventId })
    currentPage = 'event'
  }
  // 已完成扣费、只差挑选候选天赋时，重新打开页面要回到选择页。
  if (gameData.pendingRebirthPreparation && gameData.pendingSpecialTalentChoices.length) {
    rebirthPreparationSubmitting=true
    currentPage='special_talent_choice'
  } else if (gameData.pendingRebirthPreparation) {
    // 无效候选不会再次扣费，安全补发一个候选以继续完成已确认的轮回。
    gameData.pendingSpecialTalentChoices=generateSpecialTalentChoices(1,[])
    if(gameData.pendingSpecialTalentChoices.length){rebirthPreparationSubmitting=true;currentPage='special_talent_choice'}
    else {gameData.pendingRebirthPreparation=null;rebirthPreparationSubmitting=false}
  }
}

function saveAndDraw() {
  saveGame()
  drawGame()
}

// 在保存时记录历史最高战力，后续成就与任务可以直接复用该字段。
function updateHighestCombatPower() {
  if (!gameData.lifetimeStats || typeof gameData.lifetimeStats !== 'object') {
    return
  }
  const currentPower = getCombatPower()
  if (Number.isFinite(currentPower)) {
    gameData.lifetimeStats.highestCombatPower = Math.max(
      gameData.lifetimeStats.highestCombatPower || 0,
      Math.floor(currentPower)
    )
  }
}

// -------------------- 开发者GM测试系统 --------------------
function beginGmSession() {
  if (!DEBUG_MODE) return false
  if (!gmSessionActive) {
    gmSessionActive = true
    showMessage('GM测试已开启：本次数据不会写入正式存档，刷新即可恢复')
  }
  return true
}

function registerGmTitleTap() {
  if (!DEBUG_MODE) return false
  const now = Date.now()
  if (now - gmTitleLastTapTime > 1600) gmTitleTapCount = 0
  gmTitleLastTapTime = now
  gmTitleTapCount += 1
  if (gmTitleTapCount < 5) return false
  gmTitleTapCount = 0
  openGmMenu()
  return true
}

function openGmMenu() {
  if (!beginGmSession()) return
  platform.showActionSheet({
    alertText: '开发者工具（仅本次运行有效）',
    itemList: ['设置境界', '资源修改 / 快捷命令', '解锁系统', '生成装备', '生成功法', '测试下一世'],
    success: function (result) {
      if (result.tapIndex === 0) showGmRealmMenu()
      if (result.tapIndex === 1) showGmResourceMenu()
      if (result.tapIndex === 2) showGmUnlockMenu()
      if (result.tapIndex === 3) showGmEquipmentMenu()
      if (result.tapIndex === 4) gmGenerateTechnique()
      if (result.tapIndex === 5) gmTestNextLife()
    }
  })
}

function showGmRealmMenu() {
  const options = [
    { label:'凡人', index:0 }, { label:'炼气初期', index:1 }, { label:'筑基初期', index:10 },
    { label:'金丹初期', index:13 }, { label:'元婴初期', index:16 }, { label:'化神初期', index:19 }
  ]
  platform.showActionSheet({alertText:'设置测试境界',itemList:options.map(function(item){return item.label}),success:function(result){gmSetRealmIndex(options[result.tapIndex].index)}})
}

function gmSetRealmIndex(index) {
  if (!beginGmSession()) return
  gameData.realmIndex = Math.max(0, Math.min(REALMS.length - 1, Math.floor(index)))
  gameData.injuryStatus = 'none'
  gameData.injuryEndTime = 0
  currentPage = 'cultivate'
  addAdventureLog('[GM] 境界已设置为【' + REALMS[gameData.realmIndex].name + '】，对应系统权限已同步。', 'system')
  drawGame()
  showMessage('GM境界：' + REALMS[gameData.realmIndex].name)
}

function showGmResourceMenu() {
  const resources = [
    {label:'灵石',key:'stone'}, {label:'宗门贡献',key:'contribution'},
    {label:'轮回点',key:'rebirthPoints'}, {label:'法则碎片',key:'lawFragments'}
  ]
  platform.showActionSheet({
    alertText:'资源修改',
    itemList: resources.map(function(item){return item.label}).concat(['输入 /gm 快捷命令']),
    success:function(result){
      if(result.tapIndex===resources.length){showGmCommandInput();return}
      const item=resources[result.tapIndex]
      showGmNumberInput(item.label,item.key)
    }
  })
}

function showGmNumberInput(label,key) {
  platform.showModal({
    title:'设置' + label,
    content:'请输入非负整数',
    editable:true,
    placeholderText:'例如：999999',
    confirmText:'应用',
    success:function(result){if(result.confirm)gmSetResource(key,result.content)}
  })
}

function gmSetResource(key, value) {
  if (!beginGmSession()) return false
  const amount = Math.max(0, Math.floor(Number(value) || 0))
  if (key === 'stone') gameData.spiritStone = amount
  else if (key === 'contribution') { gameData.sectContribution = amount; gameData.sect.contribution = amount }
  else if (key === 'rebirthPoints') { gameData.rebirthPoints = amount; gameData.totalRebirthPoints = Math.max(gameData.totalRebirthPoints, amount) }
  else if (key === 'lawFragments') gameData.lawSystem.lawFragments = amount
  else return false
  drawGame()
  showMessage('GM资源已修改：' + formatNumber(amount))
  return true
}

function showGmUnlockMenu() {
  const items = [
    {label:'装备',ids:['adventure','equipment']}, {label:'宗门',ids:['achievement','sect','runTask']},
    {label:'洞府',ids:['mansion','equipmentEnhance','offlineCultivation','breakthroughPrayer']},
    {label:'元神',ids:['primordialSpirit']}, {label:'神通',ids:['primordialSpirit','divineAbility','spiritTrial']}
  ]
  platform.showActionSheet({alertText:'解锁系统测试',itemList:items.map(function(item){return item.label}).concat(['更多：法则 / 天劫']),success:function(result){if(result.tapIndex===items.length)showGmAdvancedUnlockMenu();else gmUnlockSystems(items[result.tapIndex].label,items[result.tapIndex].ids)}})
}

function showGmAdvancedUnlockMenu() {
  const items=[{label:'法则',ids:['law']},{label:'天劫',ids:['law','tribulation']},{label:'全部系统',ids:Object.keys(SYSTEM_UNLOCK_MAJOR_REALM)}]
  platform.showActionSheet({alertText:'高级系统测试',itemList:items.map(function(item){return item.label}),success:function(result){gmUnlockSystems(items[result.tapIndex].label,items[result.tapIndex].ids)}})
}

function gmUnlockSystems(label, ids) {
  if (!beginGmSession()) return
  ids.forEach(function(id){gmUnlockedSystems[id]=true})
  drawGame()
  showMessage('GM已解锁：' + label)
}

function showGmEquipmentMenu() {
  const ranks=['玄阶','天阶','随机玄阶/天阶']
  platform.showActionSheet({alertText:'生成测试装备',itemList:ranks,success:function(result){const rank=result.tapIndex===0?'玄阶':result.tapIndex===1?'天阶':(Math.random()<.5?'玄阶':'天阶');gmGenerateEquipment(rank)}})
}

function gmGenerateEquipment(rank) {
  if (!beginGmSession()) return
  const equipment=generateEquipment([{rank:rank||'天阶',weight:100}])
  // GM生成用于直接观察属性，强制放入对应装备格，不走分解与正式掉落奖励。
  gameData.equipmentSlots[equipment.slot]=equipment
  addAdventureLog('[GM] 已强制装备【'+equipment.rank+'·'+equipment.name+'】，战斗力 +'+equipment.power+'。', 'equipment')
  drawGame()
  showMessage('GM装备：' + equipment.rank + '·' + equipment.name + ' +' + equipment.power)
}

function gmGenerateTechnique() {
  if (!beginGmSession()) return
  const elements=SPIRIT_ROOT_TYPES.map(function(item){return item.id})
  const element=elements[Math.floor(Math.random()*elements.length)]
  const rank=TECHNIQUE_RANKS[Math.floor(Math.random()*TECHNIQUE_RANKS.length)]
  const technique=getRandomTechnique(element,rank)
  const qualities=['low','middle','high']
  technique.quality=qualities[Math.floor(Math.random()*qualities.length)]
  technique.effects=[]
  const effectCount=technique.quality==='high'?2:technique.quality==='middle'?1:0
  for(let i=0;i<effectCount;i++)addRandomTechniqueEffect(technique)
  if(gameData.spiritRoots.indexOf(element)<0&&gameData.spiritRoots.length<5)gameData.spiritRoots.push(element)
  gameData.currentTechnique=technique
  gameData.skillLevel=technique.level
  gameData.clickPower=getClickPowerBySkillLevel(technique.level)
  addAdventureLog('[GM] 已生成测试功法【'+getTechniqueDisplayText(technique)+'】。','talent')
  drawGame()
  showMessage('GM功法：' + getTechniqueDisplayText(technique))
}

function gmTestNextLife() {
  if (!beginGmSession()) return
  if (getMajorRealmLevel() < 2) gameData.realmIndex = 10
  gameData.rebirthPoints = Math.max(gameData.rebirthPoints, 999)
  currentPage='rebirth'
  openNextLifePreparation()
}

function showGmCommandInput() {
  platform.showModal({
    title:'GM快捷命令',
    content:'支持 realm、stone、contribution、law、rebirth、equipment、technique。',
    editable:true,
    placeholderText:'/gm realm 元婴',
    confirmText:'执行',
    success:function(result){if(result.confirm)executeGmCommand(result.content)}
  })
}

function executeGmCommand(commandText) {
  if (!DEBUG_MODE) return false
  const parts=String(commandText||'').trim().split(/\s+/)
  if(parts[0]!=='/gm'){showMessage('命令必须以 /gm 开头');return false}
  const command=parts[1],value=parts.slice(2).join(' ')
  if(command==='realm'){
    const realms={凡人:0,炼气:1,筑基:10,金丹:13,元婴:16,化神:19}
    if(typeof realms[value]!=='number'){showMessage('未知境界：'+value);return false}
    gmSetRealmIndex(realms[value]);return true
  }
  if(command==='stone')return gmSetResource('stone',value)
  if(command==='contribution')return gmSetResource('contribution',value)
  if(command==='law')return gmSetResource('lawFragments',value)
  if(command==='rebirth'){gmTestNextLife();return true}
  if(command==='equipment'){gmGenerateEquipment(Math.random()<.5?'玄阶':'天阶');return true}
  if(command==='technique'){gmGenerateTechnique();return true}
  showMessage('未知GM命令：'+(command||'空'))
  return false
}

function showMessage(title) {
  platform.showToast({ title: title, icon: 'none' })
}

// 下面都是简单的 Canvas 绘图工具，不包含游戏规则。
function drawText(text, x, y, size, color, weight) {
  context.fillStyle = color
  context.font = (weight || 'normal') + ' ' + size + 'px sans-serif'
  context.textAlign = 'left'
  context.textBaseline = 'middle'
  context.fillText(String(text), x, y)
}

function drawCenteredText(text, y, size, color, weight) {
  context.fillStyle = color
  context.font = (weight || 'normal') + ' ' + size + 'px sans-serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(String(text), DESIGN_WIDTH / 2, y)
}

function drawLabelValue(label, value, y) {
  drawText(label, 28, y, 14, '#2f3542')
  context.fillStyle = '#9a5d20'
  context.font = 'bold 14px sans-serif'
  context.textAlign = 'right'
  context.textBaseline = 'middle'
  context.fillText(String(value), 347, y)
}

function drawButton(x, y, width, height, text, color, onTap, onLongPress) {
  drawRoundedRect(x, y, width, height, 8, color)
  context.fillStyle = '#ffffff'
  context.font = 'bold 13px sans-serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(text, x + width / 2, y + height / 2)

  buttons.push({
    x: x,
    y: y,
    width: width,
    height: height,
    onTap: onTap,
    onLongPress: onLongPress || null
  })
}

function drawRoundedRect(x, y, width, height, radius, fillColor, strokeColor) {
  context.beginPath()
  context.moveTo(x + radius, y)
  context.lineTo(x + width - radius, y)
  context.quadraticCurveTo(x + width, y, x + width, y + radius)
  context.lineTo(x + width, y + height - radius)
  context.quadraticCurveTo(
    x + width,
    y + height,
    x + width - radius,
    y + height
  )
  context.lineTo(x + radius, y + height)
  context.quadraticCurveTo(x, y + height, x, y + height - radius)
  context.lineTo(x, y + radius)
  context.quadraticCurveTo(x, y, x + radius, y)
  context.closePath()
  context.fillStyle = fillColor
  context.fill()

  if (strokeColor) {
    context.strokeStyle = strokeColor
    context.lineWidth = 1
    context.stroke()
  }
}

function drawWrappedText(text, x, y, maxWidth, lineHeight, size, color) {
  context.fillStyle = color
  context.font = 'normal ' + size + 'px sans-serif'
  context.textAlign = 'left'
  context.textBaseline = 'middle'

  let line = ''
  let lineNumber = 0
  for (let i = 0; i < text.length; i++) {
    // 剧情文字允许使用换行符分段。
    if (text[i] === '\n') {
      if (line) context.fillText(line, x, y + lineNumber * lineHeight)
      line = ''
      lineNumber += 1
      continue
    }
    const testLine = line + text[i]
    if (context.measureText(testLine).width > maxWidth && line) {
      context.fillText(line, x, y + lineNumber * lineHeight)
      line = text[i]
      lineNumber += 1
    } else {
      line = testLine
    }
  }
  context.fillText(line, x, y + lineNumber * lineHeight)
}

// 见闻列表每条只占一行，超出的文字加省略号，避免把后面的日志顶掉。
function drawSingleLineText(text, x, y, maxWidth, size, color) {
  context.fillStyle = color
  context.font = 'normal ' + size + 'px sans-serif'
  context.textAlign = 'left'
  context.textBaseline = 'middle'

  const originalText = String(text)
  let displayText = originalText
  if (context.measureText(displayText).width > maxWidth) {
    while (
      displayText.length > 0 &&
      context.measureText(displayText + '…').width > maxWidth
    ) {
      displayText = displayText.slice(0, -1)
    }
    displayText += '…'
  }
  context.fillText(displayText, x, y)
}
