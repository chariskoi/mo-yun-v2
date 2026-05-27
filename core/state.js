/* ===== 全局状态管理 ===== */

// === 书籍/章节数据 ===
var books = [];
var activeBookId = null;
var volumes = [];
var chapters = [];
var activeId = null;
var saveTimer = null;

// === 世界数据 ===
var world = { chars: [], locs: [], sets: [], tl: [], outline: [], canvas: [] };

// === 上下文菜单 ===
var ctxT = null;
var ctxE = null;
var ctxId = null;
var ctxF = null;
var ctxB = null;

// === AI 浮窗 ===
var aDrag = false;
var aSX = 0;
var aSY = 0;
var aiChips = [];
var chipColors = { char: '#c0392b', loc: '#2980b9', set: '#27ae60', tl: '#d35400', outline: '#8e44ad', summary: '#7f8c8d' };

// === 拖拽状态 ===
var dWType = null;
var dWId = null;
var dChId = null;

// === 自动命名 ===
var autoCt = {};

// === 编辑器设置 ===
var fontS = 15;
var lineH = 1.85;

// === 世界面板 ===
var worldTabOrder = ['characters', 'locations', 'settings', 'timeline', 'outline', 'canvas'];
var worldTabMeta = {
    characters: { icon: '👤', label: '人物', key: 'chars' },
    locations: { icon: '📍', label: '地点', key: 'locs' },
    settings: { icon: '⚙', label: '设定', key: 'sets' },
    timeline: { icon: '🕐', label: '时间线', key: 'tl' },
    outline: { icon: '📋', label: '大纲', key: 'outline' },
    canvas: { icon: '🕸', label: '架构画布', key: 'canvas' }
};
var activeWorldTab = 'characters';
var dragTab = null;

// === 撤销/重做 ===
var _undoStack = [];
var _redoStack = [];
var _undoLock = false;
var _undoMax = 100;
var _lastCE = null;

// === 状态标志 ===
var _bookOpening = false;
var _ctxMenuOpen = false;
var _lastMX = 0;
var _lastMY = 0;

// === 认证/同步状态 ===
var _isOnline = navigator.onLine;
var _syncInProgress = false;
var _lastSyncTime = null;
var _authSkip = false;

// === DOM引用 ===
var $ed = null;      // editorBody
var $ctx = null;     // ctxMenu
var $ctxBd = null;   // ctxBackdrop

// === 画布覆盖层状态 ===
var _overlayCid = null;
var _coPanX = 0;
var _coPanY = 0;
var _coZoom = 1;
var _coPanning = false;
var _coPanStartX = 0;
var _coPanStartY = 0;
var _coStageRect = null;
var _cnCtx = {};

// === 多选拾取器 ===
var _mpItems = null;
var _mpCallback = null;

// === 大纲表格状态 ===
var _tSels = [];
var _tMD = false;
var _tDrag = null;
var _tRes = null;

// === 卡片图片 ===
var _cardImgCtx = null;

// === 布局拖拽 ===
var resizing = null;
var rsX = 0;
var rsW = 0;

// === 裁剪 ===
var _cropCB = null;
var _cropD = null;
var _promptCB = null;
var _confirmCB = null;

// === 封面 ===
var _coverBookId = null;

// === 书库缓存 ===
var _quotes = [
    {q:'文章本天成，妙手偶得之。',s:'陆游'},
    {q:'读书破万卷，下笔如有神。',s:'杜甫'},
    {q:'学而不思则罔，思而不学则殆。',s:'孔子'},
    {q:'千里之行，始于足下。',s:'老子'},
    {q:'天行健，君子以自强不息。',s:'《周易》'},
    {q:'路漫漫其修远兮，吾将上下而求索。',s:'屈原'},
    {q:'山重水复疑无路，柳暗花明又一村。',s:'陆游'},
    {q:'问渠那得清如许？为有源头活水来。',s:'朱熹'},
    {q:'纸上得来终觉浅，绝知此事要躬行。',s:'陆游'},
    {q:'博观而约取，厚积而薄发。',s:'苏轼'},
    {q:'不积跬步，无以至千里；不积小流，无以成江海。',s:'荀子'},
    {q:'业精于勤，荒于嬉；行成于思，毁于随。',s:'韩愈'},
    {q:'穷则变，变则通，通则久。',s:'《周易》'},
    {q:'温故而知新，可以为师矣。',s:'孔子'},
    {q:'三人行，必有我师焉。',s:'孔子'},
    {q:'欲穷千里目，更上一层楼。',s:'王之涣'},
    {q:'长风破浪会有时，直挂云帆济沧海。',s:'李白'},
    {q:'海内存知己，天涯若比邻。',s:'王勃'},
    {q:'不畏浮云遮望眼，自缘身在最高层。',s:'王安石'},
    {q:'千淘万漉虽辛苦，吹尽狂沙始到金。',s:'刘禹锡'},
    {q:'笔落惊风雨，诗成泣鬼神。',s:'杜甫'},
    {q:'书山有路勤为径，学海无涯苦作舟。',s:'韩愈'},
    {q:'人生自古谁无死？留取丹心照汗青。',s:'文天祥'},
    {q:'有志者，事竟成。',s:'《后汉书》'},
    {q:'勿以恶小而为之，勿以善小而不为。',s:'刘备'},
    {q:'静以修身，俭以养德。',s:'诸葛亮'},
    {q:'非淡泊无以明志，非宁静无以致远。',s:'诸葛亮'},
    {q:'宝剑锋从磨砺出，梅花香自苦寒来。',s:'《警世贤文》'},
    {q:'春风得意马蹄疾，一日看尽长安花。',s:'孟郊'},
    {q:'会当凌绝顶，一览众山小。',s:'杜甫'},
    {q:'但愿人长久，千里共婵娟。',s:'苏轼'},
    {q:'行到水穷处，坐看云起时。',s:'王维'},
    {q:'众里寻他千百度，蓦然回首，那人却在灯火阑珊处。',s:'辛弃疾'},
    {q:'人生如逆旅，我亦是行人。',s:'苏轼'},
    {q:'此中有真意，欲辨已忘言。',s:'陶渊明'},
    {q:'生活里没有书籍，就好像没有阳光。',s:'莎士比亚'},
    {q:'写作即是将灵魂的碎片捡起，拼成完整的自己。',s:'佚名'},
    {q:'故事是灵魂的避难所，文字是思想的栖息地。',s:'佚名'},
    {q:'每一个不曾起舞的日子，都是对生命的辜负。',s:'尼采'},
    {q:'所谓创新，不过是旧元素的新组合。',s:'詹姆斯·韦伯·扬'},
];
