import { createFileRoute } from "@tanstack/react-router";
import Project from "@/components/project";
import Divider from "@/components/divider";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({ meta: [{ title: "Grant Gurvis" }] }),
});

function Section({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <section
      className="flex flex-col space-y-8 pb-4 pt-5"
      id={title.toLowerCase()}
    >
      <h2 className="text-white text-3xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Home() {
  return (
    <main>
      <div className="flex flex-col gap-4 max-w-2xl px-1 sm:px-2 mx-auto m-10">
        <div className="flex flex-col items-center px-4 pt-8 pb-4 gap-4">
          <h1 className="text-white text-5xl font-bold">Grant Gurvis</h1>

          <p className="text-white text-xl font-light text-center max-w-xl">
            Interested in Rust 🦀 and more
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 place-items-center gap-4 px-4 pb-4">
          {[
            {
              text: "GitHub",
              url: "https://github.com/grant0417",
              logo: "🧑🏻‍💻",
            },
            {
              text: "Twitter",
              url: "https://twitter.com/gurgrant",
              logo: "🐦",
            },
            {
              text: "LinkedIn",
              url: "https://www.linkedin.com/in/grant-gurvis/",
              logo: "💼",
            },
            {
              text: "Email",
              url: "mailto:grant@gurvis.net",
              logo: "✉️",
            },
          ].map((link, index) => (
            <a
              key={index}
              className="text-white hover:text-blue-200 text-lg flex flex-row items-baseline align-middle gap-1"
              href={link.url}
            >
              {link.logo && `${link.logo} `}
              {link.text}
            </a>
          ))}
        </div>
        <Divider />
        <Section title="Work">
          <Project
            title="Stealth Startup"
            date="2025-present"
            /* description=""
            links={[]} */
          />
          <Project
            title="Amazon Web Services"
            date="2023-2025"
            /* description=""
            links={[]} */
          />
          <Project
            title="Fig"
            date="2021-2023"
            /* description="Aquired by Amazon Web Services"
            links={[]} */
          />
        </Section>
        {/*         <Section title="Projects">
          <Project
            title="Ray Tracer"
            description="A path
          tracer that supports parallel execution, .obj loading, BVH
          acceleration with a command line interface that will support most file
          types for output as well as a WASM based site."
            links={[
              {
                text: "Github",
                url: "https://github.com/grant0417/ray_tracer",
                icon: <GithubIcon />,
              },
              {
                text: "Demo",
                url: "https://rust-ray-tracer.netlify.app/",
                icon: <PlayIcon />,
              },
            ]}
          />
          <Project
            title="Chess AI"
            description="A Chess AI
          that is still quite early in development, it can currently generate
          millions of moves per second to analyze."
            links={[
              {
                text: "Github",
                url: "https://github.com/grant0417/chess-ai",
                icon: <GithubIcon />,
              },
            ]}
          />
          <Project
            title="6502 Assembler and Emulator"
            description="The assembler compiles 6502 assembly into a binary for the emulator or 
            hex codes with debugging information. The emulator also supports all
            6502 opcodes and addressing modes while being cycle-accurate. The CPU
            is easily extended via memory maps."
            links={[
              {
                text: "Assembler GitHub",
                url: "https://github.com/grant0417/assembler6502",
                icon: <GithubIcon />,
              },
              {
                text: "Emulator GitHub",
                url: "https://github.com/grant0417/emu6502",
                icon: <GithubIcon />,
              },
            ]}
            pills={[<RustPill key={0} />]}
          />
        </Section> */}
      </div>
    </main>
  );
}
