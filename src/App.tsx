import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { PrivateMusicLibraryEditor } from "./PrivateMusicLibraryEditor";
import { PrivateMusicPlayer, type MusicPlayRequest } from "./PrivateMusicPlayer";
import {
  createVisitorInvite,
  deletePrivateEntry,
  isTransientPrivateSpaceError,
  isPrivateSpaceConfigured,
  loadAdminDashboard,
  loadPrivateSpace,
  postGuestbookMessage,
  savePrivateEntry,
  setGuestbookMessageStatus,
  setVisitorInviteStatus,
  unlockPrivateSpace,
  uploadPrivateMedia,
  type AdminDashboard,
  type PrivateEntry,
  type PrivateMusicTrack,
  type PrivateSpaceContent,
} from "./privateSpaceApi";
import {
  markdownPreview,
  moveEntryImage,
  parseEntryImages,
  serializeEntryImages,
  type EntryImage,
  type EntryImageAlign,
  type EntryImageSize,
} from "./privateEntryMedia";

const assetPath = (fileName: string) => `${import.meta.env.BASE_URL}${fileName}`;

type PageKey = "home" | "projects" | "publications" | "notes" | "awards" | "gallery" | "space" | "admin";
type Language = "en" | "zh";
type SiteTheme = "minimal" | "band";

const copy = {
  en: {
    languageToggle: "中文",
    languageLabel: "Switch to Chinese",
    home: "Home",
    projects: "Projects",
    publications: "Publications",
    notes: "Tech Notes",
    awards: "Awards",
    gallery: "Gallery",
    space: "Personal Space",
    closeNavigation: "Close navigation",
    openNavigation: "Open navigation",
    contents: "Contents",
    switchToBandStyle: "Switch to the girl-band edition",
    switchToMinimalStyle: "Switch to the minimal academic edition",
    researchLog: "陈彧赟 / research log",
    role: "Software engineering · Applied AI · Research notes",
    intro: "I work at the intersection of software engineering, data-driven systems, and applied research. This is my living log of models, competitions, experiments, and the notes behind each finished result.",
    openFieldNotes: "Open field notes",
    academicWork: "Academic work",
    readSetlist: "Read the setlist",
    selectedProjects: "Selected projects",
    competitionAwards: "Competition awards",
    publicationsPreprints: "Publications / preprints",
    researchDirections: "Research directions",
    resumeSnapshot: "Profile / 2026",
    resumeProfile: "Resume profile",
    basedIn: "Based in",
    currentFocus: "Current focus",
    openTo: "Open to",
    internshipRoles: "AI product management · Algorithm engineering internships",
    inspirationBoard: "Girl band inspiration board",
    bandResearchClub: "band-side research club / vol. 01",
    liveLog: "LIVE LOG",
    characterStickers: "5 character stickers",
    characterReferences: "Character references: AniList / BanG Dream! Ave Mujica",
    aboutMargin: "About / margin note",
    aboutHeading: "Build it. Test it. Write down what changed.",
    aboutNote: "research should leave traces",
    aboutParagraphOne: "I am preparing for roles and academic opportunities where engineering practice and research judgment both matter. My work emphasizes clear problem framing, reproducible implementation, and readable communication.",
    aboutParagraphTwo: "My academic interests are grounded in implementation: systems that can be tested, explained, and transferred into real use.",
    projectsKicker: "Projects / production notes",
    projectsTitle: "Selected technical work",
    projectsDescription: "Each project is logged like a track in production: context, tools, implementation notes, and the public link.",
    publicationsKicker: "Publications / research tracks",
    publicationsTitle: "Academic output",
    publicationsDescription: "Papers, preprints, posters, and technical reports arranged as an evolving research discography.",
    notesKicker: "Technical notes / workbench",
    notesTitle: "Notes from the build",
    notesDescription: "Methods, implementation decisions, model experiments, and the useful fragments that live between a project and a paper.",
    awardsKicker: "Awards / live set",
    awardsTitle: "Competition setlist",
    awardsDescription: "The model, the result, and the part of the problem that made each competition worth remembering.",
    galleryKicker: "Gallery / contact sheet",
    galleryTitle: "Visual record",
    galleryDescription: "Project work, presentations, competitions, and the in-between moments that do not fit into a formal abstract.",
    openNote: "Open note ↗",
    read: "Read ↗",
    imageReferences: "Image references: AniList / BanG Dream! It's MyGO!!!!! / Ave Mujica.",
    privateEdition: "Private edition / no. 06",
    lastEncore: "After the",
    lastEncoreEm: "last encore.",
    privateIntro: "Writing, photographs, film notes, and unfinished fragments shared with invited visitors.",
    personalInvitation: "Your personal invitation",
    invitationPlaceholder: "Enter invitation code",
    checking: "Checking...",
    restoringAccess: "Restoring your private access...",
    requestTimedOut: "The connection took too long. You can try again now.",
    enter: "Enter ↗",
    privateSetup: "Private archive setup in progress.",
    invitationFootnote: "Each invitation belongs to one visitor and may be paused without erasing its history.",
    visitor: "visitor",
    welcomeAfterHours: "Welcome after hours,",
    visitorPass: "VISITOR PASS",
    manageVisitors: "Manage visitors →",
    logOut: "Log out",
    firstEntry: "The first private entry is being prepared.",
    guestbookKicker: "Guestbook / leave a trace",
    guestbookTitle: "A note before",
    guestbookTitleEm: "you leave.",
    guestbookIntro: "Your notes stay visible only to you and Yuyun. They cannot be edited or deleted here.",
    guestbookPlaceholder: "Write something here...",
    posting: "Posting...",
    pinNote: "Pin this note",
    noteDelivered: "Your note has been delivered to Yuyun.",
    yourMessages: "Your pinned notes",
    noMessagesYet: "Nothing pinned yet.",
    messageTime: "Pinned",
    filterByType: "Filter by type",
    filterStartDate: "Start date",
    filterEndDate: "End date",
    filterDatePlaceholder: "yyyymmdd",
    allTypes: "All types",
    entriesShown: "entries shown",
    noFilteredEntries: "No entries match these filters.",
    viewDouban: "View on Douban",
    doubanLink: "Douban movie link",
    doubanLinkPlaceholder: "https://movie.douban.com/subject/...",
    ownerStudio: "Owner studio / private editor",
    shapeArchive: "Shape the archive.",
    editorIntro: "Write in Markdown, arrange images, preview the layout, then publish when ready.",
    newEntry: "New entry +",
    closeEditor: "Close editor",
    openEditor: "Open editor",
    yourEntries: "Your entries",
    noEntries: "No entries yet.",
    published: "Published",
    draft: "Draft",
    title: "Title",
    titlePlaceholder: "A title for this fragment",
    type: "Type",
    writing: "Writing",
    photography: "Photography",
    filmNote: "Film note",
    excerpt: "Excerpt",
    excerptPlaceholder: "The short line visitors see first",
    markdownBody: "Markdown body",
    markdownPlaceholder: "# Heading\n\nWrite with Markdown...",
    newFragmentMarkdown: "# A new fragment\n\nWrite in **Markdown** here...",
    nothingWritten: "Nothing written yet.",
    eventDate: "Event date",
    entrySoundtrack: "Entry soundtrack",
    defaultPlaylist: "Use the default playlist",
    playEntrySoundtrack: "Play this note's soundtrack",
    image: "Images",
    imageUploadHelp: "Select multiple images. Original files are stored without compression.",
    optimizingImage: "Uploading original images...",
    imageReady: "Images uploaded and ready.",
    removeImage: "Remove image",
    setAsCover: "Use as cover",
    coverImage: "Cover",
    displaySize: "Display size",
    imageSmall: "Small",
    imageMedium: "Medium",
    imageLarge: "Large",
    imageFull: "Full",
    moveEarlier: "Move image earlier",
    moveLater: "Move image later",
    dragImage: "Drag to reorder",
    insertImage: "Insert at cursor",
    imageInserted: "Image marker inserted into the article.",
    imageCaption: "Caption",
    imageCaptionPlaceholder: "Optional image caption",
    imageAlignment: "Alignment",
    alignLeft: "Left",
    alignCenter: "Center",
    alignRight: "Right",
    coverCrop: "Card cover crop",
    coverCropHelp: "Drag the image to choose the part shown on the collapsed card.",
    resetCrop: "Reset crop",
    selectedEntryCover: "Selected entry cover",
    expandEntry: "Expand",
    collapseEntry: "Close article",
    publishEntry: "Publish this entry to invited visitors",
    saving: "Saving...",
    saveEntry: "Save entry",
    delete: "Delete",
    livePreview: "Live preview",
    untitledFragment: "Untitled fragment",
    ownerRequiredTitle: "A title is required.",
    publishedVisitors: "Published to your visitors.",
    savedDraft: "Saved as a private draft.",
    entryDeleted: "Entry deleted.",
    deleteEntryConfirm: "Delete this private entry?",
    ownerConsoleKicker: "Owner console / private access",
    visitorControlRoom: "Visitor control room.",
    ownerConsoleIntro: "Use your owner invitation to manage visitors, activity, and guestbook moderation.",
    ownerCodePlaceholder: "Owner invitation code",
    openConsole: "Open console",
    backToSpace: "← Back to personal space",
    ownerConsole: "Owner console",
    refreshData: "Refresh data",
    refreshing: "Refreshing...",
    signOut: "Sign out",
    personalSpaceArrow: "Personal space →",
    totalVisitors: "Total visitors",
    activeAccess: "Active access",
    totalUnlocks: "Total unlocks",
    messages: "Messages",
    createVisitor: "Create visitor",
    visitorName: "Visitor name",
    visitorNamePlaceholder: "e.g. Chen / close friend",
    invitationCode: "Invitation code",
    randomCharacters: "visitor name + 13 random characters",
    generate: "Generate",
    expiresOn: "Expires on",
    optional: "optional",
    creating: "Creating...",
    createInvitation: "Create invitation",
    newInvitationReady: "New invitation ready",
    copy: "Copy",
    copied: "Copied",
    invitationHelp: "Send this code to the visitor. It cannot be recovered from the database later.",
    visitorAccess: "Visitor access",
    noVisitors: "No visitors yet.",
    visits: "Visits",
    lastSeen: "Last seen",
    expires: "Expires",
    noExpiry: "No expiry",
    active: "Active",
    paused: "Paused",
    pauseAccess: "Pause access",
    restoreAccess: "Restore access",
    recentActivity: "Recent activity",
    noActivity: "No activity yet.",
    guestbookModeration: "Guestbook moderation",
    noMessages: "No messages yet.",
    hide: "Hide",
    show: "Show",
    never: "Never",
    contactKicker: "Backstage pass / contact",
    connect: "Let's connect.",
    lookingFor: "Based in Guangzhou, China, currently looking for internships in AI product management or algorithm engineering.",
    copyEmail: "Copy Outlook email",
    emailCopied: "Email address copied to clipboard",
  },
  zh: {
    languageToggle: "EN",
    languageLabel: "切换为英文",
    home: "首页",
    projects: "项目",
    publications: "学术",
    notes: "笔记",
    awards: "竞赛",
    gallery: "图片墙",
    space: "个人",
    closeNavigation: "关闭导航",
    openNavigation: "打开导航",
    contents: "目录",
    switchToBandStyle: "切换到少女乐队版",
    switchToMinimalStyle: "切换到简约学术版",
    researchLog: "陈彧赟 / 研究记录",
    role: "软件工程 · 应用 AI · 研究笔记",
    intro: "我关注软件工程、数据驱动系统与应用研究的交汇处。这里记录模型、竞赛、实验，以及每个结果背后的思考过程。",
    openFieldNotes: "查看项目记录",
    academicWork: "查看学术成果",
    readSetlist: "查看竞赛成果",
    selectedProjects: "精选项目",
    competitionAwards: "竞赛奖项",
    publicationsPreprints: "论文 / 预印本",
    researchDirections: "研究方向",
    resumeSnapshot: "个人概览 / 2026",
    resumeProfile: "简历概览",
    basedIn: "所在地",
    currentFocus: "当前方向",
    openTo: "求职意向",
    internshipRoles: "AI 产品经理 · 算法工程实习",
    inspirationBoard: "少女乐队灵感板",
    bandResearchClub: "乐队侧研究社 / 第 01 期",
    liveLog: "现场记录",
    characterStickers: "5 张角色贴纸",
    characterReferences: "角色资料：AniList / BanG Dream! Ave Mujica",
    aboutMargin: "关于 / 页边注",
    aboutHeading: "把它做出来。测试它。记下变化。",
    aboutNote: "研究应该留下痕迹",
    aboutParagraphOne: "我正在寻找能够同时重视工程实践与研究判断的实习和学术机会。我的工作强调清晰的问题定义、可复现的实现，以及易于理解的表达。",
    aboutParagraphTwo: "我的学术兴趣始终落在实现上：让系统可以被测试、被解释，并真正迁移到实际使用中。",
    projectsKicker: "项目 / 制作记录",
    projectsTitle: "精选技术项目",
    projectsDescription: "每个项目都像一首制作中的曲目：记录背景、工具、实现细节和公开地址。",
    publicationsKicker: "学术成果 / 研究轨道",
    publicationsTitle: "学术产出",
    publicationsDescription: "论文、预印本、海报与技术报告，组成一份持续更新的研究唱片目录。",
    notesKicker: "技术笔记 / 工作台",
    notesTitle: "构建过程中的记录",
    notesDescription: "方法、实现决策、模型实验，以及项目和论文之间那些值得留下的片段。",
    awardsKicker: "竞赛成果 / 现场演出",
    awardsTitle: "竞赛曲目单",
    awardsDescription: "模型、结果，以及让每场竞赛值得记住的那个问题切面。",
    galleryKicker: "图片墙 / 接触表",
    galleryTitle: "视觉记录",
    galleryDescription: "项目、展示、竞赛，以及那些无法放进正式摘要的中间时刻。",
    openNote: "打开记录 ↗",
    read: "阅读 ↗",
    imageReferences: "图片资料：AniList / BanG Dream! It's MyGO!!!!! / Ave Mujica。",
    privateEdition: "私人版本 / 第 06 号",
    lastEncore: "最后一场",
    lastEncoreEm: "安可之后。",
    privateIntro: "写作、摄影、影评和未完成的片段，只与受邀访客分享。",
    personalInvitation: "你的专属邀请",
    invitationPlaceholder: "输入邀请密钥",
    checking: "检查中...",
    restoringAccess: "正在恢复你的私人访问权限...",
    requestTimedOut: "连接等待时间过长，现在可以重新尝试。",
    enter: "进入 ↗",
    privateSetup: "私人档案正在设置中。",
    invitationFootnote: "每个邀请只属于一位访客，可以暂停访问，但不会抹去历史记录。",
    visitor: "访客",
    welcomeAfterHours: "欢迎来到闭馆之后，",
    visitorPass: "访客通行证",
    manageVisitors: "管理访客 →",
    logOut: "退出登录",
    firstEntry: "第一篇私人记录正在准备中。",
    guestbookKicker: "留言板 / 留下一点痕迹",
    guestbookTitle: "离开之前，",
    guestbookTitleEm: "写一句话。",
    guestbookIntro: "留言只对你本人和 Yuyun 可见；访客端不能编辑或删除。",
    guestbookPlaceholder: "在这里写点什么...",
    posting: "发布中...",
    pinNote: "钉住这张便签",
    noteDelivered: "你的留言已经送达 Yuyun。",
    yourMessages: "你留下的便签",
    noMessagesYet: "还没有留下便签。",
    messageTime: "写于",
    filterByType: "按类型筛选",
    filterStartDate: "起始日期",
    filterEndDate: "终止日期",
    filterDatePlaceholder: "年月日",
    allTypes: "全部类型",
    entriesShown: "篇记录",
    noFilteredEntries: "没有符合当前筛选条件的记录。",
    viewDouban: "前往豆瓣",
    doubanLink: "豆瓣电影链接",
    doubanLinkPlaceholder: "https://movie.douban.com/subject/...",
    ownerStudio: "管理员工作室 / 私人编辑器",
    shapeArchive: "塑造这座档案馆。",
    editorIntro: "使用 Markdown 写作，排列多张图片，预览排版，准备好后再发布。",
    newEntry: "新建记录 +",
    closeEditor: "关闭编辑器",
    openEditor: "打开编辑器",
    yourEntries: "你的记录",
    noEntries: "还没有记录。",
    published: "已发布",
    draft: "草稿",
    title: "标题",
    titlePlaceholder: "给这段记录起一个标题",
    type: "类型",
    writing: "写作",
    photography: "摄影",
    filmNote: "影评",
    excerpt: "摘要",
    excerptPlaceholder: "访客首先看到的短句",
    markdownBody: "Markdown 正文",
    markdownPlaceholder: "# 标题\n\n使用 Markdown 写作...",
    newFragmentMarkdown: "# 一段新的记录\n\n在这里用 **Markdown** 写下内容...",
    nothingWritten: "还没有写下内容。",
    eventDate: "记录日期",
    entrySoundtrack: "文章配乐",
    defaultPlaylist: "使用默认歌单",
    playEntrySoundtrack: "播放这篇文章的配乐",
    image: "图片",
    imageUploadHelp: "可以一次选择多张图片，原图会直接保存，不再压缩。",
    optimizingImage: "正在上传原图...",
    imageReady: "图片已上传，可以保存。",
    removeImage: "移除图片",
    setAsCover: "设为封面",
    coverImage: "封面",
    displaySize: "展示尺寸",
    imageSmall: "小",
    imageMedium: "中",
    imageLarge: "大",
    imageFull: "通栏",
    moveEarlier: "向前移动图片",
    moveLater: "向后移动图片",
    dragImage: "拖拽调整顺序",
    insertImage: "插入正文光标处",
    imageInserted: "图片标记已插入正文。",
    imageCaption: "图片说明",
    imageCaptionPlaceholder: "可选的图片说明",
    imageAlignment: "对齐方式",
    alignLeft: "左对齐",
    alignCenter: "居中",
    alignRight: "右对齐",
    coverCrop: "卡片封面裁切",
    coverCropHelp: "拖动图片，选择折叠卡片上要展示的区域。",
    resetCrop: "重置裁切",
    selectedEntryCover: "已选记录封面",
    expandEntry: "展开",
    collapseEntry: "收起文章",
    publishEntry: "向受邀访客发布这篇记录",
    saving: "保存中...",
    saveEntry: "保存记录",
    delete: "删除",
    livePreview: "实时预览",
    untitledFragment: "未命名片段",
    ownerRequiredTitle: "请输入标题。",
    publishedVisitors: "已向访客发布。",
    savedDraft: "已保存为私人草稿。",
    entryDeleted: "记录已删除。",
    deleteEntryConfirm: "删除这篇私人记录？",
    ownerConsoleKicker: "管理员控制台 / 私人访问",
    visitorControlRoom: "访客控制室。",
    ownerConsoleIntro: "使用管理员邀请密钥管理访客、访问记录和留言审核。",
    ownerCodePlaceholder: "管理员邀请密钥",
    openConsole: "打开控制台",
    backToSpace: "← 返回个人空间",
    ownerConsole: "管理员控制台",
    refreshData: "刷新数据",
    refreshing: "刷新中...",
    signOut: "退出控制台",
    personalSpaceArrow: "个人空间 →",
    totalVisitors: "访客总数",
    activeAccess: "当前有效",
    totalUnlocks: "访问次数",
    messages: "留言数量",
    createVisitor: "创建访客",
    visitorName: "访客名称",
    visitorNamePlaceholder: "例如：Huang Ruiqi / 好朋友",
    invitationCode: "邀请密钥",
    randomCharacters: "访客名称 + 13 位随机字符",
    generate: "重新生成",
    expiresOn: "失效日期",
    optional: "可选",
    creating: "创建中...",
    createInvitation: "创建邀请",
    newInvitationReady: "新邀请已生成",
    copy: "复制",
    copied: "已复制",
    invitationHelp: "把这个密钥发送给访客，数据库不会保存可恢复的明文密钥。",
    visitorAccess: "访客访问",
    noVisitors: "还没有访客。",
    visits: "访问次数",
    lastSeen: "最近访问",
    expires: "失效时间",
    noExpiry: "永不过期",
    active: "有效",
    paused: "已暂停",
    pauseAccess: "暂停访问",
    restoreAccess: "恢复访问",
    recentActivity: "最近活动",
    noActivity: "还没有活动。",
    guestbookModeration: "留言审核",
    noMessages: "还没有留言。",
    hide: "隐藏",
    show: "显示",
    never: "从未",
    contactKicker: "后台通行证 / 联系方式",
    connect: "保持联系。",
    lookingFor: "目前在中国广州，正在寻找 AI 产品经理或算法方向的实习机会。",
    copyEmail: "复制 Outlook 邮箱",
    emailCopied: "邮箱地址已复制到剪贴板",
  },
} as const;

