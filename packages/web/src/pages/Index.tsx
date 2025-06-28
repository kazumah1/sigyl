import React from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Shield, Zap, Globe } from "lucide-react";
import PageHeader from "@/components/PageHeader";
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
      description: "Bank-grade encryption and zero-trust architecture protecting your MCP integrations."
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Deploy in seconds with our optimized infrastructure and global edge network."
    },
    {
      icon: Globe,
      title: "Global Scale",
      description: "99.9% uptime SLA with automatic scaling across multiple regions worldwide."
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
      {/* Liquid Glass Blobs */}
      <div className="liquid-glass-blob blob-1" />
      <div className="liquid-glass-blob blob-2" />
      <div className="liquid-glass-blob blob-3" />
      <PageHeader />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 relative z-10">
        <div className="container mx-auto text-center">
          <h1 className="hero-heading">MCP deployment<br />for scale.</h1>
          <p className="hero-subheading">Deploy, manage, and scale your Model Context Protocol servers with enterprise-grade infrastructure. Built for developers who demand reliability and performance.</p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
            <Button 
              size="lg" 
              onClick={() => navigate('/deploy')}
              className="bg-white text-black border border-white rounded-md px-8 py-4 font-semibold hover:bg-gray-100 hover:text-black transition-colors"
            >
              Get Started Free
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              onClick={() => navigate('/docs')}
              className="btn-modern"
            >
              View Documentation
            </Button>
          </div>

          {/* Dashboard Preview - No gradient background */}
          <div className="max-w-6xl mx-auto">
            {/* Painterly wrapper with @Test_5.png background - now clearly visible */}
            <div className="dashboard-painterly-wrapper relative rounded-3xl overflow-hidden shadow-2xl border border-white/10" style={{background: 'rgba(0,0,0,0.10)'}}>
              <img src="/Test_5.png" alt="Painterly Background" className="absolute inset-0 w-full h-full object-cover z-0" style={{borderRadius:'1.5rem', opacity:1, filter:'blur(1px) brightness(0.85)'}} />
              {/* SIGYL Dashboard Panel - Match stats panel design */}
              <div className="liquid-glass-dashboard enhanced-glass-panel rounded-3xl overflow-hidden border border-white/20 shadow-2xl relative mx-auto my-12" style={{maxWidth:'700px', boxShadow:'0 12px 48px 0 rgba(0,0,0,0.38)', border:'1.5px solid rgba(255,255,255,0.22)', backdropFilter:'blur(18px) saturate(180%)', WebkitBackdropFilter:'blur(18px) saturate(180%)', background:'rgba(30,32,40,0.72)', padding:'0'}}>
                <div className="liquid-glass-highlight absolute top-0 left-0 w-full h-8 z-10" style={{opacity:0.85}} />
                <div className="flex items-center space-x-2 p-5 rounded-t-3xl" style={{background:'rgba(30,32,40,0.92)', borderBottom:'1px solid rgba(255,255,255,0.10)'}}>
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-gray-200 text-base ml-4 font-semibold tracking-wide">SIGYL Dashboard</span>
                </div>
                <div className="p-12 space-y-8 flex flex-col items-center justify-center text-center" style={{background:'transparent', borderRadius:'0 0 1.5rem 1.5rem'}}>
                  <h3 className="text-2xl font-bold text-white mb-4 tracking-tight">MCP Server Status</h3>
                  <div className="space-y-5 w-full flex flex-col items-center">
                    <div className="flex items-center space-x-3 justify-center">
                      <div className="w-3 h-3 bg-green-400 rounded-full shadow-md"></div>
                      <span className="text-green-400 font-semibold text-lg">E-commerce Integration deployed successfully</span>
                    </div>
                    <div className="text-blue-400 text-base font-medium">Handling 1.2K requests/min across 12 endpoints</div>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-400 w-full mt-2">
                    <span>Last updated: 2 seconds ago</span>
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="features-tab-bg relative rounded-3xl overflow-hidden shadow-2xl border border-white/10 mx-auto" style={{background: 'rgba(255,255,255,0.10)'}}>
            <img src="/Test_3.png" alt="Features Tab Background" className="absolute inset-0 w-full h-full object-cover z-0" style={{borderRadius:'1.5rem', opacity:0.92}} />
            <div className="relative z-10 p-12">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold mb-4 text-white drop-shadow-lg">Built for scale, designed for speed</h2>
                <p className="text-xl text-white max-w-2xl mx-auto drop-shadow" style={{opacity:0.98}}>Everything you need to deploy, manage, and scale your MCP integrations.</p>
              </div>
              <div className="grid md:grid-cols-3 gap-12">
                {features.map((feature, index) => (
                  <div key={index} className="card-modern hover-lift">
                    <feature.icon className="w-10 h-10 text-white mb-6" />
                    <h3 className="text-2xl font-bold mb-4 tracking-tight leading-snug">{feature.title}</h3>
                    <p className="text-lg text-gray-300 leading-relaxed mb-2">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section - CLEAN LIQUID GLASS PANEL WRAPPED IN PAINTERLY TAB */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col items-center" style={{width:'100%', minHeight:'560px', padding:'2.5rem 0', background:'rgba(255,255,255,0.10)'}}>
            <img src="/Test_4.png" alt="Stats Tab Background" className="absolute inset-0 w-full h-full object-cover z-0" style={{borderRadius:'1.5rem', opacity:0.92}} />
            <div className="relative z-10 w-full flex flex-col items-center">
              <div className="text-center mb-8 w-full">
                <h2 className="text-4xl font-bold text-white drop-shadow-lg">Enterprise Grade</h2>
              </div>
              <div className="liquid-glass-stats rounded-3xl shadow-2xl border border-white/20 mx-auto w-full mt-4" style={{maxWidth:'900px', background:'rgba(30,32,40,0.72)', backdropFilter:'blur(18px) saturate(180%)', WebkitBackdropFilter:'blur(18px) saturate(180%)'}}>
                <div className="flex items-center space-x-2 p-4 rounded-t-3xl" style={{background:'rgba(30,32,40,0.92)', borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
                  <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                  <span className="w-3 h-3 bg-yellow-400 rounded-full"></span>
                  <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                  <span className="text-gray-200 text-sm ml-4 font-semibold tracking-wide">SIGYL Stats</span>
                </div>
                <div className="p-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-white/10 bg-transparent rounded-b-3xl">
                  {/* Uptime SLA */}
                  <div className="flex flex-col items-center justify-center py-8 px-2">
                    <Shield className="w-7 h-7 mb-3 text-white/80 stroke-2 drop-shadow" style={{fill:'none'}} />
                    <span className="text-3xl font-bold text-white">99.9%</span>
                    <div className="text-base text-gray-200 font-semibold mt-1">Uptime SLA</div>
                    <div className="text-sm text-gray-400">Enterprise reliability</div>
                  </div>
                  {/* Deploy Time */}
                  <div className="flex flex-col items-center justify-center py-8 px-2">
                    <Zap className="w-7 h-7 mb-3 text-white/80 stroke-2 drop-shadow" style={{fill:'none'}} />
                    <span className="text-3xl font-bold text-white">&lt; 2min</span>
                    <div className="text-base text-gray-200 font-semibold mt-1">Deploy Time</div>
                    <div className="text-sm text-gray-400">From zero to live</div>
                  </div>
                  {/* Integrations */}
                  <div className="flex flex-col items-center justify-center py-8 px-2">
                    <Globe className="w-7 h-7 mb-3 text-white/80 stroke-2 drop-shadow" style={{fill:'none'}} />
                    <span className="text-3xl font-bold text-white">9000+</span>
                    <div className="text-base text-gray-200 font-semibold mt-1">Integrations</div>
                    <div className="text-sm text-gray-400">APIs &amp; tools</div>
                  </div>
                  {/* Support */}
                  <div className="flex flex-col items-center justify-center py-8 px-2">
                    <span className="inline-block w-7 h-7 mb-3 rounded-full border-2 border-white/80 flex items-center justify-center">
                      <span className="w-3 h-3 rounded-full bg-white/60"></span>
                    </span>
                    <span className="text-3xl font-bold text-white">24/7</span>
                    <div className="text-base text-gray-200 font-semibold mt-1">Support</div>
                    <div className="text-sm text-gray-400">Global coverage</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Frequently asked questions</h2>
            <p className="text-xl text-gray-400">
              Everything you need to know about SIGYL's MCP platform.
            </p>
          </div>
          
          <Accordion type="single" collapsible className="space-y-6">
            {faqs.map((faq, index) => (
              <div key={index} className="liquid-glass-faq relative group" data-liquid-glass>
                <div className="liquid-glass-highlight pointer-events-none absolute inset-0 z-0" />
                <AccordionItem value={`item-${index}`} className="border-none bg-transparent relative z-10">
                  <AccordionTrigger className="faq-trigger text-left text-white text-xl font-semibold flex items-center group justify-center min-h-[4.5rem] py-0">
                    <span className="relative flex items-center justify-center w-full group-hover:after:w-full group-focus:after:w-full after:transition-all after:duration-300 after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:w-0 after:bg-white/30">
                      {faq.question}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-6 text-gray-400 leading-relaxed">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              </div>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA Section - ENHANCED DASHBOARD PANEL */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-gray-900 rounded-3xl overflow-hidden border border-gray-800 shadow-2xl relative">
            {/* Header Bar */}
            <div className="flex items-center space-x-2 p-4 bg-gray-800 relative">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-gray-400 text-sm ml-4 font-semibold tracking-wide">Get Started</span>
              {/* Animated Accent Line */}
              <span className="absolute left-0 right-0 bottom-0 h-0.5 bg-gradient-to-r from-blue-500/30 via-white/10 to-pink-500/30 animate-accent-glow" />
            </div>
            {/* CTA Content */}
            <div className="p-10 flex flex-col items-center text-center">
              <span className="block w-full max-w-xl mx-auto mb-4 rounded-xl bg-white/5 backdrop-blur-sm py-2 px-4 animate-cta-highlight">
                <h2 className="text-4xl font-bold text-white mb-2">Ready to deploy your MCP integration?</h2>
              </span>
              <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-8">Join thousands of developers who trust SIGYL for their Model Context Protocol deployment needs.</p>
              <Button 
                onClick={() => navigate('/deploy')}
                className="bg-blue-500 hover:bg-blue-600 text-white text-lg px-8 py-4 rounded-xl font-semibold shadow-lg border-2 border-blue-400/20 hover:border-blue-500/40 transition-all duration-200 relative overflow-hidden"
              >
                <span className="relative z-10">Deploy Now</span>
                <ArrowRight className="ml-2 w-5 h-5 relative z-10" />
                <span className="absolute left-0 right-0 bottom-0 h-1 bg-gradient-to-r from-blue-400/30 via-white/10 to-pink-400/30 animate-cta-underline" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/10">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-sm text-gray-400">
            © 2024 SIGYL. Enterprise-grade MCP deployment platform.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
