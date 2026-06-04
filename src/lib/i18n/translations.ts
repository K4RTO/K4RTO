// Translation data — no React imports here, just data
type TranslationEntry = { en: string; zh: string };

const translations: Record<string, TranslationEntry> = {
  // ── Apple menu ──────────────────────────────────────────────────────────
  "menu.apple.about":          { en: "About This Mac",            zh: "关于本机" },
  "menu.apple.systemSettings": { en: "System Settings...",        zh: "系统设置..." },
  "menu.apple.appStore":       { en: "App Store...",              zh: "App Store..." },
  "menu.apple.recentItems":    { en: "Recent Items",              zh: "最近使用的项目" },
  "menu.apple.forceQuit":      { en: "Force Quit...",             zh: "强制退出..." },
  "menu.apple.sleep":          { en: "Sleep",                     zh: "睡眠" },
  "menu.apple.restart":        { en: "Restart...",                zh: "重新启动..." },
  "menu.apple.shutdown":       { en: "Shut Down...",              zh: "关机..." },
  "menu.apple.lockScreen":     { en: "Lock Screen",               zh: "锁定屏幕" },
  "menu.apple.logOut":         { en: "Log Out",                   zh: "退出登录" },

  // ── File menu ────────────────────────────────────────────────────────────
  "menu.file.newFinderWindow": { en: "New Finder Window",         zh: "新建访达窗口" },
  "menu.file.newFolder":       { en: "New Folder",                zh: "新建文件夹" },
  "menu.file.newTab":          { en: "New Tab",                   zh: "新建标签页" },
  "menu.file.open":            { en: "Open",                      zh: "打开" },
  "menu.file.closeWindow":     { en: "Close Window",              zh: "关闭窗口" },
  "menu.file.getInfo":         { en: "Get Info",                  zh: "显示简介" },
  "menu.file.moveToTrash":     { en: "Move to Trash",             zh: "移到废纸篓" },

  // ── Edit menu ────────────────────────────────────────────────────────────
  "menu.edit.undo":            { en: "Undo",                      zh: "撤销" },
  "menu.edit.redo":            { en: "Redo",                      zh: "重做" },
  "menu.edit.cut":             { en: "Cut",                       zh: "剪切" },
  "menu.edit.copy":            { en: "Copy",                      zh: "拷贝" },
  "menu.edit.paste":           { en: "Paste",                     zh: "粘贴" },
  "menu.edit.selectAll":       { en: "Select All",                zh: "全选" },
  "menu.edit.find":            { en: "Find...",                   zh: "查找..." },

  // ── View menu ────────────────────────────────────────────────────────────
  "menu.view.asIcons":         { en: "as Icons",                  zh: "图标" },
  "menu.view.asList":          { en: "as List",                   zh: "列表" },
  "menu.view.asColumns":       { en: "as Columns",                zh: "分栏" },
  "menu.view.asGallery":       { en: "as Gallery",                zh: "画廊" },
  "menu.view.showSidebar":     { en: "Show Sidebar",              zh: "显示边栏" },
  "menu.view.showPreview":     { en: "Show Preview",              zh: "显示预览" },
  "menu.view.showPathBar":     { en: "Show Path Bar",             zh: "显示路径栏" },
  "menu.view.showStatusBar":   { en: "Show Status Bar",           zh: "显示状态栏" },

  // ── Go menu ──────────────────────────────────────────────────────────────
  "menu.go.back":              { en: "Back",                      zh: "后退" },
  "menu.go.forward":           { en: "Forward",                   zh: "前进" },
  "menu.go.enclosingFolder":   { en: "Enclosing Folder",          zh: "上层文件夹" },
  "menu.go.recents":           { en: "Recents",                   zh: "最近使用" },
  "menu.go.documents":         { en: "Documents",                 zh: "文稿" },
  "menu.go.desktop":           { en: "Desktop",                   zh: "桌面" },
  "menu.go.downloads":         { en: "Downloads",                 zh: "下载" },
  "menu.go.home":              { en: "Home",                      zh: "个人" },
  "menu.go.goToFolder":        { en: "Go to Folder...",           zh: "前往文件夹..." },

  // ── Window menu ──────────────────────────────────────────────────────────
  "menu.window.minimize":      { en: "Minimize",                  zh: "最小化" },
  "menu.window.zoom":          { en: "Zoom",                      zh: "缩放" },
  "menu.window.moveLeft":      { en: "Move Window to Left Side",  zh: "将窗口移到左侧" },
  "menu.window.moveRight":     { en: "Move Window to Right Side", zh: "将窗口移到右侧" },
  "menu.window.bringAllToFront":{ en: "Bring All to Front",       zh: "前置全部窗口" },

  // ── Help menu ────────────────────────────────────────────────────────────
  "menu.help.macosHelp":       { en: "macOS Help",                zh: "macOS 帮助" },
  "menu.help.whatsNew":        { en: "See What's New in macOS",   zh: "查看 macOS 新增功能" },
  "menu.help.newToMac":        { en: "New to Mac? Tour the Basics", zh: "Mac 新手？了解基础知识" },

  // ── App-specific menu ────────────────────────────────────────────────────
  "menu.app.about":            { en: "About {name}",              zh: "关于{name}" },
  "menu.app.hide":             { en: "Hide {name}",               zh: "隐藏{name}" },
  "menu.app.hideOthers":       { en: "Hide Others",               zh: "隐藏其他" },
  "menu.app.showAll":          { en: "Show All",                  zh: "全部显示" },
  "menu.app.quit":             { en: "Quit {name}",               zh: "退出{name}" },

  // ── Per-app File / Edit / View menu items ────────────────────────────────
  // Generic
  "menu.file.new":             { en: "New",                       zh: "新建" },
  "menu.file.newWindow":       { en: "New Window",                zh: "新建窗口" },
  "menu.file.openLocation":    { en: "Open Location...",          zh: "打开位置..." },
  "menu.file.closeTab":        { en: "Close Tab",                 zh: "关闭标签页" },
  "menu.file.save":            { en: "Save",                      zh: "保存" },
  "menu.file.print":           { en: "Print...",                  zh: "打印..." },
  "menu.view.reload":          { en: "Reload",                    zh: "重新载入" },
  "menu.view.goHome":          { en: "Go Home",                   zh: "返回首页" },
  // Notes
  "menu.notes.newNote":        { en: "New Note",                  zh: "新建备忘录" },
  "menu.notes.deleteNote":     { en: "Delete Note",               zh: "删除备忘录" },
  // Terminal
  "menu.terminal.clearBuffer": { en: "Clear Buffer",              zh: "清屏" },
  // Calculator
  "menu.calc.basic":           { en: "Basic",                     zh: "基本型" },
  "menu.calc.scientific":      { en: "Scientific",                zh: "科学型" },
  // Calendar
  "menu.calendar.newEvent":    { en: "New Event",                 zh: "新建活动" },
  "menu.calendar.day":         { en: "by Day",                    zh: "按日" },
  "menu.calendar.week":        { en: "by Week",                   zh: "按周" },
  "menu.calendar.month":       { en: "by Month",                  zh: "按月" },
  "menu.calendar.year":        { en: "by Year",                   zh: "按年" },
  "menu.calendar.goToToday":   { en: "Go to Today",               zh: "前往今天" },
  // Clock
  "menu.clock.worldClock":     { en: "World Clock",               zh: "世界时钟" },
  "menu.clock.alarm":          { en: "Alarm",                     zh: "闹钟" },
  "menu.clock.stopwatch":      { en: "Stopwatch",                 zh: "秒表" },
  "menu.clock.timer":          { en: "Timer",                     zh: "计时器" },
  // Preview
  "menu.preview.zoomIn":       { en: "Zoom In",                   zh: "放大" },
  "menu.preview.zoomOut":      { en: "Zoom Out",                  zh: "缩小" },
  "menu.preview.actualSize":   { en: "Actual Size",               zh: "实际大小" },
  "menu.preview.nextPage":     { en: "Next Page",                 zh: "下一页" },
  "menu.preview.previousPage": { en: "Previous Page",             zh: "上一页" },
  "menu.preview.download":     { en: "Download",                  zh: "下载" },
  // VSCode
  "menu.vscode.commandPalette":{ en: "Command Palette...",        zh: "命令面板..." },
  "menu.vscode.toggleSidebar": { en: "Toggle Sidebar",            zh: "切换侧栏" },
  // Music
  "menu.music.showLibrary":    { en: "Show Library Sidebar",      zh: "显示资料库侧栏" },

  // ── Menu bar labels ──────────────────────────────────────────────────────
  "menubar.file":              { en: "File",                      zh: "文件" },
  "menubar.edit":              { en: "Edit",                      zh: "编辑" },
  "menubar.view":              { en: "View",                      zh: "显示" },
  "menubar.go":                { en: "Go",                        zh: "前往" },
  "menubar.window":            { en: "Window",                    zh: "窗口" },
  "menubar.help":              { en: "Help",                      zh: "帮助" },

  // ── Dock app names ───────────────────────────────────────────────────────
  "dock.finder":               { en: "Finder",                    zh: "访达" },
  "dock.safari":               { en: "Safari",                    zh: "Safari" },
  "dock.notes":                { en: "Notes",                     zh: "备忘录" },
  "dock.textedit":             { en: "TextEdit",                  zh: "文本编辑" },
  "dock.terminal":             { en: "Terminal",                  zh: "终端" },
  "dock.calculator":           { en: "Calculator",                zh: "计算器" },
  "dock.calendar":             { en: "Calendar",                  zh: "日历" },
  "dock.settings":             { en: "System Settings",           zh: "系统设置" },
  "dock.clock":                { en: "Clock",                     zh: "时钟" },
  "dock.downloads":            { en: "Downloads",                 zh: "下载" },
  "dock.trash":                { en: "Trash",                     zh: "废纸篓" },
  "dock.preview":              { en: "Preview",                   zh: "预览" },
  "dock.vscode":               { en: "Code",                      zh: "Code" },
  "dock.word":                 { en: "Word",                      zh: "Word" },
  "dock.music":                { en: "Music",                     zh: "音乐" },

  // ── Clock app ────────────────────────────────────────────────────────────
  "clock.worldClock":          { en: "World Clock",               zh: "世界时钟" },
  "clock.shenzhen":            { en: "Shenzhen",                  zh: "深圳" },
  "clock.beijing":             { en: "Beijing",                   zh: "北京" },
  "clock.canberra":            { en: "Canberra",                  zh: "堪培拉" },
  "clock.losAngeles":          { en: "Los Angeles",               zh: "洛杉矶" },
  "clock.newYork":             { en: "New York",                  zh: "纽约" },
  "clock.london":              { en: "London",                    zh: "伦敦" },
  "clock.paris":               { en: "Paris",                     zh: "巴黎" },
  "clock.sub.shenzhen":        { en: "China",                     zh: "中国" },
  "clock.sub.beijing":         { en: "China",                     zh: "中国" },
  "clock.sub.canberra":        { en: "Australia",                 zh: "澳大利亚" },
  "clock.sub.losAngeles":      { en: "United States",             zh: "美国" },
  "clock.sub.newYork":         { en: "United States",             zh: "美国" },
  "clock.sub.london":          { en: "United Kingdom",            zh: "英国" },
  "clock.sub.paris":           { en: "France",                    zh: "法国" },

  // ── Dock context menu ────────────────────────────────────────────────────
  "dock.ctx.open":             { en: "Open",                      zh: "打开" },
  "dock.ctx.newWindow":        { en: "New Window",                zh: "新建窗口" },
  "dock.ctx.showAllWindows":   { en: "Show All Windows",          zh: "显示全部窗口" },
  "dock.ctx.hide":             { en: "Hide",                      zh: "隐藏" },
  "dock.ctx.options":          { en: "Options \u25b8",            zh: "选项 \u25b8" },
  "dock.ctx.forceQuit":        { en: "Force Quit",                zh: "强制退出" },
  "dock.ctx.showInFinder":     { en: "Show in Finder",            zh: "在访达中显示" },

  // ── Desktop context menu ─────────────────────────────────────────────────
  "desktop.ctx.newFolder":     { en: "New Folder",                zh: "新建文件夹" },
  "desktop.ctx.getInfo":       { en: "Get Info",                  zh: "显示简介" },
  "desktop.ctx.changeWallpaper":{ en: "Change Wallpaper\u2026",   zh: "更改壁纸\u2026" },
  "desktop.ctx.sortBy":        { en: "Sort By",                   zh: "排序方式" },
  "desktop.ctx.cleanUp":       { en: "Clean Up",                  zh: "整理" },
  "desktop.hd.open":           { en: "Open",                      zh: "打开" },
  "desktop.hd.openInNewTab":   { en: "Open in New Tab",           zh: "在新标签页中打开" },
  "desktop.hd.getInfo":        { en: "Get Info",                  zh: "显示简介" },
  "desktop.hd.eject":          { en: 'Eject "Macintosh HD"',            zh: '推出"Macintosh HD"' },
  "desktop.trash.open":        { en: "Open Trash",                zh: "打开废纸篓" },
  "desktop.trash.empty":       { en: "Empty Trash\u2026",         zh: "清倒废纸篓\u2026" },
  "desktop.macintoshHd":       { en: "Macintosh HD",              zh: "Macintosh HD" },
  "desktop.trash":             { en: "Trash",                     zh: "废纸篓" },
  "desktop.file.open":         { en: "Open",                      zh: "打开" },
  "desktop.file.showInFinder": { en: "Show in Finder",            zh: "在 Finder 中显示" },

  // ── Spotlight ────────────────────────────────────────────────────────────
  "spotlight.placeholder":     { en: "Spotlight Search",          zh: "Spotlight 搜索" },
  "spotlight.application":     { en: "Application",               zh: "应用程序" },
  "spotlight.searchWebFor":    { en: "Search the Web for \"{q}\"", zh: "在网络上搜索\"{q}\"" },
  // `spotlight.google` is legacy — kept so existing callsites don't break, but
  // the rewrite uses Bing (Google refuses to embed); `spotlight.web` is the new
  // subtitle on the web-search suggestion row.
  "spotlight.google":          { en: "Google",                    zh: "谷歌" },
  "spotlight.web":             { en: "Bing",                      zh: "Bing" },
  "spotlight.clearQuery":      { en: "Clear search",              zh: "清除搜索" },

  // ── Launchpad ────────────────────────────────────────────────────────────
  "dock.launchpad":            { en: "Launchpad",                 zh: "启动台" },
  "launchpad.searchPlaceholder": { en: "Search",                  zh: "搜索" },
  "launchpad.noResults":       { en: "No matching apps",          zh: "没有匹配的应用" },

  // ── Mission Control ─────────────────────────────────────────────────────
  "dock.missionControl":       { en: "Mission Control",           zh: "调度中心" },
  "missionControl.empty":      { en: "No open windows",           zh: "没有打开的窗口" },
  "missionControl.count":      { en: "{n} window(s) open",        zh: "已打开 {n} 个窗口" },
  "missionControl.emptyHint":  { en: "Open an app from the Dock or Launchpad to see it here",
                                 zh: "从程序坞或启动台打开应用后，这里会显示对应窗口" },

  // ── Login Screen ─────────────────────────────────────────────────────────
  "login.enter":               { en: "Enter",                     zh: "进入" },
  "login.hint":                { en: "Click anywhere or press any key to continue",
                                 zh: "点击任意处或按任意键继续" },

  // ── Finder sidebar ───────────────────────────────────────────────────────
  "finder.sidebar.recents":    { en: "Recents",                   zh: "最近使用" },
  "finder.sidebar.shared":     { en: "Shared",                    zh: "共享" },
  "finder.sidebar.favorites":  { en: "Favorites",                 zh: "个人收藏" },
  "finder.sidebar.downloads":  { en: "Downloads",                 zh: "下载" },
  "finder.sidebar.documents":  { en: "Documents",                 zh: "文稿" },
  "finder.sidebar.desktop":    { en: "Desktop",                   zh: "桌面" },
  "finder.sidebar.applications":{ en: "Applications",             zh: "应用程序" },
  "finder.sidebar.locations":  { en: "Locations",                 zh: "位置" },
  "finder.sidebar.icloudDrive":{ en: "iCloud Drive",              zh: "iCloud 云盘" },
  "finder.sidebar.airdrop":    { en: "AirDrop",                   zh: "隔空投送" },
  "finder.sidebar.network":    { en: "Network",                   zh: "网络" },
  "finder.sidebar.trash":      { en: "Trash",                     zh: "废纸篓" },

  // Special placeholder views
  "finder.special.airdropTitle": { en: "No one nearby",            zh: "附近没有人" },
  "finder.special.airdropDesc":  {
    en: "AirDrop lets you share files with nearby Apple devices. Sharing is unavailable in this preview.",
    zh: "隔空投送可以与附近的 Apple 设备共享文件。此预览中无法使用共享功能。",
  },
  "finder.special.networkTitle": { en: "No servers available",     zh: "没有可用的服务器" },
  "finder.special.networkDesc":  {
    en: "Connect to file servers, computers, or other devices on your network. Network browsing is unavailable in this preview.",
    zh: "连接到网络上的文件服务器、电脑或其他设备。此预览中无法浏览网络。",
  },
  "finder.sidebar.tags":       { en: "Tags",                      zh: "标签" },
  "finder.sidebar.k4rto":      { en: "K4RTO",                     zh: "K4RTO" },

  // ── Finder column headers ────────────────────────────────────────────────
  "finder.col.name":           { en: "Name",                      zh: "名称" },
  "finder.col.size":           { en: "Size",                      zh: "大小" },
  "finder.col.kind":           { en: "Kind",                      zh: "种类" },
  "finder.col.date":           { en: "Date Added",                zh: "添加日期" },

  // Finder search + Get Info
  "finder.searchPlaceholder":  { en: "Filter files",              zh: "过滤当前目录" },
  "finder.info.where":         { en: "Where",                     zh: "位置" },
  "finder.info.modified":      { en: "Modified",                  zh: "修改时间" },
  "finder.info.extension":     { en: "Extension",                 zh: "扩展名" },
  "finder.info.path":          { en: "Full path",                 zh: "完整路径" },

  // ── Finder context menu ──────────────────────────────────────────────────
  "finder.ctx.open":           { en: "Open",                      zh: "打开" },
  "finder.ctx.openWithTextEdit":{ en: "Open With TextEdit",       zh: "用\"文本编辑\"打开" },
  "finder.ctx.getInfo":        { en: "Get Info",                  zh: "显示简介" },
  "finder.ctx.duplicate":      { en: "Duplicate",                 zh: "复制" },
  "finder.ctx.moveToTrash":    { en: "Move to Trash",             zh: "移到废纸篓" },
  "finder.ctx.putBack":        { en: "Put Back",                  zh: "放回原位" },
  "finder.ctx.putBackTo":      { en: "Put Back to {path}",        zh: "放回 {path}" },
  "finder.ctx.deleteImmediately":   { en: "Delete Immediately…",    zh: "立即删除…" },
  "finder.ctx.confirmDeleteImmediately": { en: "Delete \"{name}\" permanently? This cannot be undone.",
                                           zh: "确定永久删除\"{name}\"？此操作无法撤销。" },
  "finder.ctx.emptyTrash":     { en: "Empty",                     zh: "清空" },
  "finder.ctx.confirmEmptyTrash":   { en: "Empty the trash? {n} item(s) will be permanently deleted.",
                                       zh: "清空废纸篓？{n} 项内容将被永久删除。" },
  "finder.ctx.copy":           { en: "Copy \"{name}\"",           zh: "拷贝\"{name}\"" },

  // ── Notes ────────────────────────────────────────────────────────────────
  "notes.iCloud":              { en: "iCloud",                    zh: "iCloud" },
  "notes.notes":               { en: "Notes",                     zh: "备忘录" },
  "notes.recentlyDeleted":     { en: "Recently Deleted",          zh: "最近删除" },
  "notes.onMyMac":             { en: "On My Mac",                 zh: "我的 Mac" },
  "notes.allMyMac":            { en: "All My Mac",                zh: "所有我的 Mac" },
  "notes.newNote":             { en: "New Note",                  zh: "新建备忘录" },
  "notes.selectNote":          { en: "Select a note",             zh: "选择备忘录" },
  "notes.noAdditionalText":    { en: "No additional text",        zh: "无其他文字" },
  "notes.title":               { en: "Notes",                     zh: "备忘录" },

  // ── TextEdit ─────────────────────────────────────────────────────────────
  "textedit.new":              { en: "New",                       zh: "新建" },
  "textedit.open":             { en: "Open",                      zh: "打开" },
  "textedit.save":             { en: "Save",                      zh: "存储" },
  "textedit.wrap":             { en: "Wrap",                      zh: "换行" },
  "textedit.words":            { en: "Words:",                    zh: "字数：" },
  "textedit.chars":            { en: "Characters:",               zh: "字符：" },
  "textedit.untitled":         { en: "Untitled",                  zh: "无标题" },
  "textedit.systemFont":       { en: "System Font",               zh: "系统字体" },
  "textedit.openFile":         { en: "Open File",                 zh: "打开文件" },
  "textedit.noFiles":          { en: "No .txt or .md files in Documents", zh: "文稿中没有 .txt 或 .md 文件" },
  "textedit.startTyping":      { en: "Start typing...",           zh: "开始输入..." },

  // ── Browser ──────────────────────────────────────────────────────────────
  "browser.placeholder":       { en: "Search or enter website name", zh: "搜索或输入网址" },
  "browser.yourFavoriteWebsites":{ en: "Your favorite websites",  zh: "常用网站" },
  "browser.blocked":           { en: "This page cannot be displayed", zh: "无法显示此页面" },
  "browser.openInTab":         { en: "Open in New Tab",           zh: "在新标签页中打开" },

  // Start page
  "browser.favorites":         { en: "Favorites",                 zh: "个人收藏" },
  "browser.frequentlyVisited": { en: "Frequently Visited",        zh: "经常访问" },
  "browser.privacyReport":     { en: "Privacy Report",            zh: "隐私报告" },
  "browser.trackerCount":      { en: "In the last 7 days, Safari prevented {n} trackers from profiling you.", zh: "过去 7 天内，Safari 阻止了 {n} 个跟踪器对你进行分析。" },
  "browser.startTitle":        { en: "Start Page",                zh: "起始页" },

  // Embed handling
  "browser.embedBlocked":      { en: "This site prevents embedding", zh: "此网站不允许嵌入" },
  "browser.embedBlockedDesc":  { en: "For security, {host} doesn't allow being shown in another page. You can still visit it directly.", zh: "出于安全考虑，{host} 不允许在其他页面内显示。你可以直接访问它。" },
  "browser.timeoutTitle":      { en: "Taking too long to load", zh: "页面加载超时" },
  "browser.timeoutDesc":       { en: "The site might be blocking embedded views.", zh: "此网站可能阻止嵌入式视图。" },
  "browser.openExternal":      { en: "Open in browser tab",       zh: "在浏览器新标签中打开" },

  // Special case: JS frame-busters (Google, Facebook, X) — no proxy can fix these
  "browser.unfixableTitle":    { en: "{host} can't be embedded — by design", zh: "{host} 本身拒绝被嵌入" },
  "browser.unfixableDesc":     { en: "This site uses JavaScript to escape any iframe. No proxy or trick can override it — only browser developers can.", zh: "此网站用 JavaScript 主动跳出 iframe。代理或前端技巧都绕不过去 —— 只有浏览器厂商能改这个。" },
  "browser.googleTip":         { en: "Tip: Just type a search query in the address bar — it goes to Bing automatically.", zh: "提示：直接在地址栏输入要搜的关键词 —— 会自动用 Bing 搜索。" },

  // Tabs
  "browser.newTab":            { en: "New Tab",                   zh: "新建标签页" },
  "browser.closeTab":          { en: "Close Tab",                 zh: "关闭标签页" },
  "browser.untitled":          { en: "New Tab",                   zh: "新标签页" },

  // Toolbar
  "browser.back":              { en: "Back",                      zh: "后退" },
  "browser.forward":           { en: "Forward",                   zh: "前进" },
  "browser.reload":            { en: "Reload",                    zh: "重新载入" },
  "browser.home":              { en: "Home",                      zh: "首页" },
  "browser.share":             { en: "Share",                     zh: "分享" },
  "browser.readerMode":        { en: "Show Reader",               zh: "显示阅读器" },
  "browser.readerNotAvailable":{ en: "Reader not available",      zh: "阅读器不可用" },

  // History
  "browser.history":           { en: "History",                   zh: "历史记录" },
  "browser.clearHistory":      { en: "Clear History",             zh: "清除历史记录" },
  "browser.noHistory":         { en: "No browsing history",       zh: "暂无浏览历史" },

  // ── Settings panes ───────────────────────────────────────────────────────
  "settings.appearance":       { en: "Appearance",                zh: "外观" },
  "settings.wifi":             { en: "WiFi",                      zh: "无线局域网" },
  "settings.bluetooth":        { en: "Bluetooth",                 zh: "蓝牙" },
  "settings.notif":            { en: "Notifications",             zh: "通知" },
  "settings.sound":            { en: "Sound",                     zh: "声音" },
  "settings.displays":         { en: "Displays",                  zh: "显示器" },
  "settings.battery":          { en: "Battery",                   zh: "电池" },
  "settings.keyboard":         { en: "Keyboard",                  zh: "键盘" },
  "settings.mouse":            { en: "Mouse",                     zh: "鼠标" },
  "settings.privacy":          { en: "Privacy & Security",        zh: "隐私与安全性" },
  "settings.desktop":          { en: "Desktop & Dock",            zh: "桌面与程序坞" },
  "settings.general":          { en: "General",                   zh: "通用" },
  "settings.wallpaper":        { en: "Wallpaper",                 zh: "墙纸" },
  "settings.search":           { en: "Search",                    zh: "搜索" },

  // Wallpaper pane
  "wallpaper.section.preset":     { en: "Choose a preset",            zh: "选择一个壁纸" },
  "wallpaper.montereyDark":       { en: "Monterey Dark",              zh: "Monterey 暗色" },
  "wallpaper.sequoiaTeal":        { en: "Sequoia Teal",               zh: "Sequoia 青色" },
  "wallpaper.venturaWarm":        { en: "Ventura Sunset",             zh: "Ventura 日落" },
  "wallpaper.sonomaLight":        { en: "Sonoma Light",               zh: "Sonoma 浅色" },
  "wallpaper.note":               { en: "Wallpapers are procedurally animated — switching is instant.", zh: "壁纸由程序生成动画，切换立即生效。" },
  "settings.appleId":          { en: "Apple ID",                  zh: "Apple ID" },
  "settings.comingSoon":       { en: "Settings for {name} coming soon", zh: "{name} 即将推出" },

  // ── Appearance pane ──────────────────────────────────────────────────────
  "appearance.section.appearance":  { en: "Appearance",                     zh: "外观" },
  "appearance.section.accentColor": { en: "Accent Color",                   zh: "强调色" },
  "appearance.section.sidebarSize": { en: "Sidebar icon size",              zh: "边栏图标大小" },
  "appearance.section.options":     { en: "Options",                        zh: "选项" },
  "appearance.wallpaperTint":       { en: "Allow wallpaper tinting in windows", zh: "允许壁纸色调渗入窗口" },
  "appearance.showScrollBars":      { en: "Show scroll bars",               zh: "显示滚动条" },
  "appearance.light":               { en: "light",                          zh: "浅色" },
  "appearance.dark":                { en: "dark",                           zh: "深色" },
  "appearance.auto":                { en: "auto",                           zh: "自动" },
  "appearance.small":               { en: "small",                          zh: "小" },
  "appearance.medium":              { en: "medium",                         zh: "中" },
  "appearance.large":               { en: "large",                          zh: "大" },
  "appearance.automatically":       { en: "Automatically",                  zh: "自动" },
  "appearance.whenScrolling":       { en: "When Scrolling",                 zh: "滚动时" },
  "appearance.always":              { en: "Always",                         zh: "始终" },

  // ── Accent color labels ──────────────────────────────────────────────────
  "color.blue":                { en: "Blue",                      zh: "蓝色" },
  "color.purple":              { en: "Purple",                    zh: "紫色" },
  "color.pink":                { en: "Pink",                      zh: "粉红色" },
  "color.red":                 { en: "Red",                       zh: "红色" },
  "color.orange":              { en: "Orange",                    zh: "橙色" },
  "color.yellow":              { en: "Yellow",                    zh: "黄色" },
  "color.green":               { en: "Green",                     zh: "绿色" },
  "color.graphite":            { en: "Graphite",                  zh: "石墨色" },

  // ── Calendar ─────────────────────────────────────────────────────────────
  "cal.month.0":               { en: "January",                   zh: "一月" },
  "cal.month.1":               { en: "February",                  zh: "二月" },
  "cal.month.2":               { en: "March",                     zh: "三月" },
  "cal.month.3":               { en: "April",                     zh: "四月" },
  "cal.month.4":               { en: "May",                       zh: "五月" },
  "cal.month.5":               { en: "June",                      zh: "六月" },
  "cal.month.6":               { en: "July",                      zh: "七月" },
  "cal.month.7":               { en: "August",                    zh: "八月" },
  "cal.month.8":               { en: "September",                 zh: "九月" },
  "cal.month.9":               { en: "October",                   zh: "十月" },
  "cal.month.10":              { en: "November",                  zh: "十一月" },
  "cal.month.11":              { en: "December",                  zh: "十二月" },
  "cal.monthS.0":              { en: "Jan",                       zh: "1月" },
  "cal.monthS.1":              { en: "Feb",                       zh: "2月" },
  "cal.monthS.2":              { en: "Mar",                       zh: "3月" },
  "cal.monthS.3":              { en: "Apr",                       zh: "4月" },
  "cal.monthS.4":              { en: "May",                       zh: "5月" },
  "cal.monthS.5":              { en: "Jun",                       zh: "6月" },
  "cal.monthS.6":              { en: "Jul",                       zh: "7月" },
  "cal.monthS.7":              { en: "Aug",                       zh: "8月" },
  "cal.monthS.8":              { en: "Sep",                       zh: "9月" },
  "cal.monthS.9":              { en: "Oct",                       zh: "10月" },
  "cal.monthS.10":             { en: "Nov",                       zh: "11月" },
  "cal.monthS.11":             { en: "Dec",                       zh: "12月" },
  "cal.day.0":                 { en: "Sun",                       zh: "日" },
  "cal.day.1":                 { en: "Mon",                       zh: "一" },
  "cal.day.2":                 { en: "Tue",                       zh: "二" },
  "cal.day.3":                 { en: "Wed",                       zh: "三" },
  "cal.day.4":                 { en: "Thu",                       zh: "四" },
  "cal.day.5":                 { en: "Fri",                       zh: "五" },
  "cal.day.6":                 { en: "Sat",                       zh: "六" },
  "cal.today":                 { en: "Today",                     zh: "今天" },
  "cal.events":                { en: "Events",                    zh: "活动" },
  "cal.noEventsToday":         { en: "No events today",           zh: "今天没有活动" },
  "cal.noEvents":              { en: "No events",                 zh: "没有活动" },

  // ── i18n sweep: Calculator ─────────────────────────────────────────────
  "calculator.sci.switchToBasic":      { en: "Switch to Basic",          zh: "切换到基础模式" },
  "calculator.sci.switchToScientific": { en: "Switch to Scientific",     zh: "切换到科学模式" },
  "calculator.error":          { en: "Error",                     zh: "错误" },

  // ── i18n sweep: Finder ─────────────────────────────────────────────────
  "finder.toolbar.comingSoon": { en: "Coming soon",               zh: "敬请期待" },
  "finder.emptyFolder":        { en: "This folder is empty",      zh: "此文件夹为空" },
  "finder.zeroKB":             { en: "Zero KB",                   zh: "零 KB" },
  "finder.todayAt":            { en: "Today at {time}",           zh: "今天 {time}" },
  "finder.yesterdayAt":        { en: "Yesterday at {time}",       zh: "昨天 {time}" },

  // ── i18n sweep: Browser ────────────────────────────────────────────────
  "browser.proxy.tooltip":     { en: "All navigations route through the Cloudflare Worker proxy",
                                 zh: "所有导航通过 Cloudflare Worker 代理转发" },
  "browser.proxy.enabled":     { en: "Proxy enabled",             zh: "代理已启用" },

  // ── i18n sweep: Preview ────────────────────────────────────────────────
  "preview.resumeLanguageGroup": { en: "Resume language",         zh: "简历语言" },
  "preview.resumeEnglish":     { en: "English Resume",            zh: "英文简历" },
  "preview.resumeChinese":     { en: "Chinese Resume",            zh: "中文简历" },
  "preview.previousPage":      { en: "Previous Page",             zh: "上一页" },
  "preview.nextPage":          { en: "Next Page",                 zh: "下一页" },
  "preview.zoomOut":           { en: "Zoom Out (⌘−)",             zh: "缩小 (⌘−)" },
  "preview.actualSize":        { en: "Actual Size (⌘0)",          zh: "实际大小 (⌘0)" },
  "preview.zoomIn":            { en: "Zoom In (⌘+)",              zh: "放大 (⌘+)" },
  "preview.download":          { en: "Download (⌘S)",             zh: "下载 (⌘S)" },
  "preview.print":             { en: "Print (⌘P)",                zh: "打印 (⌘P)" },
  "preview.loadingPdf":        { en: "Loading PDF…",              zh: "正在加载 PDF…" },
  "preview.failedLoadPdf":     { en: "Failed to load PDF",        zh: "PDF 加载失败" },
  "preview.downloadInstead":   { en: "Download instead",          zh: "改为下载" },
  "preview.renderingPage":     { en: "Rendering page…",           zh: "正在渲染页面…" },
  "preview.noFile":            { en: "No file to display",        zh: "没有可显示的文件" },

  // ── i18n sweep: Notes ──────────────────────────────────────────────────
  "notes.editor.title":        { en: "Title",                     zh: "标题" },
  "notes.editor.content":      { en: "Note content...",           zh: "笔记内容..." },
  "notes.portfolio.protected": { en: "Portfolio · protected",     zh: "作品集 · 只读" },
  "notes.portfolio.cannotDelete": {
    en: "Portfolio notes are protected and can't be deleted. Create your own note first, then delete that.",
    zh: "作品集笔记受保护，无法删除。你可以先创建一个自己的笔记，然后再删除它。",
  },

  // ── i18n sweep: TextEdit ───────────────────────────────────────────────
  "textedit.defaultFilename":  { en: "Untitled.txt",              zh: "未命名.txt" },

  // ── i18n sweep: Word ───────────────────────────────────────────────────
  "word.ribbon.bold":          { en: "Bold (⌘B)",                 zh: "粗体 (⌘B)" },
  "word.ribbon.italic":        { en: "Italic (⌘I)",               zh: "斜体 (⌘I)" },
  "word.ribbon.underline":     { en: "Underline (⌘U)",            zh: "下划线 (⌘U)" },
  "word.ribbon.alignLeft":     { en: "Align Left",                zh: "左对齐" },
  "word.ribbon.center":        { en: "Center",                    zh: "居中" },
  "word.ribbon.alignRight":    { en: "Align Right",               zh: "右对齐" },
  "word.ribbon.save":          { en: "Save",                      zh: "保存" },
  "word.status.words":         { en: "words",                     zh: "词" },
  "word.status.characters":    { en: "characters",                zh: "字符" },
  "word.status.unsavedChanges":{ en: "Unsaved changes",           zh: "有未保存的更改" },
  "word.status.saved":         { en: "Saved",                     zh: "已保存" },
  "word.placeholder":          { en: "Start typing your document...", zh: "开始输入文档内容..." },
  "word.defaultFilename":      { en: "Document.docx",             zh: "文档.docx" },

  // ── i18n sweep: VSCode ─────────────────────────────────────────────────
  "vscode.sidebar.explorer":   { en: "Explorer",                  zh: "资源管理器" },
  "vscode.activity.search":    { en: "Search",                    zh: "搜索" },
  "vscode.activity.git":       { en: "Git",                       zh: "Git" },
  "vscode.defaultFilename":    { en: "Untitled",                  zh: "未命名" },
  "vscode.sidebar.noFiles":    { en: "No files",                  zh: "没有文件" },
  "vscode.sidebar.outline":    { en: "Outline",                   zh: "大纲" },
  "vscode.tooltip.portfolioReadOnly": { en: "Portfolio sources are read-only — Edit shows plaintext",
                                        zh: "作品集源码只读 — 切到 Edit 可看纯文本" },
  "vscode.tabs.edit":          { en: "Edit",                      zh: "编辑" },
  "vscode.tabs.preview":       { en: "Preview",                   zh: "预览" },
  "vscode.placeholder":        { en: "// Start typing...",        zh: "// 开始输入..." },
  "vscode.status.branch":      { en: "⎇ main",                    zh: "⎇ main" },
  "vscode.status.modified":    { en: "● Modified",                zh: "● 已修改" },
  "vscode.status.position":    { en: "Ln {line}, Col {col}",      zh: "行 {line}, 列 {col}" },
  "vscode.status.encoding":    { en: "UTF-8",                     zh: "UTF-8" },

  // ── i18n sweep: LoginScreen + MenuBar ──────────────────────────────────
  "loginscreen.power":         { en: "Power",                     zh: "电源" },
  "menubar.spotlight":         { en: "Spotlight (⌘Space)",        zh: "Spotlight 搜索 (⌘Space)" },
};

export default translations;
