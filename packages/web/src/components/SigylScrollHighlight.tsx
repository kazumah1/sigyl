import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useNavigate } from "react-router-dom";

gsap.registerPlugin(ScrollTrigger);

const HEADLINE = "What others charged for will be free and better with SIGYL.";
const SUBTEXT1 = "SIGYL is an always free MCP development platform aimed at creating the largest and highest quality registry of MCPs so agents have universal application accesibility.";

const SigylScrollHighlight: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLSpanElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (highlightRef.current) {
        gsap.set(highlightRef.current, { backgroundSize: "0% 100%" });
        gsap.to(highlightRef.current, {
          backgroundSize: "100% 100%",
          ease: "power2.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 60%",
            end: "top 20%",
            scrub: true,
          },
        });
      }
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top top",
        end: "+=120%",
        pin: true,
        pinSpacing: true,
        scrub: false,
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="relative flex flex-col items-center justify-center min-h-[100vh] py-20 bg-black w-full overflow-hidden">
      <div className="w-full max-w-6xl px-4 text-center">
        <h1 className="font-extrabold leading-tight mb-16 text-white text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl" style={{fontFamily:'Space Grotesk, Inter, system-ui, sans-serif'}}>
          <span
            ref={highlightRef}
            className="sigyl-highlight"
            style={{
              color: "white",
              background: "none",
              padding: 0,
              borderRadius: 0,
              boxDecorationBreak: "clone",
              WebkitBoxDecorationBreak: "clone",
              display: "inline-block",
            }}
          >
            {HEADLINE}
          </span>
        </h1>
        <div className="mt-0 text-base sm:text-lg md:text-xl lg:text-2xl text-white max-w-4xl mx-auto" style={{lineHeight:1.5}}>
          <div>{SUBTEXT1}</div>
        </div>
        <button
          onClick={() => navigate('/contact')}
          className="mt-10 px-8 py-4 rounded-xl bg-white text-black font-bold text-xl shadow-lg hover:bg-gray-200 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white"
          style={{fontFamily:'Space Grotesk, Inter, system-ui, sans-serif', letterSpacing:'-0.01em'}}
        >
          Suggest features
        </button>
      </div>
      <style>{`
        .sigyl-highlight {
          color: white !important;
          background: none !important;
          padding: 0 !important;
          border-radius: 0 !important;
          box-decoration-break: clone;
          -webkit-box-decoration-break: clone;
          display: inline-block;
        }
      `}</style>
    </section>
  );
};

export default SigylScrollHighlight; 