import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  createVisitorInvite,
  isPrivateSpaceConfigured,
  loadAdminDashboard,
  loadPrivateSpace,
  postGuestbookMessage,
  setGuestbookMessageStatus,
  setVisitorInviteStatus,
  unlockPrivateSpace,
  type AdminDashboard,
  type PrivateSpaceContent,
} from "./privateSpaceApi";

const assetPath = (fileName: string) => `${import.meta.env.BASE_URL}${fileName}`;

type PageKey = "home" | "projects" | "publications" | "notes" | "awards" | "gallery" | "space" | "admin";

const profile = {
  name: "Yuyun Chen（陈彧赟）",
  role: "Software engineering · Applied AI · Research notes",
  location: "Guangzhou, China",
  email: "chensilu_0717@outlook.com",
  github: "https://github.com/chippyzhou",
  intro:
    "I work at the intersection of software engineering, data-driven systems, and applied research. This is my living log of models, competitions, experiments, and the notes behind each finished result.",
  focus: ["Software Engineering", "AI Applications", "Research Systems"],
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
    type: "Full-stack project",
    period: "2026",
    link: "https://github.com/yourname/research-platform",
    summary:
      "A web system for collecting literature notes, experiments, and reproducible research logs in one workflow.",
    tags: ["React", "Data workflow", "Research tooling"],
  },
  {
    title: "Competition Analytics Dashboard",
    type: "Data product",
    period: "2025",
    link: "https://github.com/yourname/analytics-dashboard",
    summary:
      "An interactive dashboard for comparing model outputs, team progress, and judging metrics during competitions.",
    tags: ["Visualization", "Python", "Model evaluation"],
  },
  {
    title: "Campus Service Assistant",
    type: "Applied AI",
    period: "2025",
    link: "https://github.com/yourname/campus-assistant",
    summary:
      "A prototype assistant for academic service scenarios, with retrieval, structured prompts, and evaluation cases.",
    tags: ["LLM", "RAG", "Prototype"],
  },
];

const publications = [
  {
    title: "Adaptive Interfaces for Research Workflows",
    venue: "Conference / Journal / arXiv, 2026",
    status: "Under review",
    summary:
      "A study of how structured interfaces can reduce friction in literature review, experiment tracking, and collaborative research documentation.",
    link: "#",
  },
  {
    title: "A Short Research Note on Applied Systems",
    venue: "Workshop / Student Symposium, 2025",
    status: "Presented",
    summary:
      "A concise report on prototype evaluation, data preparation, and practical constraints in applied software systems.",
    link: "#",
  },
  {
    title: "Course Project Report or Technical Whitepaper",
    venue: "Department archive, 2025",
    status: "Published online",
    summary:
      "A formal technical report documenting system motivation, design choices, experimental setup, and implementation findings.",
    link: "#",
  },
];

const awards = [
  {
    title: "2026 MCM/ICM · Problem C",
    year: "2026",
    result: "Meritorious Winner · Top 7%",
    detail: (
      <>
        Proposed the <strong>SAWS (Star-Approval Weighted System)</strong>, using
        the <strong>Bradley-Terry model</strong> and{" "}
        <strong>dual-channel OLS regression</strong> to analyze judge-fan
        structural bias and improve scoring fairness.
      </>
    ),
  },
  {
    title: "2026 MathorCup · Problem D",
    year: "2026",
    result: "Provincial First Prize",
    detail: (
      <>
        Developed the <strong>HFV-BPP</strong> multi-objective 3D heterogeneous
        bin-packing system with <strong>Layered-FFD</strong> and{" "}
        <strong>Block-GA</strong>, achieving <strong>93.72%</strong> volume
        utilization and reducing total logistics costs by{" "}
        <strong>26.8%</strong>.
      </>
    ),
  },
  {
    title: "2025 APMCM · Problem B",
    year: "2025",
    result: "Provincial Second Prize",
    detail: (
      <>
        Built an optical-thermal model for{" "}
        <strong>passive daytime radiative cooling (PDRC)</strong>, combining the{" "}
        <strong>Drude-Lorentz dielectric function</strong>,{" "}
        <strong>Transfer Matrix Method (TMM)</strong>, and{" "}
        <strong>Grid Search + L-BFGS-B</strong> for PDMS film design.
      </>
    ),
  },
];

