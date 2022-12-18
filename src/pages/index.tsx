import * as React from "react";
import { Helmet } from "react-helmet";
import {
  GithubIcon,
  LinkedInIcon,
  EmailIcon,
  ResumeIcon,
  PlayIcon,
  SiteIcon,
} from "../components/icons";
import "../styles/global.css";
import { StaticImage } from "gatsby-plugin-image";
import { RustPill, WasmPill } from "../components/pill";

const Project = ({
  title,
  description,
  links,
  img,
  pills = [],
}: {
  title: string;
  description: string;
  links: { url: string; text: string; icon: React.ReactNode }[];
  img: React.ReactNode;
  pills?: React.ReactElement[];
}) => {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-row flex-wrap gap-2 items-baseline">
        <h3 className="text-3xl text-white tracking-wider">{title}</h3>
        {pills.map((pill, i) => React.cloneElement(pill, { key: i }))}
      </div>
      {links && (
        <div className="flex flex-row flex-wrap gap-x-4 gap-y-2">
          {links.map((link, index) => (
            <a
              key={index}
              className="flex flex-row gap-1 items-center text-blue-300 hover:text-blue-200"
              href={link.url}
            >
              <span className="h-5 w-5 inline-block">{link.icon}</span>
              <span className="text-lg">{link.text}</span>
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
    <main className="bg-slate-900 min-h-screen">
      <Helmet>
        <title lang="en">Grant Gurvis</title>
        <meta charSet="utf-8" />
        <meta name="description" content="Grant Gurvis" lang="en" />
        <html lang="en" />
      </Helmet>

      <div className="flex flex-col gap-4 max-w-2xl px-1 sm:px-2 mx-auto m-10">
        <div className="flex flex-col items-center px-4 pt-8 pb-4 gap-4">
          <h1 className="text-white text-5xl font-bold">Grant Gurvis</h1>

          <p className="text-white text-xl font-light text-center max-w-xl">
            Interested in Rust 🦀 and more. Working at{" "}
            <a href="https://fig.io" className="underline">
              ◧ Fig
            </a>
            .
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
            // {
            //   text: "Resume",
            //   url: "https://github.com/grant0417/Resume/raw/master/grant_resume.pdf",
            //   logo: <ResumeIcon />,
            // },
          ].map((link, index) => (
            <a
              key={index}
              className="text-white hover:text-blue-200 text-lg flex flex-row items-baseline align-middle gap-1"
              href={link.url}
            >
              {link.logo && (
                <span className="h-5 w-5 inline-block">{link.logo}</span>
              )}
              {link.text}
            </a>
          ))}
        </div>

        <hr />

        <section
          id="programming-projects"
          className="flex flex-col space-y-8 pb-4 pt-5"
        >
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
              <StaticImage
                src="../images/cornell.png"
                placeholder="blurred"
                alt="Ray Tracer Image"
              />
            }
            pills={[<RustPill />, <WasmPill />]}
          />

          {/* <Project
            title="Bullit"
            description="A Reddit/Hacker News like site that supports permissioned
            users, posts, comments, votes, and more. Built using React, NodeJs,
            Typescript, and PostgreSQL."
            links={[
              {
                text: "Github",
                url: "https://github.com/grant0417/bullit",
                icon: <GithubIcon />,
              },
              {
                text: "Bullit",
                url: "https://bullit.org",
                icon: <SiteIcon />,
              },
            ]}
            img={
              <StaticImage
                src="../images/bullit.png"
                placeholder="blurred"
                alt="Bullit Image"
              />
            }
            pills={[<TypescriptPill />, <ReactPill />, <PostgresPill />]}
          /> */}

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
              <StaticImage
                src="../images/chess.png"
                placeholder="blurred"
                alt="Chess AI Image"
              />
            }
            pills={[<RustPill />]}
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
            img={
              <StaticImage
                src="../images/6502.png"
                placeholder="blurred"
                alt="6502 Image"
              />
            }
            pills={[<RustPill />]}
          />

          {/* <div className="grid grid-cols-none sm:grid-cols-2 gap-2">
            <Project
              title="Term"
              description="A terminal built with a Rust backend and a React frontend
              using Tauri. Supports UTF8, 256 colors, resizing, among other 
              terminal features."
              links={[
                {
                  text: "Github",
                  url: "https://github.com/grant0417/term",
                  icon: <GithubIcon />,
                },
              ]}
              pills={[<RustPill />, <ReactPill />]}
            />

            <Project
              title="Rocket Payload"
              description="Led a team in designing a payload for a sounding rocket
              to got to 30,000' in the IREC competition. Never fully realized due
              to the competition being canceled in 2020."
              links={[
                {
                  text: "Github",
                  url: "https://github.com/usfsoar/irec-avionics-payload-pcb",
                  icon: <GithubIcon />,
                },
              ]}
              pills={[<KicadPill />]}
            />

            <Project
              title="Crypto Algorithms"
              description="Several cryptographic algorithms implemented in Rust to
              learn more about cryptography. Includes AES, RSA, DH, Mersenne Twister, etc."
              links={[
                {
                  text: "Github",
                  url: "https://github.com/grant0417/crypto",
                  icon: <GithubIcon />,
                },
              ]}
              pills={[<RustPill />]}
            />

            <Project
              title="Neural Net"
              description="A neural network built from scratch in Rust that can
              classify the MNIST dataset. The network can be trained to classify
              handwritten digits and can be used to classify images with 98% accuracy."
              links={[
                {
                  text: "Github",
                  url: "https://github.com/grant0417/neural_net",
                  icon: <GithubIcon />,
                },
              ]}
              pills={[<RustPill />]}
            />
          </div> */}
        </section>
      </div>
    </main>
  );
};

export default IndexPage;
