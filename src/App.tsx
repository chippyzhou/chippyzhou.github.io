import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  createVisitorInvite,
  deletePrivateEntry,
  isPrivateSpaceConfigured,
  loadAdminDashboard,
  loadPrivateSpace,
  postGuestbookMessage,
  savePrivateEntry,
  setGuestbookMessageStatus,
  setVisitorInviteStatus,
  unlockPrivateSpace,
  type AdminDashboard,
  type PrivateEntry,
  type PrivateSpaceContent,
} from "./privateSpaceApi";

const assetPath = (fileName: string) => `${import.meta.env.BASE_URL}${fileName}`;

type PageKey = "home" | "projects" | "publications" | "notes" | "awards" | "gallery" | "space" | "admin";
type Language = "en" | "zh";

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
    researchLog: "陈彧赟 / research log",
    role: "Software engineering · Applied AI · Research notes",
    intro: "I work at the intersection of software engineering, data-driven systems, and applied research. This is my living log of models, competitions, experiments, and the notes behind each finished result.",
    openFieldNotes: "Open field notes",
    readSetlist: "Read the setlist",
    selectedProjects: "Selected projects",
    competitionAwards: "Competition awards",
    publicationsPreprints: "Publications / preprints",
    researchDirections: "Research directions",
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
    enter: "Enter ↗",
    privateSetup: "Private archive setup in progress.",
    invitationFootnote: "Each invitation belongs to one visitor and may be paused without erasing its history.",
    visitor: "visitor",
    welcomeAfterHours: "Welcome after hours,",
    visitorPass: "VISITOR PASS",
    recordedVisit: "recorded visit",
    recordedVisits: "recorded visits",
    manageVisitors: "Manage visitors →",
    logOut: "Log out",
    firstEntry: "The first private entry is being prepared.",
    guestbookKicker: "Guestbook / leave a trace",
    guestbookTitle: "A note before",
    guestbookTitleEm: "you leave.",
    guestbookIntro: "Your visitor name is attached privately. Only Yuyun can read your note.",
    guestbookPlaceholder: "Write something here...",
    posting: "Posting...",
    pinNote: "Pin this note",
    noteDelivered: "Your note has been delivered to Yuyun.",
    ownerStudio: "Owner studio / private editor",
    shapeArchive: "Shape the archive.",
    editorIntro: "Write in Markdown, add an image, preview the layout, then publish when ready.",
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
    image: "Image",
    removeImage: "Remove image",
    selectedEntryCover: "Selected entry cover",
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
  },
  zh: {
    languageToggle: "EN",
    languageLabel: "切换为英文",
    home: "首页",
    projects: "项目",
    publications: "学术成果",
    notes: "技术笔记",
    awards: "竞赛成果",
    gallery: "图片墙",
    space: "个人空间",
    closeNavigation: "关闭导航",
    openNavigation: "打开导航",
    contents: "目录",
    researchLog: "陈彧赟 / 研究记录",
    role: "软件工程 · 应用 AI · 研究笔记",
    intro: "我关注软件工程、数据驱动系统与应用研究的交汇处。这里记录模型、竞赛、实验，以及每个结果背后的思考过程。",
    openFieldNotes: "查看项目记录",
    readSetlist: "查看竞赛成果",
    selectedProjects: "精选项目",
    competitionAwards: "竞赛奖项",
    publicationsPreprints: "论文 / 预印本",
    researchDirections: "研究方向",
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
    enter: "进入 ↗",
    privateSetup: "私人档案正在设置中。",
    invitationFootnote: "每个邀请只属于一位访客，可以暂停访问，但不会抹去历史记录。",
    visitor: "访客",
    welcomeAfterHours: "欢迎来到闭馆之后，",
    visitorPass: "访客通行证",
    recordedVisit: "次访问记录",
    recordedVisits: "次访问记录",
    manageVisitors: "管理访客 →",
    logOut: "退出登录",
    firstEntry: "第一篇私人记录正在准备中。",
    guestbookKicker: "留言板 / 留下一点痕迹",
    guestbookTitle: "离开之前，",
    guestbookTitleEm: "写一句话。",
    guestbookIntro: "你的访客名称会被私密附上，只有 Yuyun 可以看到留言。",
    guestbookPlaceholder: "在这里写点什么...",
    posting: "发布中...",
    pinNote: "钉住这张便签",
    noteDelivered: "你的留言已经送达 Yuyun。",
    ownerStudio: "管理员工作室 / 私人编辑器",
    shapeArchive: "塑造这座档案馆。",
    editorIntro: "使用 Markdown 写作，添加图片，预览排版，准备好后再发布。",
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
    image: "图片",
    removeImage: "移除图片",
    selectedEntryCover: "已选记录封面",
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
  },
} as const;

