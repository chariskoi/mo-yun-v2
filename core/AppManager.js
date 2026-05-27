/* ===== 应用管理器 ===== *
 * 负责：初始化、全局事件绑定、生命周期
 */

/** 应用初始化 */
async function initApp() {
    // 打开数据库
    await openIDB();

    // 加载主题
    loadTheme();

    // 加载布局配置
    var lo = Storage.get('sc_layout', null);
    if (lo) {
        if (lo.left) document.documentElement.style.setProperty('--left-w', lo.left + 'px');
        if (lo.right) document.documentElement.style.setProperty('--right-w', lo.right + 'px');
    }

    // 排版设置
    var ind = Storage.get('sc_indent', '2');
    document.documentElement.style.setProperty('--indent', ind);
    fontS = Storage.get('sc_font_size', 15);
    lineH = Storage.get('sc_line_height', 1.85);
    AppState.set('editor.fontSize', fontS);
    AppState.set('editor.lineHeight', lineH);
    updateFontDisplay();

    // Bridge: AppState 变更同步回全局变量（逐步迁移用）
    EventBus.on('stateChanged', function(data) {
        if (data.path === 'editor.fontSize') fontS = data.value;
        if (data.path === 'editor.lineHeight') lineH = data.value;
    });

    // 保存间隔
    var si = document.getElementById('saveIntervalInput');
    if (si) {
        var sv = Math.round(((parseInt(Storage.get('sc_save_interval', 20000)) || 20000) / 1000));
        si.value = Math.max(1, Math.min(300, sv));
        si.onchange = function() {
            var v = parseInt(this.value) || 20;
            Storage.set('sc_save_interval', Math.max(1, Math.min(300, v)) * 1000);
        };
    }

    // 缩进设置
    var ii = document.getElementById('indentInput');
    if (ii) {
        ii.value = Storage.get('sc_indent', '2');
        ii.onchange = function() {
            var v = Math.max(0, Math.min(8, parseInt(this.value) || 0));
            document.documentElement.style.setProperty('--indent', v);
            Storage.set('sc_indent', v);
        };
    }

    // 字体控制
    document.getElementById('fontPlus').onclick = function() {
        var v = Math.min(24, AppState.get('editor.fontSize') + 1);
        AppState.set('editor.fontSize', v);
        updateFontDisplay();
        Storage.set('sc_font_size', v);
    };
    document.getElementById('fontMinus').onclick = function() {
        var v = Math.max(10, AppState.get('editor.fontSize') - 1);
        AppState.set('editor.fontSize', v);
        updateFontDisplay();
        Storage.set('sc_font_size', v);
    };
    document.getElementById('linePlus').onclick = function() {
        var v = Math.min(3, AppState.get('editor.lineHeight') + 0.1);
        AppState.set('editor.lineHeight', v);
        updateFontDisplay();
        Storage.set('sc_line_height', v);
    };
    document.getElementById('lineMinus').onclick = function() {
        var v = Math.max(1, AppState.get('editor.lineHeight') - 0.1);
        AppState.set('editor.lineHeight', v);
        updateFontDisplay();
        Storage.set('sc_line_height', v);
    };

    // === Auth Gate: 认证检查 + 云端同步 ===
    var authed = await authenticateUser();
    if (authed) {
      try {
        _syncInProgress = true;
        // 先上传本地数据到云端，再拉取云端数据覆盖本地
        await SyncService.uploadAllData();
        await SyncService.downloadAllData();
        _syncInProgress = false;
        _lastSyncTime = Date.now();
        renderUserIndicator();
      } catch (e) {
        _syncInProgress = false;
        Log.warn('Sync', '云端同步失败，使用本地数据', e);
      }
    }

    // 加载书籍列表
    loadBooks();
    renderShelf();

    // === 事件总线 → 视图 桥接（Phase 2: 服务层与视图层解耦） ===
    wireServiceEvents();
}

