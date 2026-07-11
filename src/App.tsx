import { useEffect, useMemo, useState } from "react";

const assetPath = (fileName: string) => `${import.meta.env.BASE_URL}${fileName}`;

type PageKey = "home" | "projects" | "publications" | "awards" | "gallery";

const profile = {
  name: "Yuyun Chen（陈彧赟）",
  role: "Research-minded developer · Undergraduate / Graduate candidate",
  location: "Guangzhou, China",
  email: "chensilu_0717@outlook.com",
  github: "https://github.com/chippyzhou",
  intro:
    "I work at the intersection of software engineering, data-driven systems, and applied research. This site collects my selected projects, academic output, competition results, and field notes for recruiting and academic review.",
  focus: ["Software Engineering", "AI Applications", "Human-Centered Systems"],
};

const metrics = [
  { value: "6+", label: "Selected projects" },
  { value: "3", label: "Competition awards" },
  { value: "3", label: "Publications / preprints" },
  { value: "2", label: "Research directions" },
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

const gallery = [
  {
    src: assetPath("gallery-projects.png"),
    title: "Project development",
    caption: "Workspace, prototypes, code, and product iterations.",
  },
  {
    src: assetPath("gallery-publications.png"),
    title: "Research presentation",
    caption: "Papers, charts, presentations, and publication milestones.",
  },
  {
    src: assetPath("gallery-awards.png"),
    title: "Competition record",
    caption: "Awards, demos, team milestones, and event documentation.",
  },
];

const pages: Array<{ key: PageKey; label: string }> = [
  { key: "home", label: "Home" },
  { key: "projects", label: "Projects" },
  { key: "publications", label: "Publications" },
  { key: "awards", label: "Awards" },
  { key: "gallery", label: "Gallery" },
];

function getPageFromHash(): PageKey {
  const raw = window.location.hash.replace(/^#\/?/, "");
  return pages.some((page) => page.key === raw) ? (raw as PageKey) : "home";
}

function PageShell({
  kicker,
  title,
  description,
  children,
  dark = false,
}: {
  kicker: string;
  title: string;
  description: string;
  children: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <section
      className={`min-h-[calc(100vh-72px)] px-5 py-12 md:py-16 ${
        dark ? "bg-[#151515] text-white" : "bg-[#f6f7f4] text-[#151515]"
      }`}
    >
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-4 md:grid-cols-[0.8fr_1.2fr] md:items-end">
          <div>
            <p
              className={`text-sm font-semibold uppercase tracking-[0.18em] ${
                dark ? "text-[#83d7ce]" : "text-[#0e7c75]"
              }`}
            >
              {kicker}
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
              {title}
            </h1>
          </div>
          <p
            className={`max-w-2xl text-base leading-7 md:justify-self-end ${
              dark ? "text-white/68" : "text-black/62"
            }`}
          >
            {description}
          </p>
        </div>
        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}

function HomePage({ setPage }: { setPage: (page: PageKey) => void }) {
  return (
    <>
      <section className="mx-auto grid min-h-[calc(100vh-72px)] max-w-6xl gap-10 px-5 py-12 md:grid-cols-[1.05fr_0.95fr] md:items-center md:py-16">
        <div className="space-y-8">
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0e7c75]">
              {profile.role}
            </p>
            <h1 className="max-w-3xl text-5xl font-semibold leading-[1.02] sm:text-6xl lg:text-7xl">
              Developer and researcher building useful systems.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-black/68">
              {profile.intro}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="#/projects"
              onClick={() => setPage("projects")}
              className="rounded-[8px] bg-[#0e7c75] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#095f5a]"
            >
              View projects
            </a>
            <a
              href="#/publications"
              onClick={() => setPage("publications")}
              className="rounded-[8px] border border-black/20 px-5 py-3 text-sm font-semibold transition hover:border-black/50"
            >
              Academic output
            </a>
          </div>

          <dl className="grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
            {metrics.map((item) => (
              <div key={item.label} className="border-l border-black/18 py-2 pl-4">
                <dt className="text-3xl font-semibold">{item.value}</dt>
                <dd className="mt-1 text-xs uppercase tracking-[0.14em] text-black/52">
                  {item.label}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative">
          <img
            src={assetPath("portfolio-hero.png")}
            alt="Academic workspace with laptop, notes, and research material"
            className="aspect-[4/5] w-full rounded-[8px] object-cover shadow-2xl shadow-black/20"
          />
          <div className="absolute -bottom-5 left-5 right-5 rounded-[8px] border border-white/70 bg-white/90 p-4 shadow-xl backdrop-blur">
            <p className="text-sm font-semibold">Current focus</p>
            <p className="mt-1 text-sm leading-6 text-black/62">
              {profile.focus.join(" / ")}
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-black/10 bg-white px-5 py-12 md:py-16">
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-[0.78fr_1.22fr] md:gap-12">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0e7c75]">
              About
            </p>
            <h2 className="mt-3 max-w-md text-3xl font-semibold sm:text-4xl">
              Engineering practice with research judgment.
            </h2>
          </div>
          <div>
            <div className="space-y-4">
              <p className="text-lg leading-8 text-black/70">
                I am preparing for roles and academic opportunities where
                engineering practice and research judgment both matter. My work
                emphasizes clear problem framing, reproducible implementation,
                and readable communication.
              </p>
              <p className="text-base leading-7 text-black/60">
                My academic interests are grounded in implementation: I care
                about systems that can be tested, explained, and transferred
                into real use. I also document process clearly so collaborators
                can review decisions instead of guessing from final code.
              </p>
            </div>

          </div>
        </div>
      </section>
    </>
  );
}

function ProjectsPage() {
  return (
    <PageShell
      kicker="Projects"
      title="Selected technical work"
      description="Each project highlights a public link, a short technical summary, and the strongest evidence of implementation ability."
    >
      <div className="grid gap-4 md:grid-cols-3">
        {projects.map((project) => (
          <article
            key={project.title}
            className="rounded-[8px] border border-black/10 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#b2542f]">
                {project.type}
              </p>
              <p className="text-sm text-black/45">{project.period}</p>
            </div>
            <h2 className="mt-4 text-xl font-semibold">{project.title}</h2>
            <p className="mt-3 text-sm leading-7 text-black/62">
              {project.summary}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {project.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-[8px] border border-black/10 px-2.5 py-1 text-xs text-black/58"
                >
                  {tag}
                </span>
              ))}
            </div>
            <a
              href={project.link}
              className="mt-6 inline-flex text-sm font-semibold text-[#0e7c75]"
            >
              Project link
            </a>
          </article>
        ))}
      </div>
    </PageShell>
  );
}

function PublicationsPage() {
  return (
    <PageShell
      kicker="Publications"
      title="Academic output"
      description="Publications, preprints, posters, and technical reports are organized by venue, status, and contribution."
    >
      <div className="divide-y divide-black/10 rounded-[8px] border border-black/10 bg-white">
        {publications.map((paper) => (
          <article
            key={paper.title}
            className="grid gap-4 p-5 md:grid-cols-[1fr_0.28fr]"
          >
            <div>
              <p className="text-sm font-semibold text-[#b2542f]">
                {paper.venue}
              </p>
              <h2 className="mt-2 text-xl font-semibold">{paper.title}</h2>
              <p className="mt-3 text-sm leading-7 text-black/62">
                {paper.summary}
              </p>
            </div>
            <div className="flex items-start justify-between gap-4 md:block md:text-right">
              <p className="text-sm text-black/45">{paper.status}</p>
              <a
                href={paper.link}
                className="text-sm font-semibold text-[#0e7c75] md:mt-5 md:inline-flex"
              >
                Read
              </a>
            </div>
          </article>
        ))}
      </div>
    </PageShell>
  );
}

function AwardsPage() {
  return (
    <PageShell
      kicker="Awards"
      title="Competition and honors"
      description="Competition records emphasize level, ranking, personal role, and the delivered result."
    >
      <div className="grid gap-4">
        {awards.map((award) => (
          <article
            key={award.title}
            className="grid gap-4 rounded-[8px] border border-black/10 bg-white p-5 md:grid-cols-[0.18fr_0.3fr_1fr]"
          >
            <p className="text-lg font-semibold text-[#0e7c75]">{award.year}</p>
            <div>
              <h2 className="font-semibold">{award.title}</h2>
              <p className="mt-1 text-sm font-semibold text-[#b2542f]">
                {award.result}
              </p>
            </div>
            <p className="text-sm leading-7 text-black/62 [&_strong]:font-semibold [&_strong]:text-[#151515]">
              {award.detail}
            </p>
          </article>
        ))}
      </div>
    </PageShell>
  );
}

function GalleryPage() {
  return (
    <PageShell
      kicker="Gallery"
      title="Visual record"
      description="A compact record of project work, research presentations, competition moments, and academic milestones."
    >
      <div className="grid gap-4 md:grid-cols-3">
        {gallery.map((item) => (
          <figure
            key={item.title}
            className="overflow-hidden rounded-[8px] border border-black/10 bg-white"
          >
            <img
              src={item.src}
              alt={item.title}
              className="aspect-[4/3] w-full object-cover"
            />
            <figcaption className="p-4">
              <p className="font-semibold">{item.title}</p>
              <p className="mt-1 text-sm leading-6 text-black/58">
                {item.caption}
              </p>
            </figcaption>
          </figure>
        ))}
      </div>
    </PageShell>
  );
}

function Footer() {
  return (
    <footer className="px-5 py-12">
      <div className="mx-auto grid max-w-6xl gap-6 rounded-[8px] bg-[#0e7c75] p-6 text-white md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-white/68">
            Contact
          </p>
          <h2 className="mt-2 text-3xl font-semibold">
            Let&apos;s connect.
          </h2>
          <p className="mt-3 text-sm leading-7 text-white/72">
            Based in {profile.location}, I am currently looking for internship
            opportunities in AI product management or algorithm engineering.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
          <a
            href={`mailto:${profile.email}`}
            className="max-w-full break-all rounded-[8px] bg-white px-5 py-3 text-center text-sm font-semibold text-[#0e7c75]"
          >
            {profile.email}
          </a>
          <a
            href={profile.github}
            target="_blank"
            rel="noreferrer"
            className="rounded-[8px] border border-white/45 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-white/10"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageKey>(() => getPageFromHash());

  useEffect(() => {
    const onHashChange = () => setCurrentPage(getPageFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const pageContent = useMemo(() => {
    switch (currentPage) {
      case "projects":
        return <ProjectsPage />;
      case "publications":
        return <PublicationsPage />;
      case "awards":
        return <AwardsPage />;
      case "gallery":
        return <GalleryPage />;
      default:
        return <HomePage setPage={setCurrentPage} />;
    }
  }, [currentPage]);

  return (
    <main className="min-h-screen bg-[#f6f7f4] text-[#151515]">
      <header className="sticky top-0 z-20 border-b border-black/10 bg-[#f6f7f4]/92 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <a
            href="#/"
            onClick={() => setCurrentPage("home")}
            className="text-sm font-semibold"
          >
            {profile.name}
          </a>
          <div className="flex flex-wrap items-center gap-2 text-sm text-black/70 md:justify-end">
            {pages.map((page) => (
              <a
                key={page.key}
                href={page.key === "home" ? "#/" : `#/${page.key}`}
                onClick={() => setCurrentPage(page.key)}
                aria-current={currentPage === page.key ? "page" : undefined}
                className={`rounded-[8px] px-3 py-2 transition ${
                  currentPage === page.key
                    ? "bg-[#151515] text-white"
                    : "hover:bg-black/6 hover:text-black"
                }`}
              >
                {page.label}
              </a>
            ))}
          </div>
        </nav>
      </header>

      {pageContent}
      {currentPage === "home" && <Footer />}
    </main>
  );
}