type CopyKey = keyof typeof copy.en;

const minimalCopy: Record<Language, Partial<Record<CopyKey, string>>> = {
  en: {
    openFieldNotes: "View projects",
    academicWork: "View publications",
    readSetlist: "View competition results",
    aboutMargin: "Profile / approach",
    aboutHeading: "Engineering grounded in research.",
    aboutNote: "clear questions · reproducible work · readable results",
    projectsKicker: "Projects / selected work",
    projectsDescription: "Selected engineering and research projects with context, methods, implementation details, and public links.",
    publicationsKicker: "Publications / research",
    publicationsDescription: "Papers, preprints, posters, and technical reports presented as a concise academic record.",
    notesKicker: "Technical notes / methods",
    notesTitle: "Technical notes",
    notesDescription: "Methods, implementation decisions, model experiments, and reproducible observations.",
    awardsKicker: "Competitions / distinctions",
    awardsTitle: "Competition results",
    awardsDescription: "Selected modeling competitions with awards, methods, and quantitative outcomes.",
    contactKicker: "Contact / opportunities",
    connect: "Get in touch.",
  },
  zh: {
    openFieldNotes: "查看项目",
    academicWork: "查看学术成果",
    readSetlist: "查看竞赛成果",
    aboutMargin: "个人概览 / 方法",
    aboutHeading: "以研究判断为基础的工程实践。",
    aboutNote: "清晰问题 · 可复现实现 · 可读结果",
    projectsKicker: "项目 / 精选工作",
    projectsDescription: "精选工程与研究项目，集中呈现背景、方法、实现细节与公开链接。",
    publicationsKicker: "学术成果 / 研究",
    publicationsDescription: "以简洁的学术履历形式呈现论文、预印本、海报与技术报告。",
    notesKicker: "技术笔记 / 方法",
    notesTitle: "技术笔记",
    notesDescription: "记录方法、实现决策、模型实验与可复现的观察结果。",
    awardsKicker: "竞赛 / 荣誉",
    awardsTitle: "竞赛成果",
    awardsDescription: "集中呈现建模竞赛奖项、核心方法与量化结果。",
    contactKicker: "联系 / 机会",
    connect: "保持联系。",
  },
};

function tr(language: Language, key: CopyKey) {
  return copy[language][key];
}

function themedTr(language: Language, theme: SiteTheme, key: CopyKey) {
  return theme === "minimal" ? minimalCopy[language][key] || tr(language, key) : tr(language, key);
}

function localized(language: Language, english: string, chinese: string) {
  return language === "zh" ? chinese : english;
}

const navLabelKeys: Record<Exclude<PageKey, "admin">, CopyKey> = {
  home: "home",
  projects: "projects",
  publications: "publications",
  notes: "notes",
  awards: "awards",
  gallery: "gallery",
  space: "space",
};

const profile = {
  name: "Yuyun Chen（陈彧赟）",
  role: "Software engineering · Applied AI · Research notes",
  location: "Guangzhou, China",
  email: "chensilu_0717@outlook.com",
  github: "https://github.com/chippyzhou",
  intro:
    "I work at the intersection of software engineering, data-driven systems, and applied research. This is my living log of models, competitions, experiments, and the notes behind each finished result.",
  focus: ["Software Engineering", "AI Applications", "Research Systems"],
  focusZh: ["软件工程", "AI 应用", "研究系统"],
};

const metrics = [
  { value: "6+", label: "Selected projects" },
  { value: "03", label: "Competition awards" },
  { value: "02", label: "Publications / preprints" },
  { value: "02", label: "Research directions" },
];

const projects = [
  {
    title: "Coming soon",
    titleZh: "待更新",
    type: "Project archive",
    typeZh: "项目档案",
    period: "In preparation",
    link: null,
    summary:
      "Selected project details, demos, and repository links are being organized and will be added here.",
    summaryZh: "项目详情、演示与代码仓库链接正在整理，将在这里陆续更新。",
    tags: ["Coming soon"],
    tagsZh: ["待更新"],
  },
];

const publications = [
  {
    title: "Sparse Attention for Video Generation Acceleration via Growing Sparsity and Reduced Search",
    titleZh: "基于渐进稀疏与缩减搜索的视频生成稀疏注意力加速",
    authors: null,
    venue: "2026",
    venueZh: "2026",
    status: "In submission",
    statusZh: "在投",
    summary:
      "Proposes Growing Sparsity and Reduced Search (GSRS), a training-free sparse-attention framework that progressively increases sparsity during denoising and reuses an early sparse mask to reduce later search. On HunyuanVideo and Wan 2.1, GSRS delivers 1.78x-2.21x acceleration while preserving generation quality.",
    summaryZh: "提出无需训练的稀疏注意力框架 GSRS：随去噪过程逐步提高稀疏率，并复用早期稀疏掩码以缩减后续搜索空间。在 HunyuanVideo 与 Wan 2.1 上实现 1.78x-2.21x 加速，同时保持生成质量。",
    link: null,
  },
  {
    title: "EgoSafe: A First-Person Mobile-Captured Benchmark for Visual Safety Understanding",
    titleZh: "EgoSafe：面向视觉安全理解的第一人称移动端采集基准",
    authors: "Yuyun Chen*, Tianao Li*, TianQuan Feng, Cen Chen, Huiping Zhuang, Hao Peng, and Ziqian Zeng",
    venue: "arXiv:2607.26518, 2026",
    venueZh: "arXiv:2607.26518，2026",
    status: "arXiv preprint",
    statusZh: "arXiv 预印本",
    summary:
      "Introduces EgoSafe-Bench, with 12,000 evaluation samples built from 3,000 first-person mobile video clips, and a Hierarchical Reasoning Evaluation framework for evidence anchoring, blind-spot deduction, and intent inference in LVLMs.",
    summaryZh: "提出 EgoSafe-Bench：基于 3,000 段第一人称移动端视频构建 12,000 个评测样本，并以层次化推理评测（HRE）框架检验 LVLM 的证据锚定、盲区推断与意图识别能力。",
    link: "https://arxiv.org/abs/2607.26518",
  },
];

