"use client";

import { TrendingUp, AlertTriangle, GitBranch } from "lucide-react";

const features = [
  {
    icon: TrendingUp,
    title: "Short-Term Forecasting",
    description:
      "Upload historical sales, revenue, or any time-series data. Get 4-week ahead forecasts with low, likely, and high confidence bands powered by Facebook Prophet.",
    tag: "Prophet · p10/p50/p90",
  },
  {
    icon: AlertTriangle,
    title: "Anomaly Detection",
    description:
      "Automatically flags unusual spikes and drops using rolling z-score statistics. HIGH severity at 3σ, MEDIUM at 2σ. Every anomaly gets an AI-generated cause and action.",
    tag: "z-score · RED/AMBER",
  },
  {
    icon: GitBranch,
    title: "Scenario Forecasting",
    description:
      "Ask 'what if I run a 20% marketing campaign?' by voice or text. Get a side-by-side comparison against baseline with a plain English summary.",
    tag: "Voice · Gemini · Scenarios",
  },
];

export function LandingFeatures() {
  return (
    <section id="features" className="py-32 px-6 lg:px-12">
      <div className="max-w-[1280px] mx-auto">
        {/* Section header */}
        <div className="mb-16">
          <span className="inline-flex items-center gap-3 text-[11px] font-mono tracking-[0.08em] text-muted-foreground uppercase mb-6">
            <span className="w-8 h-px bg-foreground/30" />
            What ForecastIQ does
          </span>
          <h2 className="text-[clamp(2rem,5vw,2.5rem)] font-light tracking-tight">
            Three tools. One upload.
          </h2>
        </div>

        {/* Feature cards grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-6">
                <feature.icon className="w-6 h-6 text-foreground" />
              </div>

              {/* Title */}
              <h3 className="text-lg font-medium mb-3">{feature.title}</h3>

              {/* Description */}
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                {feature.description}
              </p>

              {/* Tag pill */}
              <span className="inline-block text-[11px] font-mono tracking-wide text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
                {feature.tag}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