type CopyKey = keyof typeof copy.en;

function tr(language: Language, key: CopyKey) {
  return copy[language][key];
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
  { value: "03", label: "Publications / preprints" },
  { value: "02", label: "Research directions" },
];

const projects = [
  {
    title: "Research Assistant Platform",
    titleZh: "科研助理平台",
    type: "Full-stack project",
    typeZh: "全栈项目",
    period: "2026",
    link: "https://github.com/yourname/research-platform",
    summary:
      "A web system for collecting literature notes, experiments, and reproducible research logs in one workflow.",
    summaryZh: "一个把文献笔记、实验记录和可复现研究日志收纳到同一工作流中的 Web 系统。",
    tags: ["React", "Data workflow", "Research tooling"],
    tagsZh: ["React", "数据工作流", "研究工具"],
  },
  {
    title: "Competition Analytics Dashboard",
    titleZh: "竞赛分析仪表盘",
    type: "Data product",
    typeZh: "数据产品",
    period: "2025",
    link: "https://github.com/yourname/analytics-dashboard",
    summary:
      "An interactive dashboard for comparing model outputs, team progress, and judging metrics during competitions.",
    summaryZh: "一个用于竞赛期间比较模型输出、团队进度和评审指标的交互式仪表盘。",
    tags: ["Visualization", "Python", "Model evaluation"],
    tagsZh: ["可视化", "Python", "模型评估"],
  },
  {
    title: "Campus Service Assistant",
    titleZh: "校园服务助手",
    type: "Applied AI",
    typeZh: "应用 AI",
    period: "2025",
    link: "https://github.com/yourname/campus-assistant",
    summary:
      "A prototype assistant for academic service scenarios, with retrieval, structured prompts, and evaluation cases.",
    summaryZh: "面向学术服务场景的助手原型，包含检索、结构化提示词和评测用例。",
    tags: ["LLM", "RAG", "Prototype"],
    tagsZh: ["LLM", "RAG", "原型"],
  },
];

const publications = [
  {
    title: "Adaptive Interfaces for Research Workflows",
    titleZh: "面向研究工作流的自适应界面",
    venue: "Conference / Journal / arXiv, 2026",
    venueZh: "会议 / 期刊 / arXiv，2026",
    status: "Under review",
    statusZh: "审稿中",
    summary:
      "A study of how structured interfaces can reduce friction in literature review, experiment tracking, and collaborative research documentation.",
    summaryZh: "研究结构化界面如何降低文献综述、实验跟踪和协作研究记录中的摩擦。",
    link: "#",
  },
  {
    title: "A Short Research Note on Applied Systems",
    titleZh: "应用系统研究短札",
    venue: "Workshop / Student Symposium, 2025",
    venueZh: "工作坊 / 学生论坛，2025",
    status: "Presented",
    statusZh: "已展示",
    summary:
      "A concise report on prototype evaluation, data preparation, and practical constraints in applied software systems.",
    summaryZh: "关于应用软件系统原型评估、数据准备和实际约束的一份简短报告。",
    link: "#",
  },
  {
    title: "Course Project Report or Technical Whitepaper",
    titleZh: "课程项目报告或技术白皮书",
    venue: "Department archive, 2025",
    venueZh: "院系档案，2025",
    status: "Published online",
    statusZh: "已在线发布",
    summary:
      "A formal technical report documenting system motivation, design choices, experimental setup, and implementation findings.",
    summaryZh: "记录系统动机、设计选择、实验设置和实现结论的正式技术报告。",
    link: "#",
  },
];

