import * as React from "react";
import { Helmet } from "react-helmet";
import {
  GithubIcon,
  LinkedInIcon,
  EmailIcon,
  ResumeIcon,
  PlayIcon,
} from "../components/icons";
import "../styles/global.css";
import { StaticImage } from "gatsby-plugin-image";

const Project = ({ title, description, links, img }) => {
  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-2xl text-white tracking-wider">{title}</h3>
      {links && (
        <div className="flex flex-row flex-wrap gap-x-4 gap-y-2">
          {links.map((link, index) => (
            <a
              key={index}
              className="flex flex-row gap-1 items-center text-blue-400 hover:text-blue-300"
              href={link.url}
            >
              <span className="h-5 w-5 inline-block">{link.icon}</span>
              <span className="font-mono text-lg leading-none">{link.text}</span>
            </a>
          ))}
        </div>
      )}
      {img && img}

      <p className="text-white">{description}</p>
    </div>
  );
};

const IndexPage = () => {
  return (
    <main className="bg-gray-900 min-h-screen">
      <Helmet title="Grant Gurvis" />

      <div className="flex flex-col gap-4 max-w-2xl px-2 mx-auto">
        <div className="flex flex-col items-center px-4 py-8 gap-4">
          <h1 className="text-white text-5xl font-bold">Grant Gurvis</h1>

          <p className="text-white text-xl font-light text-center max-w-xl">
            A Computer Science student at the University of South Florida
            interested in Computer Science, Electronics, and Math.
          </p>
        </div>

        <hr />

        <section id="programming-projects" className="flex flex-col gap-4 pb-4">
          <h2 className="text-white text-3xl font-bold">
            Programming Projects
          </h2>

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
            img={
              <StaticImage src="../images/chess.png" placeholder="blurred" />
            }
          />

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
            img={
              <StaticImage src="../images/cornell.jpg" placeholder="blurred" />
            }
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
            img={<StaticImage src="../images/6502.jpg" placeholder="blurred" />}
          />
        </section>

        <hr id="links" />

        <h1 className="text-white text-3xl font-bold">{"Links & Contact"}</h1>

        <div className="flex flex-row flex-wrap justify-around gap-4 px-4 pb-12">
          {[
            {
              text: "GitHub",
              url: "https://github.com/grant0417",
              logo: <GithubIcon />,
            },
            {
              text: "LinkedIn",
              url: "https://www.linkedin.com/in/grant-gurvis/",
              logo: <LinkedInIcon />,
            },
            {
              text: "Email",
              url: "mailto:grant@ggurvis.com",
              logo: <EmailIcon />,
            },
            {
              text: "Resume",
              url: "https://github.com/grant0417/Resume/raw/master/grant_resume.pdf",
              logo: <ResumeIcon />,
            },
          ].map((link, index) => (
            <a
              key={index}
              className="text-white text-lg underline flex flex-row items-center gap-1"
              href={link.url}
            >
              {link.logo && (
                <span className="h-5 w-5 inline-block text-white">
                  {link.logo}
                </span>
              )}
              {link.text}
            </a>
          ))}
        </div>
      </div>
    </main>
  );
};

export default IndexPage;