function wireServiceEvents() {
    // 章节树变更 → 重新渲染
    EventBus.on('chapterTree:changed', function() {
        renderChapterTree();
    });
    // 章节激活 → 加载到编辑器
    EventBus.on('chapter:activated', function(id) {
        loadChapterToEditor();
    });
    // 章节标题变更 → 更新显示
    EventBus.on('chapterTitle:changed', function(title) {
        document.getElementById('chapterTitleDisplay').innerText = title;
    });
    // 世界数据变更 → 重新渲染对应类型
    EventBus.on('world:dataChanged', function(type) {
        if (type === 'chars') renderChars();
        else if (type === 'locs') renderLocs();
        else if (type === 'sets') renderSets();
        else if (type === 'tl') renderTimeline();
        else if (type === 'outline') renderOutline();
    });
    // 所有世界数据重新加载
    EventBus.on('world:allChanged', function() {
        renderAllWorld();
    });
    // 画布列表变更 → 刷新世界面板
    EventBus.on('canvas:listChanged', function() {
        renderCanvas();
    });
    // 画布内部变更（节点/边）→ 刷新小画布与覆盖层
    EventBus.on('canvas:changed', function(cid) {
        renderMiniCanvas(cid);
        if (_overlayCid) renderOverlayCanvas();
    });
    // 画布覆盖层打开/关闭
    EventBus.on('canvas:overlayOpen', function(id) {
        openCanvasOverlay(id);
    });
    EventBus.on('canvas:overlayClosed', function() {
        closeCanvasOverlay();
    });
}

/** 认证门控：返回 true=已通过/跳过，false=未认证 */
function authenticateUser() {
  return new Promise(function(resolve) {
    var token = AuthService.getToken();
    if (token) {
      AuthService.validateToken().then(function(ok) {
        if (ok) { resolve(true); return; }
        // token 过期，重新登录
        AuthService.clearSession();
        showAuthModal().then(function(result) { resolve(result); });
      });
    } else {
      // 无 token，显示登录框
      showAuthModal().then(function(result) { resolve(result); });
    }
  });
}

function wireEvents() {
    // DOM 引用
    $ed = document.getElementById('editorBody');
    $ctx = document.getElementById('ctxMenu');
    $ctxBd = document.getElementById('ctxBackdrop');

    // AI 浮窗拖拽
    var ah = document.getElementById('aiFloatHeader');
    if (ah) {
        ah.addEventListener('mousedown', function(e) {
            aDrag = true;
            aSX = e.clientX - parseInt(document.getElementById('aiFloat').offsetLeft);
            aSY = e.clientY - parseInt(document.getElementById('aiFloat').offsetTop);
            e.preventDefault();
        });
    }

    // AI 拖拽区悬停效果
    var aiZone = document.getElementById('aiDropZone');
    if (aiZone) {
        aiZone.addEventListener('dragover', function(e) { e.preventDefault(); this.classList.add('drag-over'); });
        aiZone.addEventListener('dragleave', function(e) { this.classList.remove('drag-over'); });
    }

    // 章节列表空白处右键添加
    document.getElementById('chapterList').addEventListener('contextmenu', function(e) {
        if (e.target.closest('.chapter-item') || e.target.closest('.volume-header') || e.target.closest('.ch-summary-row')) return;
        e.preventDefault();
        var vc = e.target.closest('.volume-children');
        var vid = vc ? vc.previousElementSibling.dataset.vid : (document.querySelector('.volume-header') ? document.querySelector('.volume-header').dataset.vid : null);
        if (vid) addChapterToVolume(vid);
    });

    // 全局鼠标移动
    document.addEventListener('mousemove', function(e) {
        _lastMX = e.clientX;
        _lastMY = e.clientY;

        // AI弹窗拖拽
        if (aDrag) {
            var f = document.getElementById('aiFloat');
            f.style.left = (e.clientX - aSX) + 'px';
            f.style.top = (e.clientY - aSY) + 'px';
        }

        // 面板大小调整
        if (resizing) {
            var dx = e.clientX - rsX;
            var p = resizing == 'left' ? '--left-w' : '--right-w';
            var min = resizing == 'left' ? 160 : 240;
            var nw = Math.max(min, rsW + (resizing == 'left' ? dx : -dx));
            document.documentElement.style.setProperty(p, nw + 'px');
        }

        // 表格调整
        if (_tRes) doTResize(e);

        // 表格选中拖拽
        if (_tMD && _tDrag) {
            var el = document.elementFromPoint(e.clientX, e.clientY);
            if (el) {
                var cell = el.closest('.ocell');
                if (cell) {
                    var tid = _tDrag.id, r = parseInt(cell.dataset.r), c = parseInt(cell.dataset.c);
                    if (!isNaN(r) && !isNaN(c)) {
                        var sel = _tSels[_tSels.length - 1];
                        if (sel && sel.id === tid) { sel.r2 = r; sel.c2 = c; updSel(tid); }
                    }
                }
            }
        }

        // 画布覆盖层
        coStageMouseMove(e);
    });

    // 全局鼠标释放
    document.addEventListener('mouseup', function() { stopAllDrag(); });

    // 右键阻止默认
    document.addEventListener('mousedown', function(e) {
        if (e.button === 2 && !e.target.closest('.canvas-overlay-world')) e.preventDefault();
        if (_ctxMenuOpen && e.button === 0 && !e.target.closest('#ctxMenu')) { hideCtxMenu(); }
        if (e.target.closest('#canvasOverlayStage')) coStageMouseDown(e);
    }, true);

    // 滚轮缩放（画布）
    document.addEventListener('wheel', function(e) {
        if (e.target.closest('#canvasOverlayStage')) coStageWheel(e);
    }, { passive: false });

    // 右键菜单关闭
    document.addEventListener('mouseup', function(e) {
        if (_ctxMenuOpen && e.button === 0 && !e.target.closest('#ctxMenu')) { hideCtxMenu(); }
    }, true);

    // 全局阻止右键菜单
    document.addEventListener('contextmenu', function(e) {
        if (e.target.closest('.canvas-overlay-world')) { e.preventDefault(); return; }
        e.preventDefault();
    }, true);

    // 点击关闭面板
    document.addEventListener('click', function(e) {
        if (!e.target.closest('#ctxMenu') && !e.target.closest('#aiFloat') && !e.target.closest('#aiToggleBtn')) hideCtxMenu();
        if (!e.target.closest('.settings-btn')) hideSettings();
    });

    // 编辑器焦点追踪
    document.addEventListener('focusin', function(e) {
        if (e.target.closest('[contenteditable]')) _lastCE = e.target.closest('[contenteditable]');
    });

    // 窗口失焦停止拖拽
    window.addEventListener('blur', stopAllDrag);

    // 在线/离线检测
    window.addEventListener('online', function() {
      _isOnline = true;
      if (AuthService.isLoggedIn() && activeBookId) {
        SyncService.triggerSync();
      }
    });
    window.addEventListener('offline', function() {
      _isOnline = false;
    });
}

