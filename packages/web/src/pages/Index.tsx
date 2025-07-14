import React from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Shield, Zap, Globe } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { HeroSection } from "@/components/HeroSection";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const Index = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Modern security best practices help protect your MCP integrations."
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Deploy in minutes with our optimized infrastructure and global edge network."
    },
    {
      icon: Globe,
      title: "Global Scale",
      description: "99.9% uptime with automatic scaling across multiple regions worldwide."
    }
  ];

  const faqs = [
    {
      question: "What is Model Context Protocol (MCP)?",
      answer: "MCP is a standardized protocol that enables AI applications to securely connect to external data sources and tools, providing richer context for better AI interactions."
    },
    {
      question: "How quickly can I deploy my first MCP server?",
      answer: "With SIGYL's streamlined deployment process, you can have your first MCP server running in under 2 minutes. Our automated setup handles all the complexity."
    },
    {
      question: "What integrations are available?",
      answer: "We offer 9000+ pre-built integrations including databases, CRM systems, APIs, and popular tools. Custom integrations can be built using our SDK."
    },
    {
      question: "How does pricing work?",
      answer: "Our pricing scales with your usage. Start free with generous limits, then pay only for what you use as you grow. Enterprise plans available for larger deployments."
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <PageHeader />
      <HeroSection
        title="deploying servers for the world of AI agents."
        subtitle="open source, free, and enterprise quality MCP community"
        buttons={
          <>
            <Button 
              size="lg" 
              onClick={() => navigate('/deploy')}
              className="w-full sm:w-auto bg-white text-black border border-white rounded-md px-6 sm:px-8 py-3 sm:py-4 text-lg font-semibold hover:bg-neutral-900 hover:border-neutral-900 hover:text-white transition-colors min-h-[48px] touch-manipulation font-[500]" 
              style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif', fontSize: '1.08rem' }}
            >
              Get Started Free
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              onClick={() => navigate('/registry')}
              style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif', fontSize: '1.08rem' }}
              className="w-full sm:w-auto bg-black/60 text-white border border-white rounded-md px-6 sm:px-8 py-3 sm:py-4 text-lg font-semibold hover:bg-neutral-900 hover:border-neutral-900 hover:text-white transition-colors min-h-[48px] touch-manipulation font-[500]"
            >
              Registry
            </Button>
          </>
        }
      />
      {/* Liquid Glass Blobs */}
      <div className="liquid-glass-blob blob-1" />
      <div className="liquid-glass-blob blob-2" />
      <div className="liquid-glass-blob blob-3" />
      {/* Dashboard Preview - Enhanced Mobile Responsiveness */}
      <section className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6 relative z-10">
        <div className="container mx-auto text-center">
          {/* Painterly wrapper with @Test_5.png background - now clearly visible */}
          <div className="dashboard-painterly-wrapper relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col items-center" style={{background: 'rgba(0,0,0,0.10)'}}>
            <img src="/Test_5.png" alt="Painterly Background" className="absolute inset-0 w-full h-full object-cover z-0" style={{borderRadius:'1rem sm:1.5rem', opacity:1, filter:'blur(1px) brightness(0.85)'}} />
            {/* SIGYL Dashboard Panel - Mobile Optimized */}
            <div className="liquid-glass-dashboard enhanced-glass-panel rounded-2xl sm:rounded-3xl overflow-hidden border border-white/20 shadow-2xl relative mx-auto my-8 sm:my-12" style={{maxWidth:'700px', boxShadow:'0 12px 48px 0 rgba(0,0,0,0.38)', border:'1.5px solid rgba(255,255,255,0.22)', backdropFilter:'blur(18px) saturate(180%)', WebkitBackdropFilter:'blur(18px) saturate(180%)', background:'rgba(30,32,40,0.72)', padding:'0'}}>
              <div className="liquid-glass-highlight absolute top-0 left-0 w-full h-6 sm:h-8 z-10" style={{opacity:0.85}} />
              <div className="flex items-center space-x-2 p-3 sm:p-5 rounded-t-2xl sm:rounded-t-3xl" style={{background:'rgba(30,32,40,0.92)', borderBottom:'1px solid rgba(255,255,255,0.10)'}}>
                <div className="w-2.5 sm:w-3 h-2.5 sm:h-3 bg-red-500 rounded-full"></div>
                <div className="w-2.5 sm:w-3 h-2.5 sm:h-3 bg-yellow-400 rounded-full"></div>
                <div className="w-2.5 sm:w-3 h-2.5 sm:h-3 bg-green-500 rounded-full"></div>
                <span className="text-gray-200 text-sm sm:text-base ml-2 sm:ml-4 font-semibold tracking-wide">SIGYL Dashboard</span>
              </div>
              <div className="p-6 sm:p-8 lg:p-12 space-y-6 sm:space-y-8 flex flex-col items-center justify-center text-center" style={{background:'transparent', borderRadius:'0 0 1rem 1rem sm:0 0 1.5rem 1.5rem'}}>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-4 tracking-tight">MCP Server Status</h3>
                <div className="space-y-3 sm:space-y-5 w-full flex flex-col items-center">
                  <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-3 justify-center">
                    <div className="w-3 h-3 bg-green-400 rounded-full shadow-md"></div>
                    <span className="text-green-400 font-semibold text-base sm:text-lg text-center">E-commerce Integration deployed successfully</span>
                  </div>
                  <div className="text-blue-400 text-sm sm:text-base font-medium text-center">Handling 1.2K requests/min across 12 endpoints</div>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-between text-xs sm:text-sm text-gray-400 w-full mt-2 space-y-2 sm:space-y-0">
                  <span className="text-center sm:text-left">Last updated: 2 seconds ago</span>
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Features Section - Enhanced Mobile Layout */}
      <section className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="features-tab-bg relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-white/10 mx-auto" style={{background: 'rgba(255,255,255,0.10)'}}>
            <img src="/Test_3.png" alt="Features Tab Background" className="absolute inset-0 w-full h-full object-cover z-0" style={{borderRadius:'1rem sm:1.5rem', opacity:0.92}} />
            <div className="relative z-10 p-6 sm:p-8 lg:p-12">
              <div className="text-center mb-12 sm:mb-16">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 text-white drop-shadow-lg">Built for scale, designed for speed</h2>
                <p className="text-lg sm:text-xl text-white max-w-2xl mx-auto drop-shadow" style={{opacity:0.98}}>Everything you need to deploy, manage, and scale your MCP integrations.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
                {features.map((feature, index) => (
                  <div key={index} className="card-modern hover-lift touch-manipulation">
                    <feature.icon className="w-8 sm:w-10 h-8 sm:h-10 text-white mb-4 sm:mb-6" />
                    <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 tracking-tight leading-snug">{feature.title}</h3>
                    <p className="text-base sm:text-lg text-gray-300 leading-relaxed mb-2">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Stats Section - Mobile Optimized */}
      <section className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col items-center" style={{width:'100%', minHeight:'480px', paddingTop:'3.5rem', paddingBottom:'2.5rem', background:'rgba(255,255,255,0.10)'}}>
            <img src="/Test_4.png" alt="Stats Tab Background" className="absolute inset-0 w-full h-full object-cover z-0" style={{borderRadius:'1rem sm:1.5rem', opacity:0.92}} />
            <div className="relative z-10 w-full flex flex-col items-center px-4">
              <div className="text-center mb-6 sm:mb-8 w-full">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white drop-shadow-lg">Enterprise Grade</h2>
              </div>
              <div className="liquid-glass-stats rounded-2xl sm:rounded-3xl shadow-2xl border border-white/20 mx-auto w-full mt-4" style={{maxWidth:'900px', background:'rgba(30,32,40,0.72)', backdropFilter:'blur(18px) saturate(180%)', WebkitBackdropFilter:'blur(18px) saturate(180%)'}}>
                <div className="flex items-center space-x-2 p-3 sm:p-4 rounded-t-2xl sm:rounded-t-3xl" style={{background:'rgba(30,32,40,0.92)', borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
                  <span className="w-2.5 sm:w-3 h-2.5 sm:h-3 bg-red-500 rounded-full"></span>
                  <span className="w-2.5 sm:w-3 h-2.5 sm:h-3 bg-yellow-400 rounded-full"></span>
                  <span className="w-2.5 sm:w-3 h-2.5 sm:h-3 bg-green-500 rounded-full"></span>
                  <span className="text-gray-200 text-xs sm:text-sm ml-2 sm:ml-4 font-semibold tracking-wide">SIGYL Stats</span>
                </div>
                <div className="p-6 sm:p-8 lg:p-12 grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 lg:divide-y-0 lg:divide-x divide-white/10 bg-transparent rounded-b-2xl sm:rounded-b-3xl">
                  {/* Uptime */}
                  <div className="flex flex-col items-center justify-center text-center space-y-2 sm:space-y-3">
                    <Shield className="w-6 sm:w-7 h-6 sm:h-7 text-white/80 stroke-2 drop-shadow" style={{fill:'none'}} />
                    <span className="text-2xl sm:text-3xl font-bold text-white">99.9%</span>
                    <div className="text-sm sm:text-base text-gray-200 font-semibold">Uptime</div>
                    <div className="text-xs sm:text-sm text-gray-400">Enterprise reliability</div>
                  </div>
                  {/* Deploy */}
                  <div className="flex flex-col items-center justify-center text-center space-y-2 sm:space-y-3">
                    <Zap className="w-6 sm:w-7 h-6 sm:h-7 text-white/80 stroke-2 drop-shadow" style={{fill:'none'}} />
                    <span className="text-2xl sm:text-3xl font-bold text-white">1 Click</span>
                    <div className="text-sm sm:text-base text-gray-200 font-semibold">Deploy</div>
                    <div className="text-xs sm:text-sm text-gray-400">From zero to live</div>
                  </div>
                  {/* Hosting */}
                  <div className="flex flex-col items-center justify-center text-center space-y-2 sm:space-y-3">
                    <Globe className="w-6 sm:w-7 h-6 sm:h-7 text-white/80 stroke-2 drop-shadow" style={{fill:'none'}} />
                    <span className="text-2xl sm:text-3xl font-bold text-white">Unlimited</span>
                    <div className="text-sm sm:text-base text-gray-200 font-semibold">Hosting</div>
                    <div className="text-xs sm:text-sm text-gray-400">MCP Servers</div>
                  </div>
                  {/* Support */}
                  <div className="flex flex-col items-center justify-center text-center space-y-2 sm:space-y-3">
                    <span className="inline-block w-6 sm:w-7 h-6 sm:h-7 rounded-full border-2 border-white/80 flex items-center justify-center">
                      <span className="w-2.5 sm:w-3 h-2.5 sm:h-3 rounded-full bg-white/60"></span>
                    </span>
                    <span className="text-2xl sm:text-3xl font-bold text-white">24/7</span>
                    <div className="text-sm sm:text-base text-gray-200 font-semibold">Support</div>
                    <div className="text-xs sm:text-sm text-gray-400">Global coverage</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* FAQ Section - Modern Glassy Style */}
      <section className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4" style={{fontFamily:'Space Grotesk, Inter, system-ui, sans-serif'}}>Frequently asked questions</h2>
            <p className="text-lg sm:text-xl text-gray-400" style={{fontFamily:'Inter, system-ui, sans-serif'}}>
              Everything you need to know about SIGYL's MCP platform.
            </p>
          </div>
          <Accordion type="single" collapsible className="space-y-6">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="border border-white/10 bg-black/90 rounded-2xl shadow-2xl overflow-hidden transition-shadow duration-300 hover:shadow-3xl"
              >
                <AccordionTrigger
                  className="faq-trigger text-left text-white text-lg sm:text-xl font-semibold flex items-center justify-between min-h-[3.5rem] px-6 py-0 font-[Space Grotesk,Inter,sans-serif] rounded-2xl focus:outline-none focus:ring-2 focus:ring-white/20 transition-all duration-200"
                  style={{fontFamily:'Space Grotesk, Inter, system-ui, sans-serif', letterSpacing:'-0.01em'}}
                >
                  <span className="w-full text-center flex-1">{faq.question}</span>
                </AccordionTrigger>
                <AccordionContent className="pb-8 pt-2 px-6 text-gray-300 leading-relaxed text-base font-[Inter,sans-serif] bg-transparent animate-fadein" style={{fontFamily:'Inter, system-ui, sans-serif'}}>
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>
      {/* CTA Section - ENHANCED DASHBOARD PANEL */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="liquid-glass-dashboard enhanced-glass-panel rounded-3xl overflow-hidden border border-white/20 shadow-2xl relative" style={{background:'rgba(10,10,15,0.96)', backdropFilter:'blur(18px) saturate(180%)', WebkitBackdropFilter:'blur(18px) saturate(180%)'}}>
            {/* Header Bar */}
            <div className="flex items-center space-x-2 p-4 bg-black/90 relative border-b border-white/10">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-gray-300 text-sm ml-4 font-semibold tracking-wide">Get Started</span>
              {/* Animated Accent Line */}
              <span className="absolute left-0 right-0 bottom-0 h-0.5 bg-gradient-to-r from-white/10 via-white/5 to-white/10 animate-accent-glow" />
            </div>
            {/* CTA Content */}
            <div className="p-10 flex flex-col items-center text-center">
              <span className="block w-full max-w-xl mx-auto mb-4 rounded-xl bg-black/60 backdrop-blur-md py-2 px-4">
                <h2 className="text-4xl font-bold text-white mb-2" style={{fontFamily:'Space Grotesk, Inter, system-ui, sans-serif'}}>Ready to deploy your MCP integration?</h2>
              </span>
              <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-8" style={{fontFamily:'Inter, system-ui, sans-serif'}}>
                Get started with SIGYL for your Model Context Protocol deployment needs.
              </p>
              <Button 
                onClick={() => navigate('/deploy')}
                className="btn-modern w-64 py-4 text-lg font-semibold rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white transition-all duration-200 shadow-lg backdrop-blur-md"
                style={{fontFamily:'Space Grotesk, Inter, system-ui, sans-serif'}}
              >
                <span className="relative z-10">Deploy Now</span>
                <ArrowRight className="ml-2 w-5 h-5 relative z-10" />
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