const awards = [
  {
    title: "2026 MCM/ICM · Problem C",
    year: "2026",
    result: "Meritorious Winner · Top 7%",
    resultZh: "Meritorious Winner · 全球前 7%",
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
    date: "2026.07",
    title: "From a model to a system: notes on applied AI prototypes",
    titleZh: "从模型到系统：应用 AI 原型笔记",
    summary: "A working checklist for turning model output into a testable product flow, including data boundaries, evaluation cases, and failure states.",
    summaryZh: "把模型输出转化为可测试产品流程的一份工作清单，包含数据边界、评测用例和失败状态。",
    tags: ["Applied AI", "Evaluation", "Product thinking"],
    tagsZh: ["应用 AI", "评测", "产品思维"],
    status: "Working note",
    statusZh: "工作笔记",
  },
  {
    date: "2026.05",
    title: "Multi-objective optimization field notes",
    titleZh: "多目标优化现场笔记",
    summary: "Practical observations from combining packing heuristics, genetic search, and cost constraints in mathematical modeling competitions.",
    summaryZh: "在数学建模竞赛中结合装箱启发式算法、遗传搜索和成本约束时积累的实践观察。",
    tags: ["Optimization", "Block-GA", "HFV-BPP"],
    tagsZh: ["优化", "Block-GA", "HFV-BPP"],
    status: "Model diary",
    statusZh: "模型日记",
  },
  {
    date: "2026.03",
    title: "Building a reproducible research log",
    titleZh: "搭建可复现的研究日志",
    summary: "A compact structure for tracking assumptions, datasets, parameters, experiments, and decisions without losing the narrative behind the result.",
    summaryZh: "用紧凑的结构记录假设、数据集、参数、实验和决策，同时保留结果背后的叙事。",
    tags: ["Research workflow", "Data", "Reproducibility"],
    tagsZh: ["研究工作流", "数据", "可复现性"],
    status: "Living document",
    statusZh: "持续更新",
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
  { key: "notes", label: "Tech Notes", icon: "📓" },
  { key: "awards", label: "Awards", icon: "🥁" },
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
  children,
}: {
  language: Language;
  index: string;
  kicker: string;
  title: string;
  description: string;
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
        {children}
      </div>
    </section>
  );
}

function HomePage({ language, setPage }: { language: Language; setPage: (page: PageKey) => void }) {
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
            <a href="#/projects" onClick={() => setPage("projects")} className="button button--primary">
              {tr(language, "openFieldNotes")}
            </a>
            <a href="#/awards" onClick={() => setPage("awards")} className="button">
              {tr(language, "readSetlist")}
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
      </section>

      <section className="about-band">
        <div className="about-band__label">
          <p className="kicker">{tr(language, "aboutMargin")}</p>
          <h2>{tr(language, "aboutHeading")}</h2>
          <p className="hand-note">{tr(language, "aboutNote")}</p>
        </div>
        <div className="about-band__copy">
          <p>
            {tr(language, "aboutParagraphOne")}
          </p>
          <p>
            {tr(language, "aboutParagraphTwo")}
          </p>
          <figure className="research-polaroid">
            <img
              src={assetPath("portfolio-hero.png")}
              alt="Academic workspace with laptop, notes, and research material"
            />
            <figcaption>{(language === "zh" ? profile.focusZh : profile.focus).join(" / ")}</figcaption>
          </figure>
        </div>
      </section>
    </>
  );
}