function wireKeyboard() {
    // Ctrl+S 保存
    window.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key == 's') { e.preventDefault(); autoSaveNow(); }
        if ((e.ctrlKey || e.metaKey) && e.key == 'z' && !e.shiftKey) { e.preventDefault(); if (!CommandSystem.undo()) undoContent(); }
        if (e.key == 'F11') { e.preventDefault(); toggleFs(); }
        if (e.key == 'F12' || ((e.ctrlKey||e.metaKey) && e.key == 'i' && e.shiftKey)) {
            e.preventDefault();
            if(window.electronAPI)window.electronAPI.toggleDevTools();
        }
        if ((e.ctrlKey || e.metaKey) && (e.key == 'y' || e.key == 'z' && e.shiftKey)) { e.preventDefault(); if (!CommandSystem.redo()) redoContent(); }

        // 表格Delete键清除
        if (e.key == 'Delete' && !e.ctrlKey && !e.metaKey) {
            var ac = document.activeElement;
            if (!(ac && ac.closest && ac.closest('.ocell[contenteditable]')) && _tSels.length > 0) {
                e.preventDefault();
                var ts = _tSels[_tSels.length - 1];
                var it = world.outline.find(function(x) { return x.id === ts.id });
                if (it && it.table) {
                    var sn = { r1: Math.min(ts.r1, ts.r2), c1: Math.min(ts.c1, ts.c2), r2: Math.max(ts.r1, ts.r2), c2: Math.max(ts.c1, ts.c2) };
                    for (var r = sn.r1; r <= sn.r2; r++)
                        for (var c = sn.c1; c <= sn.c2; c++)
                            if (!cov(ts.id, r, c) && it.table.rows[r]) it.table.rows[r][c] = "";
                    saveWorld();
                    rerOT(ts.id);
                }
            }
        }
    });
}
