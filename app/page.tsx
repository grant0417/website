import { GithubIcon, PlayIcon } from "@/app/components/icons";
import { RustPill, WasmPill } from "@/app/components/pill";
import Image from "next/image";
import cornellImg from "../public/images/cornell.png";
import chessImg from "../public/images/chess.png";
import sixFiveZeroTwoImg from "../public/images/6502.png";
import Project from "./components/project";
import Divider from "./components/divider";
import { ServerRuntime } from "next";

export const runtime: ServerRuntime = "edge";

export default function Home() {
  return (
    <main>
      <div className="flex flex-col gap-4 max-w-2xl px-1 sm:px-2 mx-auto m-10">
        <div className="flex flex-col items-center px-4 pt-8 pb-4 gap-4">
          <h1 className="text-white text-5xl font-bold">Grant Gurvis</h1>

          <p className="text-white text-xl font-light text-center max-w-xl">
            Interested in Rust 🦀 and more — Working at{" "}
            <a href="https://fig.io" className="underline underline-offset-4">
              ◧ Fig
            </a>
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
              {link.logo && `${link.logo} `}
              {link.text}
            </a>
          ))}
        </div>

        <Divider />

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
              <Image
                src={cornellImg}
                alt="Ray Tracer Image"
                placeholder="blur"
              />
            }
            pills={[<RustPill key={0} />, <WasmPill key={1} />]}
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
              <Image src={chessImg} alt="Chess AI Image" placeholder="blur" />
            }
            pills={[<RustPill key={0} />]}
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
              <Image
                src={sixFiveZeroTwoImg}
                alt="6502 Image"
                placeholder="blur"
              />
            }
            pills={[<RustPill key={0} />]}
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
}
