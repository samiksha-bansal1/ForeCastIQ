"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";
import Link from "next/link";

export function LandingHero() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden">
      {/* Faint grid pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage: `
              linear-gradient(to right, #E0E0DA 1px, transparent 1px),
              linear-gradient(to bottom, #E0E0DA 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />
        {/* Faint time-series line shapes */}
        <svg className="absolute right-0 top-1/4 w-[600px] h-[400px] opacity-30" viewBox="0 0 600 400">
          <path
            d="M0,300 Q50,280 100,290 T200,260 T300,230 T400,200 T500,180 T600,150"
            fill="none"
            stroke="#E0E0DA"
            strokeWidth="2"
          />
          <path
            d="M0,320 Q75,310 150,330 T300,280 T450,250 T600,220"
            fill="none"
            stroke="#E0E0DA"
            strokeWidth="1.5"
          />
          {/* Candlestick shapes */}
          <rect x="120" y="180" width="8" height="40" fill="#E0E0DA" opacity="0.5" />
          <rect x="280" y="160" width="8" height="50" fill="#E0E0DA" opacity="0.5" />
          <rect x="440" y="140" width="8" height="35" fill="#E0E0DA" opacity="0.5" />
        </svg>
      </div>

      <div className="relative z-10 max-w-[1280px] mx-auto px-6 lg:px-12 py-32 lg:py-40">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left content */}
          <div>
            {/* Eyebrow */}
            <div
              className={`mb-8 transition-all duration-700 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              <span className="inline-flex items-center gap-3 text-[11px] font-mono tracking-[0.08em] text-muted-foreground uppercase">
                <span className="w-8 h-px bg-foreground/30" />
                The forecasting platform for modern teams
              </span>
            </div>

            {/* Main headline */}
            <h1
              className={`text-[clamp(3rem,8vw,4.5rem)] font-light leading-[0.95] tracking-tight mb-8 transition-all duration-1000 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
            >
              <span className="block">Forecast smarter,</span>
              <span className="block relative">
                act faster.
                <span className="absolute -bottom-1 left-0 right-0 h-[2px] bg-foreground" />
              </span>
            </h1>

            {/* Subtext */}
            <p
              className={`text-base lg:text-lg text-muted-foreground leading-relaxed max-w-[480px] mb-10 transition-all duration-700 delay-200 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              Upload any CSV and get instant AI forecasts, anomaly alerts, and
              scenario analysis — explained in plain English. No data science
              required.
            </p>

            {/* CTAs */}
            <div
              className={`flex flex-col sm:flex-row items-start gap-4 transition-all duration-700 delay-300 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              <Button
                asChild
                size="lg"
                className="bg-foreground hover:bg-foreground/90 text-background px-8 h-14 text-base rounded-full group"
              >
                <Link href="/app">
                  Upload your data
                  <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-14 px-8 text-base rounded-full border-foreground/20 hover:bg-foreground/5"
              >
                <Play className="w-4 h-4 mr-2" />
                Watch demo
              </Button>
            </div>
          </div>

          {/* Right side - visual placeholder with chart preview */}
          <div
            className={`hidden lg:block transition-all duration-1000 delay-500 ${
              isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
            }`}
          >
            <div className="relative aspect-[4/3] rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="absolute top-4 right-4">
                <span className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-1 rounded-full">
                  Demo data
                </span>
              </div>
              {/* Mini chart preview */}
              <svg className="w-full h-full" viewBox="0 0 400 300">
                {/* Confidence band */}
                <path
                  d="M20,180 Q80,170 140,160 T260,140 T380,120 L380,200 Q320,190 260,180 T140,170 T20,180 Z"
                  fill="#DBEAFE"
                  opacity="0.5"
                />
                {/* Historical line */}
                <path
                  d="M20,200 Q50,190 80,195 T140,180 T200,175 T260,165"
                  fill="none"
                  stroke="#0A0A0A"
                  strokeWidth="2"
                />
                {/* Forecast line */}
                <path
                  d="M260,165 Q300,155 340,145 T380,130"
                  fill="none"
                  stroke="#2563EB"
                  strokeWidth="2"
                  strokeDasharray="6 3"
                />
                {/* Baseline */}
                <path
                  d="M20,190 L380,170"
                  fill="none"
                  stroke="#94A3B8"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Stats ticker */}
      <div
        className={`absolute bottom-0 left-0 right-0 border-t border-b border-border bg-background/80 backdrop-blur-sm py-4 transition-all duration-700 delay-500 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="flex marquee whitespace-nowrap">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex items-center gap-8 px-4">
              {[
                "4-week forecast horizon",
                "p10 / p50 / p90 confidence bands",
                "Rolling z-score anomaly detection",
                "Prophet foundation model",
                "Voice-enabled interface",
                "100% free to run",
                "Plain English AI insights",
                "Chrome & Edge voice support",
                "CSV auto-detection",
              ].map((item, j) => (
                <span
                  key={`${i}-${j}`}
                  className="text-sm text-muted-foreground flex items-center gap-8"
                >
                  {item}
                  <span className="text-border">·</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
