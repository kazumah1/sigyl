import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const highlightLines = [
  "Everything that others charged for will be free and better with SIGYL.",
  "SIGYL is a always free, open source MCP development platform aimed at creating the largest and highest quality registry of MCPs meant to complete any task.",
  "We will build security, run hosting, and allow easy editing, so that developers can have the best platform."
];

const ScrollHighlightSection: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(".highlight").forEach((el) => {
        ScrollTrigger.create({
          trigger: el,
          start: "top 80%",
          end: "bottom 50%",
          onEnter: () => {
            el.style.backgroundSize = "100% 100%";
          },
          onLeaveBack: () => {
            el.style.backgroundSize = "0% 100%";
          }
        });
      });
      gsap.timeline({
        scrollTrigger: {
          trigger: ".scroll-lock",
          start: "top top",
          end: "+=300%",
          scrub: true,
          pin: true,
        }
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={sectionRef} className="w-full">
      {/* Hero headline section */}
      <section className="hero flex items-center justify-center min-h-[60vh] bg-black">
        <h1 className="headline text-white text-center font-extrabold text-5xl sm:text-7xl md:text-8xl tracking-tight" style={{fontFamily:'Space Grotesk, Inter, system-ui, sans-serif'}}>The Future Is Written In Code</h1>
      </section>

      {/* Scroll-locked highlight section */}
      <section className="scroll-lock relative px-4 py-[200vh] bg-black">
        <div className="text-container max-w-3xl mx-auto">
          {highlightLines.map((line, i) => (
            <p key={i} className="my-16 text-2xl md:text-3xl lg:text-4xl font-semibold">
              <span className="highlight">{line}</span>
            </p>
          ))}
        </div>
      </section>

      {/* Giant animated text section */}
      <section className="giant-text h-screen flex items-center justify-center bg-[#222]">
        <h1 className="blast font-black tracking-tight">CAPTIVATE</h1>
      </section>

      {/* Custom CSS for highlight and blast */}
      <style>{`
        .highlight {
          background-image: linear-gradient(to right, #00FFB2, #00cfff);
          background-repeat: no-repeat;
          background-size: 0% 100%;
          transition: background-size 1s cubic-bezier(.4,2,.6,1);
          background-position: left;
          padding: 0.2em 0.1em;
          border-radius: 0.18em;
          box-decoration-break: clone;
          -webkit-box-decoration-break: clone;
        }
        .giant-text {
          height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          background: #222;
        }
        .blast {
          font-size: 12vw;
          font-weight: 900;
          letter-spacing: -0.02em;
          background: linear-gradient(to right, #00FFB2, #00cfff);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .scroll-lock {
          position: relative;
          padding: 200vh 2rem;
          background-color: #000;
        }
        .text-container p {
          font-size: 2rem;
          margin: 4rem 0;
          position: relative;
          overflow: hidden;
        }
        @media (max-width: 640px) {
          .blast { font-size: 2.5rem; }
          .text-container p { font-size: 1.2rem; }
        }
      `}</style>
    </div>
  );
};

export default ScrollHighlightSection; 