const awards = [
  {
    title: "2026 MCM/ICM · Problem C",
    year: "2026",
    result: "Meritorious Winner",
    resultZh: "Meritorious Winner",
    detail: (
      <>
        Proposed the <strong>SAWS (Star-Approval Weighted System)</strong>, using
        the <strong>Bradley-Terry model</strong> and{" "}
        <strong>dual-channel OLS regression</strong> to analyze judge-fan
        structural bias and improve scoring fairness.
      </>
    ),
    detailZh: (
      <>
        提出 <strong>SAWS（星级认可加权系统）</strong>，结合
        <strong>Bradley-Terry 模型</strong>与<strong>双通道 OLS 回归</strong>，
        分析评委与粉丝之间的结构性偏差，并提升评分公平性。
      </>
    ),
  },
  {
    title: "2026 MathorCup · Problem D",
    year: "2026",
    result: "Provincial First Prize",
    resultZh: "省级一等奖",
    detail: (
      <>
        Developed the <strong>HFV-BPP</strong> multi-objective 3D heterogeneous
        bin-packing system with <strong>Layered-FFD</strong> and{" "}
        <strong>Block-GA</strong>, achieving <strong>93.72%</strong> volume
        utilization and reducing total logistics costs by{" "}
        <strong>26.8%</strong>.
      </>
    ),
    detailZh: (
      <>
        构建 <strong>HFV-BPP</strong> 多目标三维异构装箱系统，结合
        <strong>Layered-FFD</strong> 与 <strong>Block-GA</strong>，实现
        <strong>93.72%</strong> 的体积利用率，并将综合物流成本降低
        <strong>26.8%</strong>。
      </>
    ),
  },
  {
    title: "2025 APMCM · Problem B",
    year: "2025",
    result: "Provincial Second Prize",
    resultZh: "省级二等奖",
    detail: (
      <>
        Built an optical-thermal model for{" "}
        <strong>passive daytime radiative cooling (PDRC)</strong>, combining the{" "}
        <strong>Drude-Lorentz dielectric function</strong>,{" "}
        <strong>Transfer Matrix Method (TMM)</strong>, and{" "}
        <strong>Grid Search + L-BFGS-B</strong> for PDMS film design.
      </>
    ),
    detailZh: (
      <>
        构建<strong>被动式日间辐射冷却（PDRC）</strong>光热模型，结合
        <strong>Drude-Lorentz 介电函数</strong>、<strong>传输矩阵法（TMM）</strong>和
        <strong>网格搜索 + L-BFGS-B</strong>，完成 PDMS 薄膜设计。
      </>
    ),
  },
];

const technicalNotes = [
  {
    date: "",
    title: "Coming soon",
    titleZh: "待更新",
    summary: "Technical notes and experiment records are being organized and will appear here soon.",
    summaryZh: "技术笔记与实验记录正在整理，将在这里陆续更新。",
    tags: ["Coming soon"],
    tagsZh: ["待更新"],
    status: "Notes archive",
    statusZh: "笔记档案",
  },
];

const gallery = [
  {
    src: assetPath("band-wall/mygo-banner.jpg"),
    title: "MyGO!!!!!",
    caption: "Series banner",
    layout: "wide",
    source: "https://anilist.co/anime/163571",
  },
  {
    src: assetPath("band-wall/mygo-cover.png"),
    title: "It's MyGO!!!!!",
    caption: "Key visual",
    layout: "cover",
    source: "https://anilist.co/anime/163571",
  },
  {
    src: assetPath("band-wall/mygo-tomori.png"),
    title: "Tomori Takamatsu",
    caption: "Vocal",
    layout: "portrait",
    source: "https://anilist.co/character/302095",
  },
  {
    src: assetPath("band-wall/mygo-anon.png"),
    title: "Anon Chihaya",
    caption: "Guitar",
    layout: "portrait",
    source: "https://anilist.co/character/302094",
  },
  {
    src: assetPath("band-wall/mygo-taki.png"),
    title: "Taki Shiina",
    caption: "Drums",
    layout: "portrait",
    source: "https://anilist.co/character/302091",
  },
  {
    src: assetPath("band-wall/mygo-raana.png"),
    title: "Raana Kaname",
    caption: "Guitar",
    layout: "portrait",
    source: "https://anilist.co/character/302092",
  },
  {
    src: assetPath("band-wall/mygo-soyo.png"),
    title: "Soyo Nagasaki",
    caption: "Bass",
    layout: "portrait",
    source: "https://anilist.co/character/302093",
  },
  {
    src: assetPath("band-wall/mujica-banner.jpg"),
    title: "Ave Mujica",
    caption: "Series banner",
    layout: "wide",
    source: "https://anilist.co/anime/169295",
  },
  {
    src: assetPath("band-wall/mujica-cover.jpg"),
    title: "Ave Mujica",
    caption: "Key visual",
    layout: "cover",
    source: "https://anilist.co/anime/169295",
  },
  {
    src: assetPath("band-wall/mujica-sakiko.jpg"),
    title: "Sakiko Togawa",
    caption: "Keyboard",
    layout: "portrait",
    source: "https://anilist.co/character/312796",
  },
  {
    src: assetPath("band-wall/mujica-mutsumi.png"),
    title: "Mutsumi Wakaba",
    caption: "Guitar",
    layout: "portrait",
    source: "https://anilist.co/character/312798",
  },
  {
    src: assetPath("band-wall/mujica-uika.jpg"),
    title: "Uika Misumi",
    caption: "Guitar / vocal",
    layout: "portrait",
    source: "https://anilist.co/character/312797",
  },
  {
    src: assetPath("band-wall/mujica-umiri.jpg"),
    title: "Umiri Yahata",
    caption: "Bass",
    layout: "portrait",
    source: "https://anilist.co/character/312799",
  },
  {
    src: assetPath("band-wall/mujica-nyamu.jpg"),
    title: "Nyamu Yuutenji",
    caption: "Drums",
    layout: "portrait",
    source: "https://anilist.co/character/314493",
  },
];

const bandCharacters = [
  {
    name: "Sakiko Togawa",
    role: "Keyboard",
    image: assetPath("band-wall/mujica-sakiko.jpg"),
    source: "https://anilist.co/character/312796",
  },
  {
    name: "Mutsumi Wakaba",
    role: "Guitar",
    image: assetPath("band-wall/mujica-mutsumi.png"),
    source: "https://anilist.co/character/312798",
  },
  {
    name: "Uika Misumi",
    role: "Guitar / Vocal",
    image: assetPath("band-wall/mujica-uika.jpg"),
    source: "https://anilist.co/character/312797",
  },
  {
    name: "Umiri Yahata",
    role: "Bass",
    image: assetPath("band-wall/mujica-umiri.jpg"),
    source: "https://anilist.co/character/312799",
  },
  {
    name: "Nyamu Yuutenji",
    role: "Drums",
    image: assetPath("band-wall/mujica-nyamu.jpg"),
    source: "https://anilist.co/character/314493",
  },
];

const pages: Array<{ key: Exclude<PageKey, "admin">; label: string; icon: string }> = [
  { key: "home", label: "Home", icon: "🎤" },
  { key: "projects", label: "Projects", icon: "🎸" },
  { key: "publications", label: "Publications", icon: "🎻" },
  { key: "awards", label: "Awards", icon: "🥁" },
  { key: "notes", label: "Tech Notes", icon: "📓" },
  { key: "gallery", label: "Gallery", icon: "🎹" },
  { key: "space", label: "Personal Space", icon: "🔐" },
];

