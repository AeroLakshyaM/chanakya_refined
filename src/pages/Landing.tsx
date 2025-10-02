import { useRef, useState, useLayoutEffect } from "react";
// react-three-fiber temporarily disabled while fixing runtime issue
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { Link } from "react-router-dom";
import bento1 from "@/assets/bento1.jpg";
import bento2 from "@/assets/bento2.jpg";
import aiBackground from "@/assets/ai-background.jpg";

// 3D components removed temporarily to prevent runtime crash while we align dependencies
// Placeholder reserved for future re-enable of react-three-fiber scene

const Header = () => {
  const [isFeaturesOpen, setIsFeaturesOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md">
      <div className="container mx-auto px-6 py-4">
        <nav className="flex items-center justify-between">
          <div className="text-2xl font-bold p-4 isolate">Chanakya</div>
          <div className="hidden md:flex items-center space-x-1 isolate glassmorphic rounded-xl py-2 px-3">
            <Link to="/auth" className="hover:bg-white text-foreground transition-all px-4 py-2 rounded-full text-sm font-medium">
              Startups
            </Link>
            <Link to="/auth" className="hover:bg-white text-foreground transition-all px-4 py-2 rounded-full text-sm font-medium">
              Established Products
            </Link>
            <div className="relative" onMouseEnter={() => setIsFeaturesOpen(true)} onMouseLeave={() => setIsFeaturesOpen(false)}>
              <button className="hover:bg-white text-foreground transition-all px-4 py-2 rounded-full text-sm font-medium flex items-center">
                Features
                <svg className={`w-4 h-4 ml-1 transition-transform duration-200 ${isFeaturesOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </button>
              <div className={`absolute top-full pt-2 left-1/2 -translate-x-1/2 transition-all duration-200 ease-in-out ${isFeaturesOpen ? "opacity-100 visible translate-y-0" : "opacity-0 invisible -translate-y-2"}`}>
                <div className="w-48 bg-white rounded-lg shadow-xl ring-1 ring-black/5 p-2 z-10">
                  <Link to="/auth" className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md">AI Analysis</Link>
                  <Link to="/auth" className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md">Market Trends</Link>
                  <Link to="/auth" className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md">Competitor Insights</Link>
                </div>
              </div>
            </div>
            <Link to="/auth" className="hover:bg-white text-foreground transition-all px-4 py-2 rounded-full text-sm font-medium">Pricing</Link>
            <Link to="/auth" className="hover:bg-white text-foreground transition-all px-4 py-2 rounded-full text-sm font-medium">Investors</Link>
            <Link to="/auth" className="hover:bg-white text-foreground transition-all px-4 py-2 rounded-full text-sm font-medium">Request Demo</Link>
          </div>
          <div className="flex items-center space-x-3">
            <Link to="/auth">
              <button className="bg-foreground hover:opacity-80 text-background font-medium py-2 px-6 rounded-full transition text-sm">
                Sign Up
              </button>
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
};

const AIDomains = () => {
  const domains = ["Business Advisory", "Financial Guidance", "Operations Support", "Technical Analysis", "Information Insights"];

  return (
    <div className="absolute bottom-8 left-0 right-0 z-10">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-center space-x-8 opacity-80">
          {domains.map((domain, index) => (
            <div key={index} className="text-foreground font-medium text-sm whitespace-nowrap">
              {domain}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default function Landing() {
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);

  useLayoutEffect(() => {
    const onResize = () => {
      if (contentRef.current) {
        setContentHeight(contentRef.current.scrollHeight);
      }
    };
    const debouncedOnResize = () => setTimeout(onResize, 100);
    onResize();
    window.addEventListener("resize", debouncedOnResize);
    return () => window.removeEventListener("resize", debouncedOnResize);
  }, []);

  const { scrollY } = useScroll();
  const smoothScrollY = useSpring(scrollY, { mass: 0.1, stiffness: 100, damping: 20, restDelta: 0.001 });
  const y = useTransform(smoothScrollY, (value) => `-${value}px`);

  const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.8 } },
  };

  return (
    <div className="bg-background text-foreground font-sans antialiased">
      <div style={{ height: contentHeight }} />
      <motion.div ref={contentRef} style={{ y }} className="fixed top-0 left-0 w-full will-change-transform">
        <Header />
        <main>
          <section className="min-h-screen flex items-center relative overflow-hidden">
            <div className="absolute inset-0 z-0">
              <img src={aiBackground} alt="Abstract AI visualization" className="w-full h-full object-cover opacity-20" />
            </div>

            <div className="container mx-auto px-6 mt-10 ml-6 z-10">
              <motion.div className="max-w-3xl" initial="initial" animate="animate" variants={{ animate: { transition: { staggerChildren: 0.15 } } }}>
                <motion.h1 className="text-5xl sm:text-7xl md:text-8xl font-bold text-foreground leading-tight mb-8" variants={fadeInUp}>
                  AI-Powered Product Refinement.
                </motion.h1>
                <motion.p className="text-lg sm:text-xl text-foreground/90 mb-8 max-w-lg" variants={fadeInUp}>
                  Optimize, refine, and grow your offering with AI-driven insights, analytics, and practical guidance for every stage of your business.
                </motion.p>
              </motion.div>
            </div>
            <AIDomains />
          </section>

          <section className="py-20 bg-muted">
            <div className="container mx-auto px-6">
              <div className="text-center max-w-3xl mx-auto mb-16">
                <h2 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">For Every Stage of Your Product's Journey</h2>
                <p className="text-xl text-muted-foreground">Chanakya provides tailored toolkits, whether you're a new startup with an idea or an established product looking to optimize.</p>
              </div>
              <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                <div className="bg-card p-8 rounded-3xl shadow-sm border border-border relative overflow-hidden hover-lift">
                  <div className="absolute top-6 right-6 w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <div className="mb-8">
                    <h3 className="text-3xl font-bold mb-3">For Startups</h3>
                    <p className="text-muted-foreground text-lg">From idea to launch with an AI co-pilot guiding you.</p>
                  </div>
                  <div className="bg-muted p-6 rounded-2xl space-y-3">
                    <p className="font-semibold text-foreground">✓ AI-Assisted Website Builder</p>
                    <p className="font-semibold text-foreground">✓ AI Chatbot for Basic Legal Guidance</p>
                    <p className="font-semibold text-foreground">✓ Financial & Funding Strategy</p>
                    <p className="font-semibold text-foreground">✓ SEO and Social Media Content</p>
                  </div>
                </div>

                <div className="bg-card p-8 rounded-3xl shadow-sm border border-border relative overflow-hidden hover-lift">
                  <div className="absolute top-6 right-6 w-12 h-12 bg-foreground rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-background" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div className="mb-8">
                    <h3 className="text-3xl font-bold mb-3">For Established Products</h3>
                    <p className="text-muted-foreground text-lg">Analyze, optimize, and enhance your existing product.</p>
                  </div>
                  <div className="bg-muted p-6 rounded-2xl space-y-3">
                    <p className="font-semibold text-foreground">✓ In-depth UI/UX Analysis</p>
                    <p className="font-semibold text-foreground">✓ Continuous SEO Recommendations</p>
                    <p className="font-semibold text-foreground">✓ User Engagement & Trend Analytics</p>
                    <p className="font-semibold text-foreground">✓ Feature Enhancement Suggestions</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="py-20 bg-background relative overflow-hidden">
            <div className="absolute top-0 right-0 w-1/2 h-full pointer-events-none">
              <div className="w-full h-full gradient-blue opacity-40 blur-3xl" />
            </div>
            <div className="container mx-auto px-20 relative z-10">
              <div className="max-w-2xl">
                <motion.h2 className="text-6xl md:text-7xl font-bold leading-tight mb-8" initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
                  Leverage a Multi-Agent AI System
                </motion.h2>
                <motion.p className="text-xl text-muted-foreground mb-8" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.2 }}>
                  Get personalized recommendations from a team of specialized AI agents. Our system even facilitates interactive debates on features, presenting you with transparent pros and cons.
                </motion.p>
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.4 }}>
                  <Link to="/auth">
                    <button className="bg-foreground hover:opacity-80 text-background font-medium py-3 px-8 rounded-full transition text-lg">
                      Explore Our AI Features
                    </button>
                  </Link>
                </motion.div>
              </div>
            </div>
          </section>

          <section className="py-20">
            <div className="container mx-auto px-6">
              <div className="grid lg:grid-cols-12 gap-6 max-w-7xl mx-auto">
                <div className="lg:col-span-5 flex flex-col justify-center">
                  <h2 className="text-5xl md:text-6xl font-bold leading-tight mb-8 bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                    Core Tools to Drive Growth
                  </h2>
                  <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                    Chanakya puts a powerful suite of analysis and product management tools at your fingertips, helping you identify market gaps and track your refinement iterations seamlessly.
                  </p>
                  <Link to="/auth">
                    <button className="bg-foreground hover:opacity-80 text-background font-medium py-3 px-8 rounded-full transition-all duration-300 hover:scale-105 w-fit">
                      See Pricing Plans
                    </button>
                  </Link>
                </div>

                <div className="lg:col-span-7">
                  <div className="glassmorphic p-8 rounded-3xl border border-white/20 shadow-xl">
                    <div className="grid grid-cols-4 gap-4 h-[480px]">
                      <div className="col-span-2 row-span-2 backdrop-blur-xl transition-all duration-500">
                        <div className="relative z-10">
                          <div className="text-xs text-foreground font-medium mb-6 tracking-wider">FEATURED</div>
                          <h3 className="text-2xl font-bold text-foreground mb-6 leading-tight">
                            Advanced Analytics
                            <br />
                            <span className="text-muted-foreground">for Growth</span>
                          </h3>
                          <h5>Stop guessing and start making decisions with confidence. Chanakya's advanced analytics engine transforms raw user data into a clear roadmap for growth.</h5>
                          <img src={bento1} alt="" className="h-60 w-70 mt-5 rounded-2xl" />
                        </div>
                      </div>

                      <div className="col-span-2 backdrop-blur-xl border-primary border-2 p-4 rounded-2xl transition-all duration-300">
                        <div className="text-xs text-muted-foreground font-medium mb-3 tracking-wider">INSIGHTS</div>
                        <h3 className="text-lg font-semibold text-foreground mb-4">Latest Updates</h3>
                        <h5>Dive into our collection of articles, case studies, and data-driven analyses designed to help you navigate the complexities of product development.</h5>
                      </div>

                      <Link to="/auth" className="backdrop-blur-xl bg-gradient-to-br from-blue-400/80 to-blue-200/60 p-5 rounded-2xl border border-blue-200/50 relative overflow-hidden transition-all duration-300 hover-lift">
                        <div className="text-xs text-foreground font-medium mb-2 tracking-wider">ABOUT US</div>
                        <h3 className="text-base font-semibold text-foreground">We're Building the Co-pilot for Product Visionaries</h3>
                      </Link>

                      <Link to="/auth" className="backdrop-blur-xl p-5 rounded-2xl border-foreground border-2 bg-foreground transition-all duration-300 hover-lift">
                        <div className="text-xs text-background font-medium mb-2 tracking-wider">SUPPORT</div>
                        <h3 className="text-base font-semibold text-background">World-Class Support, Every Step of the Way</h3>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="py-20 bg-muted">
            <div className="container mx-auto px-6">
              <div className="text-center max-w-3xl mx-auto mb-16">
                <h2 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">Get Started in 3 Simple Steps</h2>
                <p className="text-xl text-muted-foreground">Chanakya simplifies complexity. Our streamlined process gets you from data input to actionable insights in minutes.</p>
              </div>
              <div className="grid md:grid-cols-3 gap-12 max-w-6xl mx-auto">
                <motion.div className="text-center" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }}>
                  <div className="w-20 h-20 bg-card shadow-md rounded-full flex items-center justify-center mx-auto mb-6 border border-border">
                    <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold mb-3">1. Connect Your Data</h3>
                  <p className="text-muted-foreground">Securely link your existing product data, analytics platforms, or simply describe your startup idea. Our system handles the rest.</p>
                </motion.div>
                <motion.div className="text-center" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.2 }}>
                  <div className="w-20 h-20 bg-card shadow-md rounded-full flex items-center justify-center mx-auto mb-6 border border-border">
                    <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold mb-3">2. AI Analyzes & Debates</h3>
                  <p className="text-muted-foreground">Our multi-agent AI system processes your information, identifies opportunities, and simulates debates to provide you with balanced, transparent recommendations.</p>
                </motion.div>
                <motion.div className="text-center" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.3 }}>
                  <div className="w-20 h-20 bg-card shadow-md rounded-full flex items-center justify-center mx-auto mb-6 border border-border">
                    <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold mb-3">3. Receive Actionable Insights</h3>
                  <p className="text-muted-foreground">Get a clear, prioritized roadmap for growth. From UI tweaks to strategic market positioning, receive insights you can implement immediately.</p>
                </motion.div>
              </div>
            </div>
          </section>

          <section className="py-20 bg-background">
            <div className="container mx-auto px-6 text-center">
              <h2 className="text-3xl font-bold text-foreground mb-12">Trusted by the Next Generation of Innovators</h2>
              <div className="flex flex-wrap items-center justify-center gap-x-16 gap-y-8">
                <div className="text-3xl font-medium text-muted-foreground grayscale hover:grayscale-0 transition-all">Nexus</div>
                <div className="text-3xl font-medium text-muted-foreground grayscale hover:grayscale-0 transition-all">Apex Labs</div>
                <div className="text-3xl font-medium text-muted-foreground grayscale hover:grayscale-0 transition-all">Momentum</div>
                <div className="text-3xl font-medium text-muted-foreground grayscale hover:grayscale-0 transition-all">QuantumLeap</div>
                <div className="text-3xl font-medium text-muted-foreground grayscale hover:grayscale-0 transition-all">Catalyst</div>
              </div>
            </div>
          </section>

          <footer className="bg-background border-t border-border relative overflow-hidden">
            <div className="container mx-auto px-6 py-52 relative z-10">
              <div className="flex justify-center">
                <div className="grid md:grid-cols-4 gap-8 max-w-4xl w-full text-center md:text-left">
                  <div>
                    <h4 className="font-semibold mb-4">Features</h4>
                    <ul className="space-y-3 text-muted-foreground">
                      <li><Link to="#" className="hover:text-foreground transition">AI Assistance</Link></li>
                      <li><Link to="#" className="hover:text-foreground transition">Website & SEO Tools</Link></li>
                      <li><Link to="#" className="hover:text-foreground transition">Investor Matching</Link></li>
                      <li><Link to="#" className="hover:text-foreground transition">Market Analysis</Link></li>
                      <li><Link to="#" className="hover:text-foreground transition">Version Tracking</Link></li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-4">Resources</h4>
                    <ul className="space-y-3 text-muted-foreground">
                      <li><Link to="#" className="hover:text-foreground transition">Docs</Link></li>
                      <li><Link to="#" className="hover:text-foreground transition">Knowledge Base</Link></li>
                      <li><Link to="#" className="hover:text-foreground transition">Blog</Link></li>
                      <li><Link to="#" className="hover:text-foreground transition">Case Studies</Link></li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-4">Company</h4>
                    <ul className="space-y-3 text-muted-foreground">
                      <li><Link to="#" className="hover:text-foreground transition">About Us</Link></li>
                      <li><Link to="#" className="hover:text-foreground transition">Careers</Link></li>
                      <li><Link to="#" className="hover:text-foreground transition">Get Support</Link></li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-4">Connect</h4>
                    <ul className="space-y-3 text-muted-foreground">
                      <li><Link to="#" className="hover:text-foreground transition">LinkedIn</Link></li>
                      <li><Link to="#" className="hover:text-foreground transition">X / Twitter</Link></li>
                      <li><Link to="#" className="hover:text-foreground transition">Contact Sales</Link></li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute inset-0 flex items-end justify-center pointer-events-none pb-4">
              <div className="text-[8rem] md:text-[12rem] lg:text-[16rem] font-bold text-gray-200 whitespace-nowrap leading-none opacity-60">Chanakya</div>
            </div>
          </footer>
        </main>
      </motion.div>
    </div>
  );
}