const technicalNotes = [
  {
    date: "2026.07",
    title: "From a model to a system: notes on applied AI prototypes",
    summary: "A working checklist for turning model output into a testable product flow, including data boundaries, evaluation cases, and failure states.",
    tags: ["Applied AI", "Evaluation", "Product thinking"],
    status: "Working note",
  },
  {
    date: "2026.05",
    title: "Multi-objective optimization field notes",
    summary: "Practical observations from combining packing heuristics, genetic search, and cost constraints in mathematical modeling competitions.",
    tags: ["Optimization", "Block-GA", "HFV-BPP"],
    status: "Model diary",
  },
  {
    date: "2026.03",
    title: "Building a reproducible research log",
    summary: "A compact structure for tracking assumptions, datasets, parameters, experiments, and decisions without losing the narrative behind the result.",
    tags: ["Research workflow", "Data", "Reproducibility"],
    status: "Living document",
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

const pages: Array<{ key: PageKey; label: string; icon: string }> = [
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
  index,
  kicker,
  title,
  description,
  children,
}: {
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

function HomePage({ setPage }: { setPage: (page: PageKey) => void }) {
  return (
    <>
      <section className="home-hero">
        <div className="home-copy">
          <p className="kicker">{profile.role}</p>
          <h1>
            Yuyun
            <br />
            <em>Chen.</em>
          </h1>
          <p className="hero-intro">{profile.intro}</p>
          <div className="hero-actions">
            <a href="#/projects" onClick={() => setPage("projects")} className="button button--primary">
              Open field notes
            </a>
            <a href="#/awards" onClick={() => setPage("awards")} className="button">
              Read the setlist
            </a>
          </div>
          <dl className="metrics">
            {metrics.map((item) => (
              <div key={item.label}>
                <dt>{item.value}</dt>
                <dd>{item.label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <aside className="character-board" aria-label="Girl band inspiration board">
          <div className="tape" aria-hidden="true" />
          <p className="hand-note">band-side research club / vol. 01</p>
          <div className="character-board__title">
            <strong>LIVE LOG</strong>
            <span>5 character stickers</span>
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
                  <small>{character.role}</small>
                </span>
              </a>
            ))}
          </div>
          <p className="asset-credit">
            Character references: AniList / BanG Dream! Ave Mujica
          </p>
        </aside>
      </section>

      <section className="about-band">
        <div className="about-band__label">
          <p className="kicker">About / margin note</p>
          <h2>Build it. Test it. Write down what changed.</h2>
          <p className="hand-note">research should leave traces</p>
        </div>
        <div className="about-band__copy">
          <p>
            I am preparing for roles and academic opportunities where engineering
            practice and research judgment both matter. My work emphasizes clear
            problem framing, reproducible implementation, and readable communication.
          </p>
          <p>
            My academic interests are grounded in implementation: systems that can
            be tested, explained, and transferred into real use.
          </p>
          <figure className="research-polaroid">
            <img
              src={assetPath("portfolio-hero.png")}
              alt="Academic workspace with laptop, notes, and research material"
            />
            <figcaption>{profile.focus.join(" / ")}</figcaption>
          </figure>
        </div>
      </section>
    </>
  );
}

function ProjectsPage() {
  return (
    <PageShell
      index="01"
      kicker="Projects / production notes"
      title="Selected technical work"
      description="Each project is logged like a track in production: context, tools, implementation notes, and the public link."
    >
      <div className="project-list">
        {projects.map((project, index) => (
          <article key={project.title} className="project-entry">
            <div className="entry-index">{String(index + 1).padStart(2, "0")}</div>
            <div>
              <p className="entry-meta">{project.type} / {project.period}</p>
              <h2>{project.title}</h2>
              <p>{project.summary}</p>
              <div className="tag-list">
                {project.tags.map((tag) => <span key={tag}>{tag}</span>)}
              </div>
            </div>
            <a href={project.link} className="entry-link">Open note ↗</a>
          </article>
        ))}
      </div>
    </PageShell>
  );
}

function PublicationsPage() {
  return (
    <PageShell
      index="02"
      kicker="Publications / research tracks"
      title="Academic output"
      description="Papers, preprints, posters, and technical reports arranged as an evolving research discography."
    >
      <div className="publication-list">
        {publications.map((paper, index) => (
          <article key={paper.title} className="publication-entry">
            <div className="entry-index">{String(index + 1).padStart(2, "0")}</div>
            <div>
              <p className="entry-meta">{paper.venue}</p>
              <h2>{paper.title}</h2>
              <p>{paper.summary}</p>
            </div>
            <div className="publication-status">
              <span>{paper.status}</span>
              <a href={paper.link}>Read ↗</a>
            </div>
          </article>
        ))}
      </div>
    </PageShell>
  );
}

function TechnicalNotesPage() {
  return (
    <PageShell
      index="03"
      kicker="Technical notes / workbench"
      title="Notes from the build"
      description="Methods, implementation decisions, model experiments, and the useful fragments that live between a project and a paper."
    >
      <div className="notes-index">
        {technicalNotes.map((note, index) => (
          <article className="note-sheet" key={note.title}>
            <div className="note-sheet__rail">
              <span>{String(index + 1).padStart(2, "0")}</span>
              <time>{note.date}</time>
            </div>
            <div className="note-sheet__body">
              <p className="entry-meta">{note.status}</p>
              <h2>{note.title}</h2>
              <p>{note.summary}</p>
              <div className="tag-list">
                {note.tags.map((tag) => <span key={tag}>{tag}</span>)}
              </div>
            </div>
            <span className="note-sheet__mark" aria-hidden="true">∿</span>
          </article>
        ))}
      </div>
    </PageShell>
  );
}

function AwardsPage() {
  return (
    <PageShell
      index="04"
      kicker="Awards / live set"
      title="Competition setlist"
      description="The model, the result, and the part of the problem that made each competition worth remembering."
    >
      <div className="award-list">
        {awards.map((award, index) => (
          <article key={award.title} className="award-entry">
            <div className="award-number">{String(index + 1).padStart(2, "0")}</div>
            <div>
              <p className="entry-meta">{award.year}</p>
              <h2>{award.title}</h2>
              <p className="award-result">{award.result}</p>
            </div>
            <p className="award-detail">{award.detail}</p>
          </article>
        ))}
      </div>
    </PageShell>
  );
}

function GalleryPage() {
  return (
    <PageShell
      index="05"
      kicker="Gallery / contact sheet"
      title="Visual record"
      description="Project work, presentations, competitions, and the in-between moments that do not fit into a formal abstract."
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
                <span>{item.caption}</span>
              </figcaption>
            </figure>
          </a>
        ))}
      </div>
      <p className="gallery-credit">
        Image references: AniList / BanG Dream! It&apos;s MyGO!!!!! / Ave Mujica.
      </p>
    </PageShell>
  );
}

const visitorSessionKey = "yuyun-private-space-session";
const ownerSessionKey = "yuyun-owner-console-session";

function PersonalSpacePage() {
  const [inviteCode, setInviteCode] = useState("");
  const [sessionToken, setSessionToken] = useState(() => localStorage.getItem(visitorSessionKey) || "");
  const [content, setContent] = useState<PrivateSpaceContent | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(Boolean(sessionToken));
  const [isPosting, setIsPosting] = useState(false);
  const [messageSent, setMessageSent] = useState(false);

  useEffect(() => {
    if (!sessionToken || !isPrivateSpaceConfigured) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    loadPrivateSpace(sessionToken)
      .then((payload) => {
        setContent(payload);
        if (payload.visitor.is_owner) {
          localStorage.setItem(ownerSessionKey, sessionToken);
        } else {
          localStorage.removeItem(ownerSessionKey);
        }
        setError("");
      })
      .catch((requestError: Error) => {
        setContent(null);
        setError(requestError.message);
      })
      .finally(() => setIsLoading(false));
  }, [sessionToken]);

  const handleUnlock = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!inviteCode.trim()) return;
    setIsLoading(true);
    setError("");
    try {
      const visitor = await unlockPrivateSpace(inviteCode);
      localStorage.setItem(visitorSessionKey, visitor.session_token);
      setSessionToken(visitor.session_token);
      setInviteCode("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to unlock this space.");
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
      setError(requestError instanceof Error ? requestError.message : "Unable to leave this message.");
    } finally {
      setIsPosting(false);
    }
  };

  const handleVisitorLogout = () => {
    localStorage.removeItem(visitorSessionKey);
    localStorage.removeItem(ownerSessionKey);
    setSessionToken("");
    setContent(null);
    setMessage("");
    setMessageSent(false);
    setError("");
  };

  if (!content) {
    return (
      <section className="personal-space personal-space--locked">
        <div className="space-noise" aria-hidden="true" />
        <div className="space-lock">
          <p className="space-eyebrow">Private edition / no. 06</p>
          <div className="space-lock__symbol" aria-hidden="true">✦</div>
          <h1>After the<br /><em>last encore.</em></h1>
          <p className="space-lock__intro">
            Writing, photographs, film notes, and unfinished fragments shared with invited visitors.
          </p>
          <form className="space-unlock" onSubmit={handleUnlock}>
            <label htmlFor="invite-code">Your personal invitation</label>
            <div className="space-unlock__row">
              <input
                id="invite-code"
                type="password"
                value={inviteCode}
                onChange={(event) => setInviteCode(event.target.value)}
                placeholder="Enter invitation code"
                autoComplete="current-password"
                autoFocus
              />
              <button type="submit" disabled={!inviteCode.trim() || isLoading}>
                {isLoading ? "Checking..." : "Enter ↗"}
              </button>
            </div>
          </form>
          {!isPrivateSpaceConfigured && <p className="space-status">Private archive setup in progress.</p>}
          {error && <p className="space-error" role="alert">{error}</p>}
          <p className="space-footnote">Each invitation belongs to one visitor and may be paused without erasing its history.</p>
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
            <p className="space-eyebrow">Private edition / visitor {String(content.visitor.visitor_number).padStart(3, "0")}</p>
            <h1>Welcome after hours,<br /><em>{content.visitor.name}.</em></h1>
          </div>
          <div className="visitor-pass">
            <span>VISITOR PASS</span>
            <strong>#{String(content.visitor.visitor_number).padStart(3, "0")}</strong>
            <small>{content.visitor.visit_count} recorded visit{content.visitor.visit_count === 1 ? "" : "s"}</small>
            {content.visitor.is_owner && <a className="owner-console-link" href="#/admin">Manage visitors →</a>}
            <button className="space-signout" type="button" onClick={handleVisitorLogout}>Log out</button>
          </div>
        </header>

        <div className="private-archive">
          {content.entries.length === 0 && <p className="archive-empty">The first private entry is being prepared.</p>}
          {content.entries.map((entry) => (
            <article className={`archive-entry archive-entry--${entry.kind}`} key={entry.id}>
              {entry.image_url && <img src={entry.image_url} alt="" />}
              <div>
                <p>{entry.kind} {entry.event_date ? `· ${entry.event_date}` : ""}</p>
                <h2>{entry.title}</h2>
                <strong>{entry.excerpt}</strong>
                <div className="archive-entry__body">{entry.body}</div>
              </div>
            </article>
          ))}
        </div>

        <section className="guestbook">
          <div className="guestbook__intro">
            <p className="space-eyebrow">Guestbook / leave a trace</p>
            <h2>A note before<br />you leave.</h2>
            <p>Your visitor name is attached privately. Only Yuyun can read your note.</p>
          </div>
          <div>
            <form className="guestbook-form" onSubmit={handleMessage}>
              <textarea
                value={message}
                onChange={(event) => {
                  setMessage(event.target.value);
                  setMessageSent(false);
                }}
                placeholder="Write something here..."
                maxLength={500}
                rows={4}
              />
              <div><span>{message.length}/500</span><button disabled={isPosting || !message.trim()}>{isPosting ? "Posting..." : "Pin this note"}</button></div>
            </form>
            {messageSent && <p className="guestbook-success" role="status">Your note has been delivered to Yuyun.</p>}
            {error && <p className="space-error" role="alert">{error}</p>}
          </div>
        </section>
      </div>
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

function formatAdminDate(value: string | null) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function AdminPage() {
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
      localStorage.setItem(visitorSessionKey, identity.session_token);
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
      setError(requestError instanceof Error ? requestError.message : "The visitor could not be created.");
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
      setError("Copy failed. Select the invitation code and copy it manually.");
    }
  };

  const handleRefresh = async () => {
    if (!sessionToken) return;
    setBusyId("refresh");
    try {
      await refreshDashboard(sessionToken);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The dashboard could not be refreshed.");
    } finally {
      setBusyId("");
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem(ownerSessionKey);
    if (localStorage.getItem(visitorSessionKey) === sessionToken) {
      localStorage.removeItem(visitorSessionKey);
    }
    setSessionToken("");
    setDashboard(null);
    setCreatedCode("");
    setError("");
  };

  const handleVisitorStatus = async (visitorId: string, isActive: boolean) => {
    if (!sessionToken) return;
    setBusyId(visitorId);
    setError("");
    try {
      await setVisitorInviteStatus(sessionToken, visitorId, isActive);
      await refreshDashboard(sessionToken);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The visitor status could not be changed.");
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
      setError(requestError instanceof Error ? requestError.message : "The message status could not be changed.");
    } finally {
      setBusyId("");
    }
  };

  if (!dashboard) {
    return (
      <section className="admin-login">
        <div>
          <p className="kicker">Owner console / private access</p>
          <h1>Visitor<br />control room.</h1>
          <p>Use your owner invitation to manage visitors, activity, and guestbook moderation.</p>
          <form onSubmit={handleOwnerLogin}>
            <input
              type="password"
              value={ownerCode}
              onChange={(event) => setOwnerCode(event.target.value)}
              placeholder="Owner invitation code"
              autoFocus
            />
            <button type="submit" disabled={isLoading || !ownerCode.trim()}>{isLoading ? "Checking..." : "Open console"}</button>
          </form>
          {error && <p className="admin-error" role="alert">{error}</p>}
          <a href="#/space">← Back to personal space</a>
        </div>
      </section>
    );
  }

  return (
    <section className="admin-page">
      <div className="admin-page__inner">
        <header className="admin-header">
          <div>
            <p className="kicker">Owner console / {dashboard.owner_name}</p>
            <h1>Visitor control room</h1>
          </div>
          <div className="admin-header__actions">
            <button type="button" onClick={handleRefresh} disabled={busyId === "refresh"}>
              {busyId === "refresh" ? "Refreshing..." : "Refresh data"}
            </button>
            <button type="button" onClick={handleSignOut}>Sign out</button>
            <a href="#/space">Personal space →</a>
          </div>
        </header>

        <div className="admin-stats">
          <div><strong>{dashboard.stats.total_visitors}</strong><span>Total visitors</span></div>
          <div><strong>{dashboard.stats.active_visitors}</strong><span>Active access</span></div>
          <div><strong>{dashboard.stats.total_visits}</strong><span>Total unlocks</span></div>
          <div><strong>{dashboard.stats.total_messages}</strong><span>Messages</span></div>
        </div>

        {error && <p className="admin-error" role="alert">{error}</p>}

        <div className="admin-grid">
          <section className="admin-panel admin-panel--create">
            <div className="admin-panel__heading"><span>01</span><h2>Create visitor</h2></div>
            <form className="invite-form" onSubmit={handleCreateInvite}>
              <label>Visitor name<input value={visitorName} onChange={(event) => setVisitorName(event.target.value)} placeholder="e.g. Chen / close friend" /></label>
              <label>Invitation code <small>visitor name + 13 random characters</small><div className="invite-code-field"><input value={inviteCode} readOnly /><button type="button" onClick={() => setInviteSuffix(makeInviteSuffix())}>Generate</button></div></label>
              <label>Expires on <small>optional</small><input type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} /></label>
              <button className="admin-primary" disabled={busyId === "create" || !visitorName.trim() || inviteCode.trim().length < 10}>{busyId === "create" ? "Creating..." : "Create invitation"}</button>
            </form>
            {createdCode && (
              <div className="created-invite">
                <span>New invitation ready</span>
                <div><strong>{createdCode}</strong><button type="button" onClick={handleCopyInvite}>{copiedCode ? "Copied" : "Copy"}</button></div>
                <small>Send this code to the visitor. It cannot be recovered from the database later.</small>
              </div>
            )}
          </section>

          <section className="admin-panel admin-panel--visitors">
            <div className="admin-panel__heading"><span>02</span><h2>Visitor access</h2></div>
            <div className="visitor-table">
              {dashboard.invitations.length === 0 && <p className="admin-empty">No visitors yet.</p>}
              {dashboard.invitations.map((visitor) => (
                <article key={visitor.id}>
                  <div><strong>{visitor.label}</strong><span className={visitor.is_active ? "status-active" : "status-paused"}>{visitor.is_active ? "Active" : "Paused"}</span></div>
                  <dl><div><dt>Visits</dt><dd>{visitor.visit_count}</dd></div><div><dt>Last seen</dt><dd>{formatAdminDate(visitor.last_seen_at)}</dd></div><div><dt>Expires</dt><dd>{visitor.expires_at ? formatAdminDate(visitor.expires_at) : "No expiry"}</dd></div></dl>
                  <button disabled={busyId === visitor.id} onClick={() => handleVisitorStatus(visitor.id, !visitor.is_active)}>{visitor.is_active ? "Pause access" : "Restore access"}</button>
                </article>
              ))}
            </div>
          </section>

          <section className="admin-panel admin-panel--activity">
            <div className="admin-panel__heading"><span>03</span><h2>Recent activity</h2></div>
            <div className="activity-list">
              {dashboard.events.length === 0 && <p className="admin-empty">No activity yet.</p>}
              {dashboard.events.map((event) => <div key={event.id}><span>{event.event_type}</span><strong>{event.visitor_name}</strong><time>{formatAdminDate(event.created_at)}</time></div>)}
            </div>
          </section>

          <section className="admin-panel admin-panel--messages">
            <div className="admin-panel__heading"><span>04</span><h2>Guestbook moderation</h2></div>
            <div className="moderation-list">
              {dashboard.messages.length === 0 && <p className="admin-empty">No messages yet.</p>}
              {dashboard.messages.map((messageItem) => (
                <article key={messageItem.id} className={messageItem.status === "hidden" ? "is-hidden" : ""}>
                  <p>{messageItem.body}</p>
                  <footer><span><strong>{messageItem.visitor_name}</strong> · {formatAdminDate(messageItem.created_at)}</span><button disabled={busyId === messageItem.id} onClick={() => handleMessageStatus(messageItem.id, messageItem.status === "visible" ? "hidden" : "visible")}>{messageItem.status === "visible" ? "Hide" : "Show"}</button></footer>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="contact-footer">
      <div>
        <p className="kicker">Backstage pass / contact</p>
        <h2>Let&apos;s connect.</h2>
        <p>
          Based in {profile.location}, currently looking for internships in AI
          product management or algorithm engineering.
        </p>
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
        return <ProjectsPage />;
      case "publications":
        return <PublicationsPage />;
      case "notes":
        return <TechnicalNotesPage />;
      case "awards":
        return <AwardsPage />;
      case "gallery":
        return <GalleryPage />;
      case "space":
        return <PersonalSpacePage />;
      case "admin":
        return <AdminPage />;
      default:
        return <HomePage setPage={setCurrentPage} />;
    }
  }, [currentPage]);

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
      <span>{page.label}</span>
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
            <small>陈彧赟 / research log</small>
          </a>
          <button
            className="nav-toggle"
            type="button"
            aria-label={isMenuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={isMenuOpen}
            aria-controls="primary-navigation"
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>
            <div className="nav-links">{navigationItems}</div>
            <span className="volume-mark">VOL. 01</span>
          </nav>
        </header>
        {pageContent}
        {currentPage === "home" && <Footer />}
      </main>
      {isMenuOpen && createPortal(
        <div className="mobile-nav-layer">
          <button
            className="nav-backdrop is-open"
            type="button"
            aria-label="Close navigation"
            onClick={() => setIsMenuOpen(false)}
          />
          <div id="primary-navigation" className="nav-links nav-links--mobile is-open">
            <div className="nav-drawer-heading">
              <span>Contents</span>
              <button type="button" aria-label="Close navigation" onClick={() => setIsMenuOpen(false)}>×</button>
            </div>
            {navigationItems}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