function ProjectsPage({ language }: { language: Language }) {
  return (
    <PageShell
      language={language}
      index="01"
      kicker={tr(language, "projectsKicker")}
      title={tr(language, "projectsTitle")}
      description={tr(language, "projectsDescription")}
    >
      <div className="project-list">
        {projects.map((project, index) => (
          <article key={project.title} className="project-entry">
            <div className="entry-index">{String(index + 1).padStart(2, "0")}</div>
            <div>
              <p className="entry-meta">{localized(language, project.type, project.typeZh)} / {project.period}</p>
              <h2>{localized(language, project.title, project.titleZh)}</h2>
              <p>{localized(language, project.summary, project.summaryZh)}</p>
              <div className="tag-list">
                {(language === "zh" ? project.tagsZh : project.tags).map((tag) => <span key={tag}>{tag}</span>)}
              </div>
            </div>
            <a href={project.link} className="entry-link">{tr(language, "openNote")}</a>
          </article>
        ))}
      </div>
    </PageShell>
  );
}

function PublicationsPage({ language }: { language: Language }) {
  return (
    <PageShell
      language={language}
      index="02"
      kicker={tr(language, "publicationsKicker")}
      title={tr(language, "publicationsTitle")}
      description={tr(language, "publicationsDescription")}
    >
      <div className="publication-list">
        {publications.map((paper, index) => (
          <article key={paper.title} className="publication-entry">
            <div className="entry-index">{String(index + 1).padStart(2, "0")}</div>
            <div>
              <p className="entry-meta">{localized(language, paper.venue, paper.venueZh)}</p>
              <h2>{localized(language, paper.title, paper.titleZh)}</h2>
              <p>{localized(language, paper.summary, paper.summaryZh)}</p>
            </div>
            <div className="publication-status">
              <span>{localized(language, paper.status, paper.statusZh)}</span>
              <a href={paper.link}>{tr(language, "read")}</a>
            </div>
          </article>
        ))}
      </div>
    </PageShell>
  );
}

