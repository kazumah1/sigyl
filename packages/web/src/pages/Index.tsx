
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
    <div className="min-h-screen bg-black text-white">
      <PageHeader />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="container mx-auto text-center">
          <h1 className="text-6xl md:text-8xl font-bold mb-8 text-white leading-tight">
            MCP deployment
            <br />
            for scale.
          </h1>
          <p className="text-xl md:text-2xl text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed">
            Deploy, manage, and scale your Model Context Protocol servers with enterprise-grade infrastructure. 
            Built for developers who demand reliability and performance.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
            <Button 
              size="lg" 
              className="bg-white hover:bg-gray-100 text-black font-semibold px-8 py-4 text-lg"
            >
              Get Started Free
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-gray-600 text-white hover:bg-gray-900 font-semibold px-8 py-4 text-lg"
            >
              View Documentation
            </Button>
          </div>

          {/* Dashboard Preview - No gradient background */}
          <div className="relative max-w-6xl mx-auto">
            <div className="bg-gray-900 rounded-3xl overflow-hidden border border-gray-800">
              <div className="flex items-center space-x-2 p-4 bg-gray-800">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-gray-400 text-sm ml-4">SIGYL Dashboard</span>
              </div>
              <div className="p-8 space-y-6">
                <div className="bg-gray-800 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-white mb-2">MCP Server Status</h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-green-400 font-medium">E-commerce Integration deployed successfully</span>
                    </div>
                    <div className="text-blue-400">Handling 1.2K requests/min across 12 endpoints</div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-400">
                  <span>Last updated: 2 seconds ago</span>
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Built for scale, designed for speed</h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Everything you need to deploy, manage, and scale your MCP integrations.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="card-modern hover-lift">
                <feature.icon className="w-8 h-8 text-white mb-4" />
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 px-6 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            {[
              { number: "99.9%", label: "Uptime SLA" },
              { number: "< 2min", label: "Deploy Time" },
              { number: "9000+", label: "Integrations" },
              { number: "24/7", label: "Support" }
            ].map((stat, index) => (
              <div key={index} className="card-modern">
                <div className="text-4xl font-bold text-white mb-2">{stat.number}</div>
                <div className="text-sm text-gray-400 uppercase tracking-wide">{stat.label}</div>
              </div>
            ))}
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
          
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="card-modern border-none"
              >
                <AccordionTrigger className="text-left hover:no-underline py-6 text-white">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="pb-6 text-gray-400 leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl font-bold mb-6">
            Ready to deploy your MCP integration?
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
            Join thousands of developers who trust SIGYL for their Model Context Protocol deployment needs.
          </p>
          <Button 
            onClick={() => navigate('/deploy')}
            className="btn-primary text-lg px-8 py-4"
          >
            Deploy Now
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
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