function getPageFromHash(): PageKey {
  const raw = window.location.hash.replace(/^#\/?/, "");
  return [...pages.map((page) => page.key), "admin"].includes(raw as PageKey) ? (raw as PageKey) : "home";
}

function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 .7a11.5 11.5 0 0 0-3.6 22.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.5-1.4-1.3-1.8-1.3-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.6.1-3.2 0 0 1-.3 3.3 1.2a11.4 11.4 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.6.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A11.5 11.5 0 0 0 12 .7Z"
      />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M3 5.5h18v13H3zM3.5 6l8.5 7 8.5-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PageShell({
  language,
  index,
  kicker,
  title,
  description,
  toc = [],
  children,
}: {
  language: Language;
  index: string;
  kicker: string;
  title: string;
  description: string;
  toc?: Array<{ id: string; label: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="page-shell">
      <div className="page-shell__inner">
        <header className="editorial-heading">
          <div className="chapter-no">{index}</div>
          <div>
            <p className="kicker">{kicker}</p>
            <h1>{title}</h1>
          </div>
          <p className="editorial-heading__description">{description}</p>
        </header>
        {toc.length > 0 && (
          <>
            <nav className="page-toc" aria-label={tr(language, "contents")}>
              <span>{tr(language, "contents")}</span>
              {toc.map((item, tocIndex) => (
                <a href={`#${item.id}`} key={item.id}>
                  <small>{String(tocIndex + 1).padStart(2, "0")}</small>
                  {item.label}
                </a>
              ))}
            </nav>
            <details className="page-toc-mobile">
              <summary>{tr(language, "contents")}</summary>
              <nav aria-label={tr(language, "contents")}>
                {toc.map((item, tocIndex) => (
                  <a href={`#${item.id}`} key={item.id}>
                    <small>{String(tocIndex + 1).padStart(2, "0")}</small>
                    {item.label}
                  </a>
                ))}
              </nav>
            </details>
          </>
        )}
        <div className="page-shell__body">{children}</div>
      </div>
    </section>
  );
}

function HomePage({
  language,
  theme,
  setPage,
}: {
  language: Language;
  theme: SiteTheme;
  setPage: (page: PageKey) => void;
}) {
  const isMinimal = theme === "minimal";

  return (
    <>
      <section className="home-hero">
        <div className="home-copy">
          <p className="kicker">{tr(language, "role")}</p>
          <h1>
            Yuyun
            <br />
            <em>Chen.</em>
          </h1>
          <p className="hero-intro">{tr(language, "intro")}</p>
          <div className="hero-actions">
            <a href="#/projects" onClick={() => setPage("projects")} className="button button--project">
              {themedTr(language, theme, "openFieldNotes")}
            </a>
            <a href="#/publications" onClick={() => setPage("publications")} className="button button--academic">
              {themedTr(language, theme, "academicWork")}
            </a>
            <a href="#/awards" onClick={() => setPage("awards")} className="button button--awards">
              {themedTr(language, theme, "readSetlist")}
            </a>
          </div>
          <dl className="metrics">
            {metrics.map((item) => (
              <div key={item.label}>
                <dt>{item.value}</dt>
                <dd>{localized(language, item.label, {
                  "Selected projects": tr(language, "selectedProjects"),
                  "Competition awards": tr(language, "competitionAwards"),
                  "Publications / preprints": tr(language, "publicationsPreprints"),
                  "Research directions": tr(language, "researchDirections"),
                }[item.label] || item.label)}</dd>
              </div>
            ))}
          </dl>
        </div>

        {isMinimal ? (
          <aside className="resume-summary" aria-label={tr(language, "resumeProfile")}>
            <div className="resume-summary__heading">
              <span>{tr(language, "resumeSnapshot")}</span>
              <strong>YC</strong>
            </div>
            <dl>
              <div>
                <dt>{tr(language, "basedIn")}</dt>
                <dd>{localized(language, profile.location, "广州，中国")}</dd>
              </div>
              <div>
                <dt>{tr(language, "currentFocus")}</dt>
                <dd>{(language === "zh" ? profile.focusZh : profile.focus).join(" · ")}</dd>
              </div>
              <div>
                <dt>{tr(language, "openTo")}</dt>
                <dd>{tr(language, "internshipRoles")}</dd>
              </div>
            </dl>
            <div className="resume-summary__links">
              <a href={profile.github} target="_blank" rel="noreferrer">GitHub ↗</a>
              <a href={`mailto:${profile.email}`}>{profile.email}</a>
            </div>
          </aside>
        ) : (
          <aside className="character-board" aria-label={tr(language, "inspirationBoard")}>
            <div className="tape" aria-hidden="true" />
            <p className="hand-note">{tr(language, "bandResearchClub")}</p>
            <div className="character-board__title">
              <strong>{tr(language, "liveLog")}</strong>
              <span>{tr(language, "characterStickers")}</span>
            </div>
            <div className="character-grid">
              {bandCharacters.map((character, index) => (
                <a
                  key={character.name}
                  className={`character-sticker character-sticker--${index + 1}`}
                  href={character.source}
                  target="_blank"
                  rel="noreferrer"
                  title={character.name}
                >
                  <img src={character.image} alt={character.name} />
                  <span>
                    {character.name}
                    <small>{localized(language, character.role, {
                      Keyboard: "键盘",
                      Guitar: "吉他",
                      "Guitar / Vocal": "吉他 / 主唱",
                      Bass: "贝斯",
                      Drums: "鼓手",
                    }[character.role] || character.role)}</small>
                  </span>
                </a>
              ))}
            </div>
            <p className="asset-credit">
              {tr(language, "characterReferences")}
            </p>
          </aside>
        )}
      </section>

      <section className="about-band">
        <div className="about-band__label">
          <p className="kicker">{themedTr(language, theme, "aboutMargin")}</p>
          <h2>{themedTr(language, theme, "aboutHeading")}</h2>
          <p className="hand-note">{themedTr(language, theme, "aboutNote")}</p>
        </div>
        <div className="about-band__copy">
          <p>
            {tr(language, "aboutParagraphOne")}
          </p>
          <p>
            {tr(language, "aboutParagraphTwo")}
          </p>
          {!isMinimal && (
            <figure className="research-polaroid">
              <img
                src={assetPath("band-wall/mygo-banner.jpg")}
                alt={localized(language, "It's MyGO!!!!! group portrait", "It's MyGO!!!!! 乐队合照")}
              />
              <figcaption>{(language === "zh" ? profile.focusZh : profile.focus).join(" / ")}</figcaption>
            </figure>
          )}
        </div>
      </section>
    </>
  );
}

function ProjectsPage({ language, theme }: { language: Language; theme: SiteTheme }) {
  return (
    <PageShell
      language={language}
      index="01"
      kicker={themedTr(language, theme, "projectsKicker")}
      title={tr(language, "projectsTitle")}
      description={themedTr(language, theme, "projectsDescription")}
      toc={projects.map((project, index) => ({
        id: `project-${index + 1}`,
        label: localized(language, project.title, project.titleZh),
      }))}
    >
      <div className="project-list">
        {projects.map((project, index) => (
          <article id={`project-${index + 1}`} key={project.title} className="project-entry">
            <div className="entry-index project-entry__index">{String(index + 1).padStart(2, "0")}</div>
            <div className="project-entry__body">
              <p className="entry-meta">{localized(language, project.type, project.typeZh)} / {project.period}</p>
              <h2>{localized(language, project.title, project.titleZh)}</h2>
              <p>{localized(language, project.summary, project.summaryZh)}</p>
              <div className="tag-list">
                {(language === "zh" ? project.tagsZh : project.tags).map((tag) => <span key={tag}>{tag}</span>)}
              </div>
            </div>
            {project.link && (
              <a href={project.link} className="entry-link project-entry__link">{tr(language, "openNote")} <span aria-hidden="true">↗</span></a>
            )}
          </article>
        ))}
      </div>
    </PageShell>
  );
}

function PublicationsPage({ language, theme }: { language: Language; theme: SiteTheme }) {
  return (
    <PageShell
      language={language}
      index="02"
      kicker={themedTr(language, theme, "publicationsKicker")}
      title={tr(language, "publicationsTitle")}
      description={themedTr(language, theme, "publicationsDescription")}
      toc={publications.map((paper, index) => ({
        id: `publication-${index + 1}`,
        label: paper.title.split(":")[0],
      }))}
    >
      <div className="publication-list">
        {publications.map((paper, index) => (
          <article id={`publication-${index + 1}`} key={paper.title} className="publication-entry">
            <div className="entry-index publication-entry__index">{String(index + 1).padStart(2, "0")}</div>
            <div className="publication-entry__citation">
              <p className="entry-meta">{localized(language, paper.venue, paper.venueZh)}</p>
              <h2>{localized(language, paper.title, paper.titleZh)}</h2>
              {paper.authors && <p className="publication-authors">{paper.authors}</p>}
              <p>{localized(language, paper.summary, paper.summaryZh)}</p>
            </div>
            <div className="publication-status">
              <span>{localized(language, paper.status, paper.statusZh)}</span>
              {paper.link && <a href={paper.link}>{tr(language, "read")}</a>}
            </div>
          </article>
        ))}
      </div>
    </PageShell>
  );
}

function TechnicalNotesPage({ language, theme }: { language: Language; theme: SiteTheme }) {
  return (
    <PageShell
      language={language}
      index="04"
      kicker={themedTr(language, theme, "notesKicker")}
      title={themedTr(language, theme, "notesTitle")}
      description={themedTr(language, theme, "notesDescription")}
      toc={technicalNotes.map((note, index) => ({
        id: `note-${index + 1}`,
        label: localized(language, note.title, note.titleZh),
      }))}
    >
      <div className="notes-index">
        {technicalNotes.map((note, index) => (
          <article id={`note-${index + 1}`} className="note-sheet" key={note.title}>
            <div className="note-sheet__rail">
              <span>{String(index + 1).padStart(2, "0")}</span>
              {note.date && <time>{note.date}</time>}
            </div>
            <div className="note-sheet__body">
              <p className="entry-meta">{localized(language, note.status, note.statusZh)}</p>
              <h2>{localized(language, note.title, note.titleZh)}</h2>
              <p>{localized(language, note.summary, note.summaryZh)}</p>
              <div className="tag-list">
                {(language === "zh" ? note.tagsZh : note.tags).map((tag) => <span key={tag}>{tag}</span>)}
              </div>
            </div>
            <span className="note-sheet__mark" aria-hidden="true">∿</span>
          </article>
        ))}
      </div>
    </PageShell>
  );
}

function AwardsPage({ language, theme }: { language: Language; theme: SiteTheme }) {
  return (
    <PageShell
      language={language}
      index="03"
      kicker={themedTr(language, theme, "awardsKicker")}
      title={themedTr(language, theme, "awardsTitle")}
      description={themedTr(language, theme, "awardsDescription")}
      toc={awards.map((award, index) => ({ id: `award-${index + 1}`, label: award.title }))}
    >
      <div className="award-list">
        {awards.map((award, index) => (
          <article id={`award-${index + 1}`} key={award.title} className="award-entry">
            <div className="award-number">{String(index + 1).padStart(2, "0")}</div>
            <div className="award-entry__result">
              <p className="entry-meta">{award.year}</p>
              <h2>{localized(language, award.result, award.resultZh)}</h2>
              <p className="award-result">{award.title}</p>
            </div>
            <p className="award-detail">{language === "zh" ? award.detailZh : award.detail}</p>
          </article>
        ))}
      </div>
    </PageShell>
  );
}

function GalleryPage({ language }: { language: Language }) {
  return (
    <PageShell
      language={language}
      index="05"
      kicker={tr(language, "galleryKicker")}
      title={tr(language, "galleryTitle")}
      description={tr(language, "galleryDescription")}
      toc={gallery.map((item, index) => ({ id: `gallery-${index + 1}`, label: item.title }))}
    >
      <div className="gallery-wall">
        {gallery.map((item, index) => (
          <a
            key={`${item.title}-${index}`}
            id={`gallery-${index + 1}`}
            className={`gallery-photo gallery-photo--${item.layout} gallery-photo--${index + 1}`}
            href={item.source}
            target="_blank"
            rel="noreferrer"
          >
            <figure>
              <img src={item.src} alt={item.title} loading="lazy" />
              <figcaption>
                <strong>{item.title}</strong>
                <span>{localized(language, item.caption, {
                  "Series banner": "系列横幅",
                  "Key visual": "主视觉",
                  Vocal: "主唱",
                  Guitar: "吉他",
                  Drums: "鼓手",
                  Bass: "贝斯",
                  Keyboard: "键盘",
                  "Guitar / vocal": "吉他 / 主唱",
                }[item.caption] || item.caption)}</span>
              </figcaption>
            </figure>
          </a>
        ))}
      </div>
      <p className="gallery-credit">
        {tr(language, "imageReferences")}
      </p>
    </PageShell>
  );
}

const visitorSessionKey = "yuyun-private-space-session";
const ownerSessionKey = "yuyun-owner-console-session";
const ownerPreviewKey = "yuyun-owner-space-preview";
const languageStorageKey = "yuyun-site-language";
const themeStorageKey = "yuyun-site-theme";

function takeInitialPrivateSpaceSession() {
  const ownerPreviewToken = sessionStorage.getItem(ownerPreviewKey);
  if (ownerPreviewToken) {
    sessionStorage.removeItem(ownerPreviewKey);
    return ownerPreviewToken;
  }
  return localStorage.getItem(ownerSessionKey)
    || sessionStorage.getItem(visitorSessionKey)
    || "";
}

function requestErrorMessage(error: unknown, language: Language, fallback: string) {
  if (error instanceof DOMException && error.name === "AbortError") {
    return tr(language, "requestTimedOut");
  }
  return error instanceof Error ? error.message : fallback;
}

function SessionLoading({ language, admin = false }: { language: Language; admin?: boolean }) {
  return (
    <section
      className={admin ? "admin-session-loading" : "personal-space personal-space--loading"}
      data-testid={admin ? "admin-session-loading" : "private-session-loading"}
      aria-live="polite"
    >
      <div className="session-loading__inner">
        <span aria-hidden="true" />
        <p>{tr(language, "restoringAccess")}</p>
      </div>
    </section>
  );
}

function entryKindLabel(language: Language, kind: PrivateEntry["kind"]) {
  return kind === "writing"
    ? tr(language, "writing")
    : kind === "photography"
      ? tr(language, "photography")
      : tr(language, "filmNote");
}

function privateEntryDisplayDate(entry: PrivateEntry) {
  return entry.display_date || entry.event_date || "";
}

function normalizeDateFilter(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const compactMatch = trimmed.match(/^(\d{4})(\d{2})(\d{2})$/u);
  const separatedMatch = trimmed.match(/^(\d{4})\D+(\d{1,2})\D+(\d{1,2})\D*$/u);
  const match = compactMatch || separatedMatch;
  if (!match) return "";

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    candidate.getUTCFullYear() !== year
    || candidate.getUTCMonth() !== month - 1
    || candidate.getUTCDate() !== day
  ) return "";

  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatDateFilter(value: string, language: Language) {
  const normalized = normalizeDateFilter(value);
  if (!normalized) return value;
  const [year, month, day] = normalized.split("-");
  return language === "zh" ? `${year}年${month}月${day}日` : `${year}${month}${day}`;
}

function formatPrivateDate(value: string, language: Language) {
  return new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getInlineMediaIds(markdown: string) {
  const ids = new Set<string>();
  for (const match of markdown.matchAll(/\{\{media:([^}]+)\}\}/gu)) {
    ids.add(match[1].trim());
  }
  return ids;
}

function EntryMediaFigure({ image, inline = false }: { image: EntryImage; inline?: boolean }) {
  return (
    <figure
      className={`${inline ? "archive-entry__inline-media" : "archive-entry__media"} archive-entry__media--${image.size} archive-entry__media--align-${image.align}`}
      data-media-id={image.id}
    >
      <img
        src={image.src}
        alt={image.caption}
        loading="lazy"
        style={{ objectPosition: `${image.focusX}% ${image.focusY}%` }}
      />
      {image.caption && <figcaption>{image.caption}</figcaption>}
    </figure>
  );
}

function renderRichEntryBody(markdown: string, images: EntryImage[], language: Language) {
  const imageById = new Map(images.map((image) => [image.id, image]));
  const tokenPattern = /\{\{media:([^}]+)\}\}/gu;
  const sections: React.ReactNode[] = [];
  let cursor = 0;
  let sectionIndex = 0;

  for (const match of markdown.matchAll(tokenPattern)) {
    const index = match.index || 0;
    const text = markdown.slice(cursor, index);
    if (text.trim()) {
      sections.push(
        <div className="archive-entry__markdown-section" key={`text-${sectionIndex++}`}>
          {renderMarkdown(text, language)}
        </div>,
      );
    }
    const image = imageById.get(match[1].trim());
    if (image) {
      sections.push(<EntryMediaFigure image={image} inline key={`media-${image.id}-${sectionIndex++}`} />);
    }
    cursor = index + match[0].length;
  }

  const remainder = markdown.slice(cursor);
  if (remainder.trim() || sections.length === 0) {
    sections.push(
      <div className="archive-entry__markdown-section" key={`text-${sectionIndex}`}>
        {renderMarkdown(remainder, language)}
      </div>,
    );
  }

  return sections;
}

function PersonalSpacePage({ language }: { language: Language }) {
  const [inviteCode, setInviteCode] = useState("");
  const [sessionToken, setSessionToken] = useState(takeInitialPrivateSpaceSession);
  const [content, setContent] = useState<PrivateSpaceContent | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isRestoring, setIsRestoring] = useState(Boolean(sessionToken));
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [expandedEntryIds, setExpandedEntryIds] = useState<Set<string>>(() => new Set());
  const [entryKindFilter, setEntryKindFilter] = useState<"all" | PrivateEntry["kind"]>("all");
  const [entryStartDate, setEntryStartDate] = useState("");
  const [entryEndDate, setEntryEndDate] = useState("");
  const [musicPlayRequest, setMusicPlayRequest] = useState<MusicPlayRequest | null>(null);

  const normalizedStartDate = normalizeDateFilter(entryStartDate);
  const normalizedEndDate = normalizeDateFilter(entryEndDate);
  const filteredEntries = useMemo(() => (content?.entries || []).filter((entry) => {
    const entryDate = privateEntryDisplayDate(entry);
    return (entryKindFilter === "all" || entry.kind === entryKindFilter)
      && (!normalizedStartDate || (entryDate && entryDate >= normalizedStartDate))
      && (!normalizedEndDate || (entryDate && entryDate <= normalizedEndDate));
  }), [content?.entries, entryKindFilter, normalizedEndDate, normalizedStartDate]);

  useEffect(() => {
    setEntryStartDate((value) => formatDateFilter(value, language));
    setEntryEndDate((value) => formatDateFilter(value, language));
  }, [language]);

  useEffect(() => {
    let isCurrentRequest = true;

    if (!sessionToken || !isPrivateSpaceConfigured) {
      setIsRestoring(false);
      return () => {
        isCurrentRequest = false;
      };
    }

    setIsRestoring(true);
    loadPrivateSpace(sessionToken)
      .then((payload) => {
        if (!isCurrentRequest) return;
        setContent({
          ...payload,
          playlist: payload.playlist || [],
          entries: payload.entries.map((entry) => ({
            ...entry,
            music_track_id: entry.music_track_id || null,
          })),
        });
        if (payload.visitor.is_owner) {
          localStorage.setItem(ownerSessionKey, sessionToken);
          sessionStorage.removeItem(visitorSessionKey);
        } else {
          localStorage.removeItem(ownerSessionKey);
        }
        setError("");
      })
      .catch((requestError: Error) => {
        if (!isCurrentRequest) return;
        setContent(null);
        if (localStorage.getItem(ownerSessionKey) === sessionToken) {
          localStorage.removeItem(ownerSessionKey);
        }
        if (sessionStorage.getItem(visitorSessionKey) === sessionToken) {
          sessionStorage.removeItem(visitorSessionKey);
        }
        setSessionToken("");
        setError(requestErrorMessage(requestError, language, localized(language, "Unable to restore this session.", "无法恢复当前会话。")));
      })
      .finally(() => {
        if (isCurrentRequest) setIsRestoring(false);
      });

    return () => {
      isCurrentRequest = false;
    };
  }, [language, sessionToken]);

  const handleUnlock = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!inviteCode.trim()) return;
    setIsUnlocking(true);
    setError("");
    try {
      const visitor = await unlockPrivateSpace(inviteCode);
      if (visitor.is_owner) {
        localStorage.setItem(ownerSessionKey, visitor.session_token);
        sessionStorage.removeItem(visitorSessionKey);
      } else {
        sessionStorage.setItem(visitorSessionKey, visitor.session_token);
        localStorage.removeItem(ownerSessionKey);
      }
      setIsRestoring(true);
      setSessionToken(visitor.session_token);
      setInviteCode("");
    } catch (requestError) {
      setError(requestErrorMessage(requestError, language, localized(language, "Unable to unlock this space.", "无法打开这个空间。")));
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleMessage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!message.trim() || !sessionToken || !content) return;
    const body = message.trim();
    const requestId = crypto.randomUUID();
    setIsPosting(true);
    setError("");
    try {
      let savedMessage;
      try {
        savedMessage = await postGuestbookMessage(sessionToken, body, requestId);
      } catch (requestError) {
        if (!isTransientPrivateSpaceError(requestError)) throw requestError;
        savedMessage = await postGuestbookMessage(sessionToken, body, requestId);
      }
      setContent((current) => current ? {
        ...current,
        messages: [
          savedMessage,
          ...current.messages.filter((item) => item.id !== savedMessage.id),
        ],
      } : current);
      setMessage("");
    } catch (requestError) {
      setError(requestErrorMessage(requestError, language, localized(language, "Unable to leave this message.", "留言发送失败。")));
    } finally {
      setIsPosting(false);
    }
  };

  const handleVisitorLogout = () => {
    sessionStorage.removeItem(visitorSessionKey);
    localStorage.removeItem(ownerSessionKey);
    setSessionToken("");
    setContent(null);
    setIsRestoring(false);
    setIsUnlocking(false);
    setInviteCode("");
    setMessage("");
    setExpandedEntryIds(new Set());
    setEntryKindFilter("all");
    setEntryStartDate("");
    setEntryEndDate("");
    setMusicPlayRequest(null);
    setError("");
  };

  const toggleEntry = (entryId: string) => {
    setExpandedEntryIds((current) => {
      const next = new Set(current);
      if (next.has(entryId)) next.delete(entryId);
      else next.add(entryId);
      return next;
    });
  };

  if (sessionToken && isRestoring && !content) {
    return <SessionLoading language={language} />;
  }

  if (!content) {
    return (
      <section className="personal-space personal-space--locked">
        <div className="space-noise" aria-hidden="true" />
        <div className="space-lock">
          <p className="space-eyebrow">{tr(language, "privateEdition")}</p>
          <div className="space-lock__symbol" aria-hidden="true">✦</div>
          <h1>{tr(language, "lastEncore")}<br /><em>{tr(language, "lastEncoreEm")}</em></h1>
          <p className="space-lock__intro">{tr(language, "privateIntro")}</p>
          <form className="space-unlock" onSubmit={handleUnlock} aria-busy={isUnlocking}>
            <label htmlFor="invite-code">{tr(language, "personalInvitation")}</label>
            <div className="space-unlock__row">
              <input
                id="invite-code"
                type="password"
                value={inviteCode}
                onChange={(event) => setInviteCode(event.target.value)}
                placeholder={tr(language, "invitationPlaceholder")}
                autoComplete="current-password"
                autoFocus
              />
              <button type="submit" disabled={!inviteCode.trim() || isUnlocking}>
                {isUnlocking ? tr(language, "checking") : tr(language, "enter")}
              </button>
            </div>
          </form>
          {!isPrivateSpaceConfigured && <p className="space-status">{tr(language, "privateSetup")}</p>}
          {error && <p className="space-error" role="alert">{error}</p>}
          <p className="space-footnote">{tr(language, "invitationFootnote")}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="personal-space personal-space--open">
      <div className="space-noise" aria-hidden="true" />
      <div className="space-open__inner">
        <header className="space-welcome">
          <div>
            <p className="space-eyebrow">{language === "zh" ? `私人版本 / 访客 ${String(content.visitor.visitor_number).padStart(3, "0")}` : `Private edition / visitor ${String(content.visitor.visitor_number).padStart(3, "0")}`}</p>
            <h1>{tr(language, "welcomeAfterHours")}<br /><em>{content.visitor.name}.</em></h1>
          </div>
          <div className="visitor-pass">
            <span>{tr(language, "visitorPass")}</span>
            <strong>#{String(content.visitor.visitor_number).padStart(3, "0")}</strong>
            {content.visitor.is_owner && <a className="owner-console-link" href="#/admin">{tr(language, "manageVisitors")}</a>}
            <button className="space-signout" type="button" onClick={handleVisitorLogout}>{tr(language, "logOut")}</button>
          </div>
        </header>

        {content.visitor.is_owner && (
          <>
            <PrivateMusicLibraryEditor
              sessionToken={sessionToken}
              tracks={content.playlist}
              language={language}
              onTracksChange={(playlist) => setContent((current) => current ? { ...current, playlist } : current)}
            />
            <OwnerSpaceEditor
              sessionToken={sessionToken}
              entries={content.entries}
              playlist={content.playlist}
              language={language}
              onEntriesChange={(entries) => setContent((current) => current ? { ...current, entries } : current)}
            />
          </>
        )}

        {content.entries.length > 0 && (
          <div className="archive-filters">
            <p><strong>{filteredEntries.length}</strong> {tr(language, "entriesShown")}</p>
            <label>
              <span>{tr(language, "filterByType")}</span>
              <select
                aria-label={tr(language, "filterByType")}
                value={entryKindFilter}
                onChange={(event) => setEntryKindFilter(event.target.value as "all" | PrivateEntry["kind"])}
              >
                <option value="all">{tr(language, "allTypes")}</option>
                <option value="writing">{tr(language, "writing")}</option>
                <option value="photography">{tr(language, "photography")}</option>
                <option value="film">{tr(language, "filmNote")}</option>
              </select>
            </label>
            <label>
              <span>{tr(language, "filterStartDate")}</span>
              <input
                type="text"
                aria-label={tr(language, "filterStartDate")}
                placeholder={tr(language, "filterDatePlaceholder")}
                value={entryStartDate}
                onChange={(event) => setEntryStartDate(event.target.value)}
                onBlur={() => setEntryStartDate((value) => formatDateFilter(value, language))}
                inputMode="numeric"
                autoComplete="off"
                spellCheck={false}
              />
            </label>
            <label>
              <span>{tr(language, "filterEndDate")}</span>
              <input
                type="text"
                aria-label={tr(language, "filterEndDate")}
                placeholder={tr(language, "filterDatePlaceholder")}
                value={entryEndDate}
                onChange={(event) => setEntryEndDate(event.target.value)}
                onBlur={() => setEntryEndDate((value) => formatDateFilter(value, language))}
                inputMode="numeric"
                autoComplete="off"
                spellCheck={false}
              />
            </label>
          </div>
        )}

        <div className="private-archive">
          {content.entries.length === 0 && <p className="archive-empty">{tr(language, "firstEntry")}</p>}
          {content.entries.length > 0 && filteredEntries.length === 0 && <p className="archive-empty">{tr(language, "noFilteredEntries")}</p>}
          {filteredEntries.map((entry) => {
            const images = parseEntryImages(entry.image_url);
            const cover = images.find((image) => image.isCover) || images[0];
            const inlineMediaIds = getInlineMediaIds(entry.body);
            const galleryImages = cover
              ? images.filter((image) => image.id !== cover.id && !inlineMediaIds.has(image.id))
              : images.filter((image) => !inlineMediaIds.has(image.id));
            const isExpanded = expandedEntryIds.has(entry.id);
            const displayDate = privateEntryDisplayDate(entry);
            const soundtrack = content.playlist.find((track) => track.id === entry.music_track_id && track.is_active);
            return (
              <article
                className={`archive-entry archive-entry--${entry.kind}${isExpanded ? " is-expanded" : ""}${cover ? "" : " archive-entry--no-cover"}`}
                key={entry.id}
              >
                {cover && (
                  <img
                    className="archive-entry__cover"
                    src={cover.src}
                    alt={cover.caption}
                    style={{ objectPosition: `${cover.focusX}% ${cover.focusY}%` }}
                  />
                )}
                <div className="archive-entry__content">
                  <div className="archive-entry__meta-row">
                    <p>{entryKindLabel(language, entry.kind)} {displayDate ? `· ${displayDate}` : ""}</p>
                    {isExpanded && (
                      <button
                        className="archive-entry__collapse archive-entry__collapse--top"
                        type="button"
                        onClick={() => toggleEntry(entry.id)}
                      >
                        {tr(language, "collapseEntry")}
                        <span aria-hidden="true">×</span>
                      </button>
                    )}
                  </div>
                  <h2>{entry.title}</h2>
                  {entry.excerpt && <strong>{entry.excerpt}</strong>}
                  {!isExpanded && <p className="archive-entry__preview-text">{markdownPreview(entry.body)}</p>}
                  {soundtrack && (
                    <button
                      className="archive-entry__soundtrack"
                      type="button"
                      aria-label={`${tr(language, "playEntrySoundtrack")}: ${soundtrack.title}`}
                      onClick={() => setMusicPlayRequest({ id: crypto.randomUUID(), trackId: soundtrack.id })}
                    >
                      <span aria-hidden="true">▶</span>
                      <span>
                        <small>{tr(language, "entrySoundtrack")}</small>
                        <strong>{soundtrack.title}{soundtrack.artist ? ` · ${soundtrack.artist}` : ""}</strong>
                      </span>
                    </button>
                  )}
                  {entry.kind === "film" && entry.external_url && (
                    <a className="archive-entry__external" href={entry.external_url} target="_blank" rel="noreferrer">
                      {tr(language, "viewDouban")} <span aria-hidden="true">↗</span>
                    </a>
                  )}
                  {isExpanded && (
                    <>
                      <div className="archive-entry__body">
                        {renderRichEntryBody(entry.body, images, language)}
                      </div>
                      {galleryImages.length > 0 && (
                        <div className="archive-entry__gallery">
                          {galleryImages.map((image) => <EntryMediaFigure image={image} key={image.id} />)}
                        </div>
                      )}
                      <button
                        className="archive-entry__toggle archive-entry__collapse--bottom"
                        type="button"
                        onClick={() => toggleEntry(entry.id)}
                      >
                        {tr(language, "collapseEntry")}
                        <span aria-hidden="true">↑</span>
                      </button>
                    </>
                  )}
                  {!isExpanded && (
                    <button
                      className="archive-entry__toggle"
                      type="button"
                      aria-expanded={false}
                      onClick={() => toggleEntry(entry.id)}
                    >
                      {tr(language, "expandEntry")}
                      <span aria-hidden="true">↓</span>
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        <section className="guestbook">
          <div className="guestbook__intro">
            <p className="space-eyebrow">{tr(language, "guestbookKicker")}</p>
            <h2>{tr(language, "guestbookTitle")}<br />{tr(language, "guestbookTitleEm")}</h2>
            <p>{tr(language, "guestbookIntro")}</p>
          </div>
          <div>
            <form className="guestbook-form" onSubmit={handleMessage}>
              <textarea
                value={message}
                onChange={(event) => {
                  setMessage(event.target.value);
                }}
                placeholder={tr(language, "guestbookPlaceholder")}
                maxLength={500}
                rows={4}
              />
              <div><span>{message.length}/500</span><button disabled={isPosting || !message.trim()}>{isPosting ? tr(language, "posting") : tr(language, "pinNote")}</button></div>
            </form>
            {error && <p className="space-error" role="alert">{error}</p>}
            <div className="guestbook-history">
              <p className="space-editor__label">{tr(language, "yourMessages")}</p>
              {content.messages.length === 0 && <p className="guestbook-history__empty">{tr(language, "noMessagesYet")}</p>}
              <div className="guestbook-history__grid">
                {content.messages.map((item) => (
                  <article className="guestbook-note" key={item.id}>
                    <p>{item.body}</p>
                    <time dateTime={item.created_at}>
                      {tr(language, "messageTime")} · {formatPrivateDate(item.created_at, language)}
                    </time>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
      <PrivateMusicPlayer
        tracks={content.playlist}
        language={language}
        playRequest={musicPlayRequest}
      />
    </section>
  );
}

type EntryDraft = {
  id: string | null;
  kind: PrivateEntry["kind"];
  title: string;
  excerpt: string;
  body: string;
  images: EntryImage[];
  imagesDirty: boolean;
  external_url: string | null;
  event_date: string | null;
  music_track_id: string | null;
  is_published: boolean;
};

function blankEntryDraft(language: Language): EntryDraft {
  return {
    id: null,
    kind: "writing",
    title: "",
    excerpt: "",
    body: tr(language, "newFragmentMarkdown"),
    images: [],
    imagesDirty: false,
    external_url: null,
    event_date: null,
    music_track_id: null,
    is_published: false,
  };
}

function entryToDraft(entry: PrivateEntry): EntryDraft {
  return {
    id: entry.id,
    kind: entry.kind,
    title: entry.title,
    excerpt: entry.excerpt,
    body: entry.body,
    images: parseEntryImages(entry.image_url),
    imagesDirty: false,
    external_url: entry.external_url || null,
    event_date: entry.event_date,
    music_track_id: entry.music_track_id || null,
    is_published: entry.is_published,
  };
}

function renderMarkdown(markdown: string, language: Language) {
  return <MarkdownRenderer source={markdown} emptyLabel={tr(language, "nothingWritten")} />;
}

function OwnerSpaceEditor({
  sessionToken,
  entries,
  playlist,
  language,
  onEntriesChange,
}: {
  sessionToken: string;
  entries: PrivateEntry[];
  playlist: PrivateMusicTrack[];
  language: Language;
  onEntriesChange: (entries: PrivateEntry[]) => void;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [draft, setDraft] = useState<EntryDraft>(() => blankEntryDraft(language));
  const [isBusy, setIsBusy] = useState(false);
  const [isOptimizingImage, setIsOptimizingImage] = useState(false);
  const [draggedImageId, setDraggedImageId] = useState("");
  const [editorError, setEditorError] = useState("");
  const [editorNotice, setEditorNotice] = useState("");
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const cropDragRef = useRef<{
    imageId: string;
    pointerX: number;
    pointerY: number;
    focusX: number;
    focusY: number;
  } | null>(null);

  const updateDraft = <Key extends keyof EntryDraft>(key: Key, value: EntryDraft[Key]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setEditorNotice("");
  };

  const updateImages = (updater: (images: EntryImage[]) => EntryImage[]) => {
    setDraft((current) => ({
      ...current,
      images: updater(current.images),
      imagesDirty: true,
    }));
    setEditorNotice("");
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.title.trim()) {
      setEditorError(tr(language, "ownerRequiredTitle"));
      return;
    }
    setIsBusy(true);
    setEditorError("");
    setEditorNotice("");
    const stableEntryId = draft.id || crypto.randomUUID();
    const payload = {
      id: stableEntryId,
      kind: draft.kind,
      title: draft.title.trim(),
      excerpt: draft.excerpt.trim(),
      body: draft.body,
      image_url: draft.imagesDirty || !draft.id ? serializeEntryImages(draft.images) : null,
      external_url: draft.kind === "film" ? draft.external_url?.trim() || null : null,
      replace_image: draft.imagesDirty || !draft.id,
      event_date: draft.event_date,
      music_track_id: draft.music_track_id,
      is_published: draft.is_published,
    };
    try {
      let savedEntry: PrivateEntry;
      try {
        savedEntry = await savePrivateEntry(sessionToken, payload);
      } catch (requestError) {
        if (!isTransientPrivateSpaceError(requestError)) throw requestError;
        savedEntry = await savePrivateEntry(sessionToken, payload);
      }
      const nextEntries = entries.some((entry) => entry.id === savedEntry.id)
        ? entries.map((entry) => entry.id === savedEntry.id ? savedEntry : entry)
        : [...entries, savedEntry];
      onEntriesChange(nextEntries);
      setDraft(entryToDraft(savedEntry));
      setEditorNotice(savedEntry.is_published ? tr(language, "publishedVisitors") : tr(language, "savedDraft"));
    } catch (requestError) {
      setEditorError(requestError instanceof Error ? requestError.message : localized(language, "The entry could not be saved.", "记录保存失败。"));
    } finally {
      setIsBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!draft.id || !window.confirm(tr(language, "deleteEntryConfirm"))) return;
    setIsBusy(true);
    setEditorError("");
    try {
      await deletePrivateEntry(sessionToken, draft.id);
      onEntriesChange(entries.filter((entry) => entry.id !== draft.id));
      setDraft(blankEntryDraft(language));
      setEditorNotice(tr(language, "entryDeleted"));
    } catch (requestError) {
      setEditorError(requestError instanceof Error ? requestError.message : localized(language, "The entry could not be deleted.", "记录删除失败。"));
    } finally {
      setIsBusy(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    setEditorError("");
    setEditorNotice(tr(language, "optimizingImage"));
    setIsOptimizingImage(true);
    try {
      const uploaded: EntryImage[] = [];
      for (const file of files) {
        const result = await uploadPrivateMedia(sessionToken, file, "image");
        uploaded.push({
          id: crypto.randomUUID(),
          src: result.url,
          storageSrc: result.storage_url,
          size: "medium",
          align: "center",
          caption: "",
          focusX: 50,
          focusY: 50,
          isCover: false,
        });
      }
      const combined = [...draft.images, ...uploaded];
      const hasCover = combined.some((image) => image.isCover);
      const nextImages = combined.map((image, index) => ({
        ...image,
        isCover: hasCover ? image.isCover : index === 0,
      }));
      setDraft((current) => ({ ...current, images: nextImages, imagesDirty: true }));
      setEditorNotice(tr(language, "imageReady"));
    } catch (uploadError) {
      setEditorError(uploadError instanceof Error ? uploadError.message : localized(language, "The image could not be uploaded.", "图片上传失败。"));
      setEditorNotice("");
    } finally {
      setIsOptimizingImage(false);
    }
    event.target.value = "";
  };

  const setCoverImage = (imageId: string, checked: boolean) => {
    updateImages((images) => images.map((image) => ({
      ...image,
      isCover: checked && image.id === imageId,
    })));
  };

  const setImageSize = (imageId: string, size: EntryImageSize) => {
    updateImages((images) => images.map((image) => image.id === imageId ? { ...image, size } : image));
  };

  const setImageAlignment = (imageId: string, align: EntryImageAlign) => {
    updateImages((images) => images.map((image) => image.id === imageId ? { ...image, align } : image));
  };

  const setImageCaption = (imageId: string, caption: string) => {
    updateImages((images) => images.map((image) => image.id === imageId ? { ...image, caption } : image));
  };

  const setImageFocus = (imageId: string, focusX: number, focusY: number) => {
    updateImages((images) => images.map((image) => image.id === imageId ? {
      ...image,
      focusX: Math.min(100, Math.max(0, focusX)),
      focusY: Math.min(100, Math.max(0, focusY)),
    } : image));
  };

  const insertImageAtCursor = (imageId: string) => {
    const textarea = bodyTextareaRef.current;
    const marker = `{{media:${imageId}}}`;
    const start = textarea?.selectionStart ?? draft.body.length;
    const end = textarea?.selectionEnd ?? start;
    const before = draft.body.slice(0, start);
    const after = draft.body.slice(end);
    const prefix = before.endsWith("\n\n") || before.length === 0 ? "" : "\n\n";
    const suffix = after.startsWith("\n\n") || after.length === 0 ? "" : "\n\n";
    const nextBody = `${before}${prefix}${marker}${suffix}${after}`;
    updateDraft("body", nextBody);
    setEditorNotice(tr(language, "imageInserted"));
    window.requestAnimationFrame(() => {
      const cursor = before.length + prefix.length + marker.length;
      textarea?.focus();
      textarea?.setSelectionRange(cursor, cursor);
    });
  };

  const handleCropPointerDown = (event: React.PointerEvent<HTMLDivElement>, image: EntryImage) => {
    cropDragRef.current = {
      imageId: image.id,
      pointerX: event.clientX,
      pointerY: event.clientY,
      focusX: image.focusX,
      focusY: image.focusY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleCropPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = cropDragRef.current;
    if (!drag) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const focusX = drag.focusX - ((event.clientX - drag.pointerX) / Math.max(bounds.width, 1)) * 100;
    const focusY = drag.focusY - ((event.clientY - drag.pointerY) / Math.max(bounds.height, 1)) * 100;
    setImageFocus(drag.imageId, focusX, focusY);
  };

  const removeImage = (imageId: string) => {
    updateImages((images) => {
      const removed = images.find((image) => image.id === imageId);
      const next = images.filter((image) => image.id !== imageId);
      if (removed?.isCover && next.length > 0) {
        return next.map((image, index) => ({ ...image, isCover: index === 0 }));
      }
      return next;
    });
  };

  const moveImageByOffset = (imageId: string, offset: number) => {
    updateImages((images) => {
      const sourceIndex = images.findIndex((image) => image.id === imageId);
      const target = images[sourceIndex + offset];
      return target ? moveEntryImage(images, imageId, target.id) : images;
    });
  };

  const previewCover = draft.images.find((image) => image.isCover) || draft.images[0];
  const isPersisted = Boolean(draft.id && entries.some((entry) => entry.id === draft.id));

  return (
    <section className="space-editor">
      <header className="space-editor__header">
        <div>
          <p className="space-eyebrow">{tr(language, "ownerStudio")}</p>
          <h2>{tr(language, "shapeArchive")}</h2>
          <p>{tr(language, "editorIntro")}</p>
        </div>
        <div className="space-editor__actions">
          <button type="button" onClick={() => { setDraft(blankEntryDraft(language)); setEditorError(""); setEditorNotice(""); setIsOpen(true); }}>{tr(language, "newEntry")}</button>
          <button type="button" onClick={() => setIsOpen((open) => !open)}>{isOpen ? tr(language, "closeEditor") : tr(language, "openEditor")}</button>
        </div>
      </header>

      {isOpen && (
        <div className="space-editor__grid">
          <aside className="space-editor__entries">
            <p className="space-editor__label">{tr(language, "yourEntries")}</p>
            {entries.length === 0 && <p className="space-editor__empty">{tr(language, "noEntries")}</p>}
            {entries.map((entry) => (
              <button type="button" key={entry.id} className={draft.id === entry.id ? "is-selected" : ""} onClick={() => { setDraft(entryToDraft(entry)); setEditorError(""); setEditorNotice(""); }}>
                <strong>{entry.title}</strong>
                <small>{entry.is_published ? tr(language, "published") : tr(language, "draft")} · {entryKindLabel(language, entry.kind)}</small>
              </button>
            ))}
          </aside>

          <form className="space-editor__form" onSubmit={handleSave}>
            <div className="space-editor__form-row">
              <label>{tr(language, "title")}<input value={draft.title} onChange={(event) => updateDraft("title", event.target.value)} placeholder={tr(language, "titlePlaceholder")} /></label>
              <fieldset className="space-editor__kind">
                <legend>{tr(language, "type")}</legend>
                <div role="group" aria-label={tr(language, "type")}>
                  {(["writing", "photography", "film"] as const).map((kind) => (
                    <button
                      key={kind}
                      type="button"
                      aria-pressed={draft.kind === kind}
                      className={draft.kind === kind ? "is-active" : ""}
                      onClick={() => updateDraft("kind", kind)}
                    >
                      {kind === "writing" ? tr(language, "writing") : kind === "photography" ? tr(language, "photography") : tr(language, "filmNote")}
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>
            <label>{tr(language, "excerpt")}<input value={draft.excerpt} onChange={(event) => updateDraft("excerpt", event.target.value)} placeholder={tr(language, "excerptPlaceholder")} /></label>
            {draft.kind === "film" && (
              <label>
                {tr(language, "doubanLink")}
                <input
                  type="url"
                  value={draft.external_url || ""}
                  onChange={(event) => updateDraft("external_url", event.target.value || null)}
                  placeholder={tr(language, "doubanLinkPlaceholder")}
                />
              </label>
            )}
            <label>
              {tr(language, "markdownBody")}
              <textarea
                ref={bodyTextareaRef}
                rows={12}
                value={draft.body}
                onChange={(event) => updateDraft("body", event.target.value)}
                placeholder={tr(language, "markdownPlaceholder")}
              />
            </label>
            <label>
              {tr(language, "entrySoundtrack")}
              <select
                value={draft.music_track_id || ""}
                onChange={(event) => updateDraft("music_track_id", event.target.value || null)}
              >
                <option value="">{tr(language, "defaultPlaylist")}</option>
                {[...playlist]
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((track) => (
                    <option key={track.id} value={track.id}>
                      {track.title}{track.artist ? ` · ${track.artist}` : ""}{track.is_active ? "" : ` (${language === "zh" ? "已隐藏" : "hidden"})`}
                    </option>
                  ))}
              </select>
            </label>
            <div className="space-editor__form-row">
              <label>{tr(language, "eventDate")}<input type="date" value={draft.event_date || ""} onChange={(event) => updateDraft("event_date", event.target.value || null)} /></label>
              <label>{tr(language, "image")}<input type="file" accept="image/*" multiple onChange={handleImageUpload} /><small>{tr(language, "imageUploadHelp")}</small></label>
            </div>
            {previewCover && (
              <section className="space-editor__cover-crop">
                <div>
                  <strong>{tr(language, "coverCrop")}</strong>
                  <small>{tr(language, "coverCropHelp")}</small>
                </div>
                <div
                  className="space-editor__crop-frame"
                  role="img"
                  aria-label={tr(language, "coverCrop")}
                  onPointerDown={(event) => handleCropPointerDown(event, previewCover)}
                  onPointerMove={handleCropPointerMove}
                  onPointerUp={() => { cropDragRef.current = null; }}
                  onPointerCancel={() => { cropDragRef.current = null; }}
                >
                  <img
                    src={previewCover.src}
                    alt={previewCover.caption}
                    draggable={false}
                    style={{ objectPosition: `${previewCover.focusX}% ${previewCover.focusY}%` }}
                  />
                  <span aria-hidden="true" />
                </div>
                <button type="button" onClick={() => setImageFocus(previewCover.id, 50, 50)}>
                  {tr(language, "resetCrop")}
                </button>
              </section>
            )}
            {draft.images.length > 0 && (
              <div className="space-editor__media-list">
                {draft.images.map((image, index) => (
                  <article
                    className={`space-editor__media-item${draggedImageId === image.id ? " is-dragging" : ""}`}
                    draggable
                    key={image.id}
                    onDragStart={() => setDraggedImageId(image.id)}
                    onDragEnd={() => setDraggedImageId("")}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      if (draggedImageId) updateImages((images) => moveEntryImage(images, draggedImageId, image.id));
                      setDraggedImageId("");
                    }}
                  >
                    <div className="space-editor__media-thumb">
                      <img
                        src={image.src}
                        alt={image.caption}
                        style={{ objectPosition: `${image.focusX}% ${image.focusY}%` }}
                      />
                      <span>{String(index + 1).padStart(2, "0")}</span>
                    </div>
                    <div className="space-editor__media-controls">
                      <p>{tr(language, "dragImage")}</p>
                      <label className="space-editor__cover-option">
                        <input
                          type="checkbox"
                          checked={image.isCover}
                          onChange={(event) => setCoverImage(image.id, event.target.checked)}
                        />
                        {image.isCover ? tr(language, "coverImage") : tr(language, "setAsCover")}
                      </label>
                      <label className="space-editor__caption">
                        {tr(language, "imageCaption")}
                        <input
                          value={image.caption}
                          onChange={(event) => setImageCaption(image.id, event.target.value)}
                          placeholder={tr(language, "imageCaptionPlaceholder")}
                        />
                      </label>
                      <fieldset>
                        <legend>{tr(language, "displaySize")}</legend>
                        <div className="space-editor__size-options">
                          {(["small", "medium", "large", "full"] as const).map((size) => (
                            <button
                              type="button"
                              key={size}
                              className={image.size === size ? "is-active" : ""}
                              aria-pressed={image.size === size}
                              onClick={() => setImageSize(image.id, size)}
                            >
                              {tr(language, size === "small" ? "imageSmall" : size === "medium" ? "imageMedium" : size === "large" ? "imageLarge" : "imageFull")}
                            </button>
                          ))}
                        </div>
                      </fieldset>
                      <fieldset>
                        <legend>{tr(language, "imageAlignment")}</legend>
                        <div className="space-editor__align-options">
                          {(["left", "center", "right"] as const).map((align) => (
                            <button
                              type="button"
                              key={align}
                              className={image.align === align ? "is-active" : ""}
                              aria-pressed={image.align === align}
                              onClick={() => setImageAlignment(image.id, align)}
                            >
                              {tr(language, align === "left" ? "alignLeft" : align === "center" ? "alignCenter" : "alignRight")}
                            </button>
                          ))}
                        </div>
                      </fieldset>
                      <div className="space-editor__media-actions">
                        <button type="button" onClick={() => insertImageAtCursor(image.id)}>{tr(language, "insertImage")}</button>
                        <button type="button" disabled={index === 0} aria-label={tr(language, "moveEarlier")} title={tr(language, "moveEarlier")} onClick={() => moveImageByOffset(image.id, -1)}>↑</button>
                        <button type="button" disabled={index === draft.images.length - 1} aria-label={tr(language, "moveLater")} title={tr(language, "moveLater")} onClick={() => moveImageByOffset(image.id, 1)}>↓</button>
                        <button type="button" className="is-remove" onClick={() => removeImage(image.id)}>{tr(language, "removeImage")}</button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
            <label className="space-editor__publish"><input type="checkbox" checked={draft.is_published} onChange={(event) => updateDraft("is_published", event.target.checked)} /> {tr(language, "publishEntry")}</label>
            {editorError && <p className="space-editor__error" role="alert">{editorError}</p>}
            {editorNotice && <p className="space-editor__notice" role="status">{editorNotice}</p>}
            <div className="space-editor__footer"><button className="space-editor__save" type="submit" disabled={isBusy || isOptimizingImage}>{isOptimizingImage ? tr(language, "optimizingImage") : isBusy ? tr(language, "saving") : tr(language, "saveEntry")}</button>{isPersisted && <button className="space-editor__delete" type="button" onClick={handleDelete} disabled={isBusy || isOptimizingImage}>{tr(language, "delete")}</button>}</div>
          </form>

          <aside className="space-editor__preview">
            <p className="space-editor__label">{tr(language, "livePreview")}</p>
            <article className="space-editor__preview-card">
              {previewCover && (
                <img
                  src={previewCover.src}
                  alt={tr(language, "selectedEntryCover")}
                  style={{ objectPosition: `${previewCover.focusX}% ${previewCover.focusY}%` }}
                />
              )}
              <div>
                <p>
                  {entryKindLabel(language, draft.kind)}
                  {draft.event_date ? ` · ${draft.event_date}` : ""}
                  {draft.music_track_id
                    ? ` · ♫ ${playlist.find((track) => track.id === draft.music_track_id)?.title || tr(language, "entrySoundtrack")}`
                    : ""}
                </p>
                <h3>{draft.title || tr(language, "untitledFragment")}</h3>
                {draft.excerpt && <strong>{draft.excerpt}</strong>}
                {draft.kind === "film" && draft.external_url && (
                  <a className="archive-entry__external" href={draft.external_url} target="_blank" rel="noreferrer">
                    {tr(language, "viewDouban")} <span aria-hidden="true">↗</span>
                  </a>
                )}
                <div className="archive-entry__body">
                  {renderRichEntryBody(draft.body, draft.images, language)}
                </div>
              </div>
            </article>
          </aside>
        </div>
      )}
    </section>
  );
}

function makeInvitePrefix(visitorName: string) {
  return visitorName
    .trim()
    .normalize("NFKC")
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}_-]/gu, "")
    .replace(/-+/g, "-") || "visitor";
}

function makeInviteSuffix() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(13));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

function formatAdminDate(value: string | null, language: Language) {
  if (!value) return tr(language, "never");
  return new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-US", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function AdminPage({ language }: { language: Language }) {
  const [sessionToken, setSessionToken] = useState(() => localStorage.getItem(ownerSessionKey) || "");
  const verifiedSessionRef = useRef("");
  const [ownerCode, setOwnerCode] = useState("");
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [visitorName, setVisitorName] = useState("");
  const [inviteSuffix, setInviteSuffix] = useState(makeInviteSuffix);
  const [expiresAt, setExpiresAt] = useState("");
  const [createdCode, setCreatedCode] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);
  const [error, setError] = useState("");
  const [isRestoring, setIsRestoring] = useState(Boolean(sessionToken));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyId, setBusyId] = useState("");
  const inviteCode = `${makeInvitePrefix(visitorName)}-${inviteSuffix}`;

  const refreshDashboard = async (token: string) => {
    const payload = await loadAdminDashboard(token);
    setDashboard(payload);
    setError("");
    return payload;
  };

  useEffect(() => {
    if (!sessionToken) {
      setIsRestoring(false);
      return;
    }
    if (verifiedSessionRef.current === sessionToken) {
      setIsRestoring(false);
      return;
    }

    let isCurrentRequest = true;
    setIsRestoring(true);
    loadAdminDashboard(sessionToken)
      .then((payload) => {
        if (!isCurrentRequest) return;
        verifiedSessionRef.current = sessionToken;
        setDashboard(payload);
        setError("");
      })
      .catch((requestError: Error) => {
        if (!isCurrentRequest) return;
        localStorage.removeItem(ownerSessionKey);
        verifiedSessionRef.current = "";
        setSessionToken("");
        setDashboard(null);
        setError(requestErrorMessage(requestError, language, localized(language, "Owner access could not be restored.", "无法恢复管理员权限。")));
      })
      .finally(() => {
        if (isCurrentRequest) setIsRestoring(false);
      });

    return () => {
      isCurrentRequest = false;
    };
  }, [language, sessionToken]);

  const handleOwnerLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!ownerCode.trim()) return;
    setIsSubmitting(true);
    setError("");
    try {
      const identity = await unlockPrivateSpace(ownerCode);
      if (!identity.is_owner) {
        throw new Error(localized(language, "This invitation does not have owner access.", "这个邀请没有管理员权限。"));
      }
      const payload = await loadAdminDashboard(identity.session_token);
      verifiedSessionRef.current = identity.session_token;
      setDashboard(payload);
      localStorage.setItem(ownerSessionKey, identity.session_token);
      sessionStorage.removeItem(visitorSessionKey);
      setSessionToken(identity.session_token);
      setOwnerCode("");
    } catch (requestError) {
      setError(requestErrorMessage(requestError, language, localized(language, "Owner access could not be verified.", "无法验证管理员权限。")));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateInvite = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!sessionToken || !visitorName.trim() || !inviteCode.trim()) return;
    setBusyId("create");
    setError("");
    try {
      await createVisitorInvite(
        sessionToken,
        visitorName,
        inviteCode,
        expiresAt ? new Date(`${expiresAt}T23:59:59`).toISOString() : null,
      );
      setCreatedCode(inviteCode);
      setCopiedCode(false);
      setVisitorName("");
      setInviteSuffix(makeInviteSuffix());
      setExpiresAt("");
      await refreshDashboard(sessionToken);
    } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : localized(language, "The visitor could not be created.", "访客创建失败。"));
    } finally {
      setBusyId("");
    }
  };

  const handleCopyInvite = async () => {
    if (!createdCode) return;
    try {
      await navigator.clipboard.writeText(createdCode);
      setCopiedCode(true);
    } catch {
      setError(localized(language, "Copy failed. Select the invitation code and copy it manually.", "复制失败，请手动选择并复制邀请密钥。"));
    }
  };

  const handleRefresh = async () => {
    if (!sessionToken) return;
    setBusyId("refresh");
    try {
      await refreshDashboard(sessionToken);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : localized(language, "The dashboard could not be refreshed.", "控制台刷新失败。"));
    } finally {
      setBusyId("");
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem(ownerSessionKey);
    sessionStorage.removeItem(visitorSessionKey);
    sessionStorage.removeItem(ownerPreviewKey);
    verifiedSessionRef.current = "";
    setSessionToken("");
    setDashboard(null);
    setIsRestoring(false);
    setIsSubmitting(false);
    setCreatedCode("");
    setError("");
  };

  const handleOpenOwnerSpace = () => {
    sessionStorage.setItem(ownerPreviewKey, sessionToken);
  };

  const handleVisitorStatus = async (visitorId: string, isActive: boolean) => {
    if (!sessionToken) return;
    setBusyId(visitorId);
    setError("");
    try {
      await setVisitorInviteStatus(sessionToken, visitorId, isActive);
      await refreshDashboard(sessionToken);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : localized(language, "The visitor status could not be changed.", "访客状态修改失败。"));
    } finally {
      setBusyId("");
    }
  };

  const handleMessageStatus = async (messageId: string, status: "visible" | "hidden") => {
    if (!sessionToken) return;
    setBusyId(messageId);
    setError("");
    try {
      await setGuestbookMessageStatus(sessionToken, messageId, status);
      await refreshDashboard(sessionToken);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : localized(language, "The message status could not be changed.", "留言状态修改失败。"));
    } finally {
      setBusyId("");
    }
  };

  if (sessionToken && isRestoring && !dashboard) {
    return <SessionLoading language={language} admin />;
  }

  if (!dashboard) {
    return (
      <section className="admin-login">
        <div>
          <p className="kicker">{tr(language, "ownerConsoleKicker")}</p>
          <h1>{tr(language, "visitorControlRoom")}</h1>
          <p>{tr(language, "ownerConsoleIntro")}</p>
          <form onSubmit={handleOwnerLogin} aria-busy={isSubmitting}>
            <input
              type="password"
              value={ownerCode}
              onChange={(event) => setOwnerCode(event.target.value)}
              placeholder={tr(language, "ownerCodePlaceholder")}
              autoFocus
            />
            <button type="submit" disabled={isSubmitting || !ownerCode.trim()}>{isSubmitting ? tr(language, "checking") : tr(language, "openConsole")}</button>
          </form>
          {error && <p className="admin-error" role="alert">{error}</p>}
          <a href="#/space">{tr(language, "backToSpace")}</a>
        </div>
      </section>
    );
  }

  return (
    <section className="admin-page">
      <div className="admin-page__inner">
        <header className="admin-header">
          <div>
            <p className="kicker">{tr(language, "ownerConsole")} / {dashboard.owner_name}</p>
            <h1>{tr(language, "visitorControlRoom").replace(".", "")}</h1>
          </div>
          <div className="admin-header__actions">
            <button type="button" onClick={handleRefresh} disabled={busyId === "refresh"}>
              {busyId === "refresh" ? tr(language, "refreshing") : tr(language, "refreshData")}
            </button>
            <button type="button" onClick={handleSignOut}>{tr(language, "signOut")}</button>
            <a href="#/space" onClick={handleOpenOwnerSpace}>{tr(language, "personalSpaceArrow")}</a>
          </div>
        </header>

        <div className="admin-stats">
          <div><strong>{dashboard.stats.total_visitors}</strong><span>{tr(language, "totalVisitors")}</span></div>
          <div><strong>{dashboard.stats.active_visitors}</strong><span>{tr(language, "activeAccess")}</span></div>
          <div><strong>{dashboard.stats.total_visits}</strong><span>{tr(language, "totalUnlocks")}</span></div>
          <div><strong>{dashboard.stats.total_messages}</strong><span>{tr(language, "messages")}</span></div>
        </div>

        {error && <p className="admin-error" role="alert">{error}</p>}

        <div className="admin-grid">
          <section className="admin-panel admin-panel--create">
            <div className="admin-panel__heading"><span>01</span><h2>{tr(language, "createVisitor")}</h2></div>
            <form className="invite-form" onSubmit={handleCreateInvite}>
              <label>{tr(language, "visitorName")}<input value={visitorName} onChange={(event) => setVisitorName(event.target.value)} placeholder={tr(language, "visitorNamePlaceholder")} /></label>
              <label>{tr(language, "invitationCode")} <small>{tr(language, "randomCharacters")}</small><div className="invite-code-field"><input value={inviteCode} readOnly /><button type="button" onClick={() => setInviteSuffix(makeInviteSuffix())}>{tr(language, "generate")}</button></div></label>
              <label>{tr(language, "expiresOn")} <small>{tr(language, "optional")}</small><input type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} /></label>
              <button className="admin-primary" disabled={busyId === "create" || !visitorName.trim() || inviteCode.trim().length < 10}>{busyId === "create" ? tr(language, "creating") : tr(language, "createInvitation")}</button>
            </form>
            {createdCode && (
              <div className="created-invite">
                <span>{tr(language, "newInvitationReady")}</span>
                <div><strong>{createdCode}</strong><button type="button" onClick={handleCopyInvite}>{copiedCode ? tr(language, "copied") : tr(language, "copy")}</button></div>
                <small>{tr(language, "invitationHelp")}</small>
              </div>
            )}
          </section>

          <section className="admin-panel admin-panel--visitors">
            <div className="admin-panel__heading"><span>02</span><h2>{tr(language, "visitorAccess")}</h2></div>
            <div className="visitor-table">
              {dashboard.invitations.length === 0 && <p className="admin-empty">{tr(language, "noVisitors")}</p>}
              {dashboard.invitations.map((visitor) => (
                <article key={visitor.id}>
                  <div><strong>{visitor.label}</strong><span className={visitor.is_active ? "status-active" : "status-paused"}>{visitor.is_active ? tr(language, "active") : tr(language, "paused")}</span></div>
                  <dl><div><dt>{tr(language, "visits")}</dt><dd>{visitor.visit_count}</dd></div><div><dt>{tr(language, "lastSeen")}</dt><dd>{formatAdminDate(visitor.last_seen_at, language)}</dd></div><div><dt>{tr(language, "expires")}</dt><dd>{visitor.expires_at ? formatAdminDate(visitor.expires_at, language) : tr(language, "noExpiry")}</dd></div></dl>
                  <button disabled={busyId === visitor.id} onClick={() => handleVisitorStatus(visitor.id, !visitor.is_active)}>{visitor.is_active ? tr(language, "pauseAccess") : tr(language, "restoreAccess")}</button>
                </article>
              ))}
            </div>
          </section>

          <section className="admin-panel admin-panel--activity">
            <div className="admin-panel__heading"><span>03</span><h2>{tr(language, "recentActivity")}</h2></div>
            <div className="activity-list">
              {dashboard.events.length === 0 && <p className="admin-empty">{tr(language, "noActivity")}</p>}
              {dashboard.events.map((event) => <div key={event.id}><span>{event.event_type}</span><strong>{event.visitor_name}</strong><time>{formatAdminDate(event.created_at, language)}</time></div>)}
            </div>
          </section>

          <section className="admin-panel admin-panel--messages">
            <div className="admin-panel__heading"><span>04</span><h2>{tr(language, "guestbookModeration")}</h2></div>
            <div className="moderation-list">
              {dashboard.messages.length === 0 && <p className="admin-empty">{tr(language, "noMessages")}</p>}
              {dashboard.messages.map((messageItem) => (
                <article key={messageItem.id} className={messageItem.status === "hidden" ? "is-hidden" : ""}>
                  <p>{messageItem.body}</p>
                  <footer><span><strong>{messageItem.visitor_name}</strong> · {formatAdminDate(messageItem.created_at, language)}</span><button disabled={busyId === messageItem.id} onClick={() => handleMessageStatus(messageItem.id, messageItem.status === "visible" ? "hidden" : "visible")}>{messageItem.status === "visible" ? tr(language, "hide") : tr(language, "show")}</button></footer>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}

async function copyToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const input = document.createElement("textarea");
  input.value = value;
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.appendChild(input);
  input.select();
  document.execCommand("copy");
  input.remove();
}

function Footer({ language, theme }: { language: Language; theme: SiteTheme }) {
  const [emailCopied, setEmailCopied] = useState(false);

  useEffect(() => {
    if (!emailCopied) return;
    const timeout = window.setTimeout(() => setEmailCopied(false), 2600);
    return () => window.clearTimeout(timeout);
  }, [emailCopied]);

  const handleEmailCopy = async () => {
    await copyToClipboard(profile.email);
    setEmailCopied(true);
  };

  return (
    <footer className="contact-footer">
      <div>
        <p className="kicker">{themedTr(language, theme, "contactKicker")}</p>
        <h2>{themedTr(language, theme, "connect")}</h2>
        <p>{tr(language, "lookingFor")}</p>
      </div>
      <div className="contact-links">
        <a href={profile.github} target="_blank" rel="noreferrer" aria-label="GitHub" title="GitHub">
          <GithubIcon />
        </a>
        <button type="button" onClick={handleEmailCopy} aria-label={tr(language, "copyEmail")} title={profile.email}>
          <MailIcon />
        </button>
      </div>
      {emailCopied && (
        <div className="copy-toast" role="status">
          <span>{tr(language, "emailCopied")}</span>
          <strong>{profile.email}</strong>
        </div>
      )}
    </footer>
  );
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageKey>(() => getPageFromHash());
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [language, setLanguage] = useState<Language>(() => localStorage.getItem(languageStorageKey) === "zh" ? "zh" : "en");
  const [theme, setTheme] = useState<SiteTheme>(() => {
    const initialPage = getPageFromHash();
    return initialPage === "gallery" || initialPage === "space" || localStorage.getItem(themeStorageKey) === "band"
      ? "band"
      : "minimal";
  });

  useEffect(() => {
    localStorage.setItem(languageStorageKey, language);
  }, [language]);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(themeStorageKey, theme);
  }, [theme]);

  useEffect(() => {
    const onHashChange = () => {
      const nextPage = getPageFromHash();
      if (nextPage === "gallery" || nextPage === "space") setTheme("band");
      setCurrentPage(nextPage);
      setIsMenuOpen(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const handleThemeToggle = () => {
    setTheme((current) => {
      const nextTheme = current === "minimal" ? "band" : "minimal";
      if (nextTheme === "minimal" && (currentPage === "gallery" || currentPage === "space")) {
        window.location.hash = "#/";
        setCurrentPage("home");
      }
      return nextTheme;
    });
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const pageContent = useMemo(() => {
    switch (currentPage) {
      case "projects":
        return <ProjectsPage language={language} theme={theme} />;
      case "publications":
        return <PublicationsPage language={language} theme={theme} />;
      case "notes":
        return <TechnicalNotesPage language={language} theme={theme} />;
      case "awards":
        return <AwardsPage language={language} theme={theme} />;
      case "gallery":
        return <GalleryPage language={language} />;
      case "space":
        return <PersonalSpacePage language={language} />;
      case "admin":
        return <AdminPage language={language} />;
      default:
        return <HomePage language={language} theme={theme} setPage={setCurrentPage} />;
    }
  }, [currentPage, language, theme]);

  const visiblePages = theme === "minimal"
    ? pages.filter((page) => page.key !== "gallery" && page.key !== "space")
    : pages;
  const navigationItems = visiblePages.map((page) => (
    <a
      key={page.key}
      href={page.key === "home" ? "#/" : `#/${page.key}`}
      onClick={() => {
        setCurrentPage(page.key);
        setIsMenuOpen(false);
      }}
      aria-current={currentPage === page.key ? "page" : undefined}
    >
      <span>{tr(language, navLabelKeys[page.key])}</span>
      {theme === "band" && <span className="nav-instrument" aria-hidden="true">{page.icon}</span>}
    </a>
  ));

  return (
    <>
      <main className={`site site--${theme}`} data-theme={theme}>
        <header className={`site-header${currentPage === "space" ? " site-header--dark" : ""}`}>
          <nav>
          <a
            href="#/"
            onClick={() => setCurrentPage("home")}
            className="site-name"
            aria-label={profile.name}
          >
            <span className="site-name__yuyun">Yuyun</span>
            <span className="site-name__chen">Chen</span>
            <small>{tr(language, "researchLog")}</small>
          </a>
          <div className="nav-links">{navigationItems}</div>
          <div className="header-tools">
            <button
              className="language-toggle"
              type="button"
              aria-label={tr(language, "languageLabel")}
              onClick={() => setLanguage((current) => current === "en" ? "zh" : "en")}
            >
              {tr(language, "languageToggle")}
            </button>
            <button
              className="volume-mark theme-toggle"
              type="button"
              aria-label={tr(language, theme === "minimal" ? "switchToBandStyle" : "switchToMinimalStyle")}
              title={tr(language, theme === "minimal" ? "switchToBandStyle" : "switchToMinimalStyle")}
              onClick={handleThemeToggle}
            >
              {theme === "minimal" ? "VOL. 01" : "VOL. 02"}
            </button>
          </div>
          <button
            className="nav-toggle"
            type="button"
            aria-label={isMenuOpen ? tr(language, "closeNavigation") : tr(language, "openNavigation")}
            aria-expanded={isMenuOpen}
            aria-controls="primary-navigation"
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>
          </nav>
        </header>
        {pageContent}
        {currentPage === "home" && <Footer language={language} theme={theme} />}
      </main>
      {isMenuOpen && createPortal(
        <div className="mobile-nav-layer">
          <button
            className="nav-backdrop is-open"
            type="button"
            aria-label={tr(language, "closeNavigation")}
            onClick={() => setIsMenuOpen(false)}
          />
          <div id="primary-navigation" className="nav-links nav-links--mobile is-open">
            <div className="nav-drawer-heading">
              <span>{tr(language, "contents")}</span>
              <button type="button" aria-label={tr(language, "closeNavigation")} onClick={() => setIsMenuOpen(false)}>×</button>
            </div>
            <button
              className="mobile-theme-toggle"
              type="button"
              onClick={handleThemeToggle}
            >
              <span>{theme === "minimal" ? "VOL. 01" : "VOL. 02"}</span>
              {tr(language, theme === "minimal" ? "switchToBandStyle" : "switchToMinimalStyle")}
            </button>
            {navigationItems}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