function TechnicalNotesPage({ language }: { language: Language }) {
  return (
    <PageShell
      language={language}
      index="03"
      kicker={tr(language, "notesKicker")}
      title={tr(language, "notesTitle")}
      description={tr(language, "notesDescription")}
    >
      <div className="notes-index">
        {technicalNotes.map((note, index) => (
          <article className="note-sheet" key={note.title}>
            <div className="note-sheet__rail">
              <span>{String(index + 1).padStart(2, "0")}</span>
              <time>{note.date}</time>
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

function AwardsPage({ language }: { language: Language }) {
  return (
    <PageShell
      language={language}
      index="04"
      kicker={tr(language, "awardsKicker")}
      title={tr(language, "awardsTitle")}
      description={tr(language, "awardsDescription")}
    >
      <div className="award-list">
        {awards.map((award, index) => (
          <article key={award.title} className="award-entry">
            <div className="award-number">{String(index + 1).padStart(2, "0")}</div>
            <div>
              <p className="entry-meta">{award.year}</p>
              <h2>{award.title}</h2>
              <p className="award-result">{localized(language, award.result, award.resultZh)}</p>
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
    >
      <div className="gallery-wall">
        {gallery.map((item, index) => (
          <a
            key={`${item.title}-${index}`}
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

function takeInitialPrivateSpaceSession() {
  const ownerPreviewToken = sessionStorage.getItem(ownerPreviewKey);
  if (ownerPreviewToken) {
    sessionStorage.removeItem(ownerPreviewKey);
    return ownerPreviewToken;
  }
  const visitorToken = sessionStorage.getItem(visitorSessionKey) || "";
  localStorage.removeItem(visitorSessionKey);
  return visitorToken;
}

function PersonalSpacePage({ language }: { language: Language }) {
  const [inviteCode, setInviteCode] = useState("");
  const [sessionToken, setSessionToken] = useState(takeInitialPrivateSpaceSession);
  const [content, setContent] = useState<PrivateSpaceContent | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(Boolean(sessionToken));
  const [isPosting, setIsPosting] = useState(false);
  const [messageSent, setMessageSent] = useState(false);

  useEffect(() => {
    let isCurrentRequest = true;

    if (!sessionToken || !isPrivateSpaceConfigured) {
      setIsLoading(false);
      return () => {
        isCurrentRequest = false;
      };
    }

    setIsLoading(true);
    loadPrivateSpace(sessionToken)
      .then((payload) => {
        if (!isCurrentRequest) return;
        setContent(payload);
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
        setError(requestError.message);
      })
      .finally(() => {
        if (isCurrentRequest) setIsLoading(false);
      });

    return () => {
      isCurrentRequest = false;
    };
  }, [sessionToken]);

  const handleUnlock = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!inviteCode.trim()) return;
    setIsLoading(true);
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
      setSessionToken(visitor.session_token);
      setInviteCode("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : localized(language, "Unable to unlock this space.", "无法打开这个空间。"));
      setIsLoading(false);
    }
  };

  const handleMessage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!message.trim() || !sessionToken || !content) return;
    setIsPosting(true);
    setError("");
    setMessageSent(false);
    try {
      await postGuestbookMessage(sessionToken, message);
      setMessage("");
      setMessageSent(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : localized(language, "Unable to leave this message.", "留言发送失败。"));
    } finally {
      setIsPosting(false);
    }
  };

  const handleVisitorLogout = () => {
    sessionStorage.removeItem(visitorSessionKey);
    localStorage.removeItem(ownerSessionKey);
    setSessionToken("");
    setContent(null);
    setIsLoading(false);
    setInviteCode("");
    setMessage("");
    setMessageSent(false);
    setError("");
  };

  if (!content) {
    return (
      <section className="personal-space personal-space--locked">
        <div className="space-noise" aria-hidden="true" />
        <div className="space-lock">
          <p className="space-eyebrow">{tr(language, "privateEdition")}</p>
          <div className="space-lock__symbol" aria-hidden="true">✦</div>
          <h1>{tr(language, "lastEncore")}<br /><em>{tr(language, "lastEncoreEm")}</em></h1>
          <p className="space-lock__intro">{tr(language, "privateIntro")}</p>
          <form className="space-unlock" onSubmit={handleUnlock}>
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
              <button type="submit" disabled={!inviteCode.trim() || isLoading}>
                {isLoading ? tr(language, "checking") : tr(language, "enter")}
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
            <small>{content.visitor.visit_count} {content.visitor.visit_count === 1 ? tr(language, "recordedVisit") : tr(language, "recordedVisits")}</small>
            {content.visitor.is_owner && <a className="owner-console-link" href="#/admin">{tr(language, "manageVisitors")}</a>}
            <button className="space-signout" type="button" onClick={handleVisitorLogout}>{tr(language, "logOut")}</button>
          </div>
        </header>

        {content.visitor.is_owner && (
          <OwnerSpaceEditor
            sessionToken={sessionToken}
            entries={content.entries}
            language={language}
            onEntriesChange={(entries) => setContent({ ...content, entries })}
          />
        )}

        <div className="private-archive">
          {content.entries.length === 0 && <p className="archive-empty">{tr(language, "firstEntry")}</p>}
          {content.entries.map((entry) => (
            <article className={`archive-entry archive-entry--${entry.kind}`} key={entry.id}>
              {entry.image_url && <img src={entry.image_url} alt="" />}
              <div>
                <p>{localized(language, entry.kind, {
                  writing: tr(language, "writing"),
                  photography: tr(language, "photography"),
                  film: tr(language, "filmNote"),
                }[entry.kind])} {entry.event_date ? `· ${entry.event_date}` : ""}</p>
                <h2>{entry.title}</h2>
                <strong>{entry.excerpt}</strong>
                <div className="archive-entry__body">{renderMarkdown(entry.body, language)}</div>
              </div>
            </article>
          ))}
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
                  setMessageSent(false);
                }}
                placeholder={tr(language, "guestbookPlaceholder")}
                maxLength={500}
                rows={4}
              />
              <div><span>{message.length}/500</span><button disabled={isPosting || !message.trim()}>{isPosting ? tr(language, "posting") : tr(language, "pinNote")}</button></div>
            </form>
            {messageSent && <p className="guestbook-success" role="status">{tr(language, "noteDelivered")}</p>}
            {error && <p className="space-error" role="alert">{error}</p>}
          </div>
        </section>
      </div>
    </section>
  );
}

type EntryDraft = {
  id: string | null;
  kind: PrivateEntry["kind"];
  title: string;
  excerpt: string;
  body: string;
  image_url: string | null;
  event_date: string | null;
  is_published: boolean;
};

function blankEntryDraft(language: Language): EntryDraft {
  return {
    id: null,
    kind: "writing",
    title: "",
    excerpt: "",
    body: tr(language, "newFragmentMarkdown"),
    image_url: null,
    event_date: null,
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
    image_url: entry.image_url,
    event_date: entry.event_date,
    is_published: entry.is_published,
  };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function markdownInline(value: string) {
  return escapeHtml(value)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/_([^_]+)_/g, "<em>$1</em>")
    .replace(/\n/g, "<br />");
}

function renderMarkdown(markdown: string, language: Language) {
  const source = markdown.trim();
  if (!source) return <p className="markdown-empty">{tr(language, "nothingWritten")}</p>;

  return (
    <>
      {source.split(/\n{2,}/).map((block, index) => {
        const lines = block.split("\n");
        const codeBlock = block.match(/^```[^\n]*\n([\s\S]*?)\n?```$/);
        const heading = block.match(/^(#{1,3})\s+(.+)$/);
        const isUnorderedList = lines.every((line) => /^\s*[-*]\s+/.test(line));
        const isOrderedList = lines.every((line) => /^\s*\d+\.\s+/.test(line));
        const key = `markdown-${index}`;

        if (codeBlock) {
          return <pre key={key}><code>{codeBlock[1]}</code></pre>;
        }
        if (heading) {
          const Heading = heading[1].length === 1 ? "h3" : "h4";
          return <Heading key={key} dangerouslySetInnerHTML={{ __html: markdownInline(heading[2]) }} />;
        }
        if (isUnorderedList || isOrderedList) {
          const List = isOrderedList ? "ol" : "ul";
          return (
            <List key={key}>
              {lines.map((line, itemIndex) => (
                <li key={`${key}-${itemIndex}`} dangerouslySetInnerHTML={{ __html: markdownInline(line.replace(/^\s*(?:[-*]|\d+\.)\s+/, "")) }} />
              ))}
            </List>
          );
        }
        if (lines.every((line) => /^>\s?/.test(line))) {
          return <blockquote key={key} dangerouslySetInnerHTML={{ __html: markdownInline(lines.map((line) => line.replace(/^>\s?/, "")).join("\n")) }} />;
        }
        return <p key={key} dangerouslySetInnerHTML={{ __html: markdownInline(block) }} />;
      })}
    </>
  );
}

function readImageAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Please choose an image file."));
      return;
    }
    if (file.size > 2_000_000) {
      reject(new Error("Images must be smaller than 2 MB."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("The image could not be read."));
    reader.readAsDataURL(file);
  });
}

function OwnerSpaceEditor({
  sessionToken,
  entries,
  language,
  onEntriesChange,
}: {
  sessionToken: string;
  entries: PrivateEntry[];
  language: Language;
  onEntriesChange: (entries: PrivateEntry[]) => void;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [draft, setDraft] = useState<EntryDraft>(() => blankEntryDraft(language));
  const [isBusy, setIsBusy] = useState(false);
  const [editorError, setEditorError] = useState("");
  const [editorNotice, setEditorNotice] = useState("");

  const updateDraft = <Key extends keyof EntryDraft>(key: Key, value: EntryDraft[Key]) => {
    setDraft((current) => ({ ...current, [key]: value }));
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
    try {
      const savedEntry = await savePrivateEntry(sessionToken, {
        ...draft,
        title: draft.title.trim(),
        excerpt: draft.excerpt.trim(),
      });
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
    const file = event.target.files?.[0];
    if (!file) return;
    setEditorError("");
    try {
      updateDraft("image_url", await readImageAsDataUrl(file));
    } catch (uploadError) {
      setEditorError(uploadError instanceof Error ? uploadError.message : localized(language, "The image could not be uploaded.", "图片上传失败。"));
    }
    event.target.value = "";
  };

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
                <small>{entry.is_published ? tr(language, "published") : tr(language, "draft")} · {localized(language, entry.kind, { writing: tr(language, "writing"), photography: tr(language, "photography"), film: tr(language, "filmNote") }[entry.kind])}</small>
              </button>
            ))}
          </aside>

          <form className="space-editor__form" onSubmit={handleSave}>
            <div className="space-editor__form-row">
              <label>{tr(language, "title")}<input value={draft.title} onChange={(event) => updateDraft("title", event.target.value)} placeholder={tr(language, "titlePlaceholder")} /></label>
              <label>{tr(language, "type")}<select value={draft.kind} onChange={(event) => updateDraft("kind", event.target.value as EntryDraft["kind"])}><option value="writing">{tr(language, "writing")}</option><option value="photography">{tr(language, "photography")}</option><option value="film">{tr(language, "filmNote")}</option></select></label>
            </div>
            <label>{tr(language, "excerpt")}<input value={draft.excerpt} onChange={(event) => updateDraft("excerpt", event.target.value)} placeholder={tr(language, "excerptPlaceholder")} /></label>
            <label>{tr(language, "markdownBody")}<textarea rows={12} value={draft.body} onChange={(event) => updateDraft("body", event.target.value)} placeholder={tr(language, "markdownPlaceholder")} /></label>
            <div className="space-editor__form-row">
              <label>{tr(language, "eventDate")}<input type="date" value={draft.event_date || ""} onChange={(event) => updateDraft("event_date", event.target.value || null)} /></label>
              <label>{tr(language, "image")}<input type="file" accept="image/*" onChange={handleImageUpload} /></label>
            </div>
            {draft.image_url && <div className="space-editor__image"><img src={draft.image_url} alt={tr(language, "selectedEntryCover")} /><button type="button" onClick={() => updateDraft("image_url", null)}>{tr(language, "removeImage")}</button></div>}
            <label className="space-editor__publish"><input type="checkbox" checked={draft.is_published} onChange={(event) => updateDraft("is_published", event.target.checked)} /> {tr(language, "publishEntry")}</label>
            {editorError && <p className="space-editor__error" role="alert">{editorError}</p>}
            {editorNotice && <p className="space-editor__notice" role="status">{editorNotice}</p>}
            <div className="space-editor__footer"><button className="space-editor__save" type="submit" disabled={isBusy}>{isBusy ? tr(language, "saving") : tr(language, "saveEntry")}</button>{draft.id && <button className="space-editor__delete" type="button" onClick={handleDelete} disabled={isBusy}>{tr(language, "delete")}</button>}</div>
          </form>

          <aside className="space-editor__preview">
            <p className="space-editor__label">{tr(language, "livePreview")}</p>
            <article className="space-editor__preview-card">
              {draft.image_url && <img src={draft.image_url} alt={tr(language, "selectedEntryCover")} />}
              <div>
                <p>{localized(language, draft.kind, { writing: tr(language, "writing"), photography: tr(language, "photography"), film: tr(language, "filmNote") }[draft.kind])}{draft.event_date ? ` · ${draft.event_date}` : ""}</p>
                <h3>{draft.title || tr(language, "untitledFragment")}</h3>
                {draft.excerpt && <strong>{draft.excerpt}</strong>}
                <div className="archive-entry__body">{renderMarkdown(draft.body, language)}</div>
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
  const [ownerCode, setOwnerCode] = useState("");
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [visitorName, setVisitorName] = useState("");
  const [inviteSuffix, setInviteSuffix] = useState(makeInviteSuffix);
  const [expiresAt, setExpiresAt] = useState("");
  const [createdCode, setCreatedCode] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(Boolean(sessionToken));
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
      setIsLoading(false);
      return;
    }
    refreshDashboard(sessionToken)
      .catch((requestError: Error) => {
        setDashboard(null);
        setError(requestError.message);
      })
      .finally(() => setIsLoading(false));
  }, [sessionToken]);

  const handleOwnerLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!ownerCode.trim()) return;
    setIsLoading(true);
    setError("");
    try {
      const identity = await unlockPrivateSpace(ownerCode);
      await refreshDashboard(identity.session_token);
      localStorage.setItem(ownerSessionKey, identity.session_token);
      sessionStorage.removeItem(visitorSessionKey);
      setSessionToken(identity.session_token);
      setOwnerCode("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Owner access could not be verified.");
    } finally {
      setIsLoading(false);
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
    setSessionToken("");
    setDashboard(null);
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

  if (!dashboard) {
    return (
      <section className="admin-login">
        <div>
          <p className="kicker">{tr(language, "ownerConsoleKicker")}</p>
          <h1>{tr(language, "visitorControlRoom")}</h1>
          <p>{tr(language, "ownerConsoleIntro")}</p>
          <form onSubmit={handleOwnerLogin}>
            <input
              type="password"
              value={ownerCode}
              onChange={(event) => setOwnerCode(event.target.value)}
              placeholder={tr(language, "ownerCodePlaceholder")}
              autoFocus
            />
            <button type="submit" disabled={isLoading || !ownerCode.trim()}>{isLoading ? tr(language, "checking") : tr(language, "openConsole")}</button>
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

function Footer({ language }: { language: Language }) {
  return (
    <footer className="contact-footer">
      <div>
        <p className="kicker">{tr(language, "contactKicker")}</p>
        <h2>{tr(language, "connect")}</h2>
        <p>{tr(language, "lookingFor")}</p>
      </div>
      <div className="contact-links">
        <a href={profile.github} target="_blank" rel="noreferrer" aria-label="GitHub" title="GitHub">
          <GithubIcon />
        </a>
        <a href={`mailto:${profile.email}`} aria-label="Outlook email" title={profile.email}>
          <MailIcon />
        </a>
      </div>
    </footer>
  );
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageKey>(() => getPageFromHash());
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [language, setLanguage] = useState<Language>(() => localStorage.getItem(languageStorageKey) === "zh" ? "zh" : "en");

  useEffect(() => {
    localStorage.setItem(languageStorageKey, language);
  }, [language]);

  useEffect(() => {
    const onHashChange = () => {
      setCurrentPage(getPageFromHash());
      setIsMenuOpen(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

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
        return <ProjectsPage language={language} />;
      case "publications":
        return <PublicationsPage language={language} />;
      case "notes":
        return <TechnicalNotesPage language={language} />;
      case "awards":
        return <AwardsPage language={language} />;
      case "gallery":
        return <GalleryPage language={language} />;
      case "space":
        return <PersonalSpacePage language={language} />;
      case "admin":
        return <AdminPage language={language} />;
      default:
        return <HomePage language={language} setPage={setCurrentPage} />;
    }
  }, [currentPage, language]);

  const navigationItems = pages.map((page) => (
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
      <span className="nav-instrument" aria-hidden="true">{page.icon}</span>
    </a>
  ));

  return (
    <>
      <main className="site">
        <header className="site-header">
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
            <span className="volume-mark">VOL. 01</span>
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
        {currentPage === "home" && <Footer language={language} />}
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
            {navigationItems}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
