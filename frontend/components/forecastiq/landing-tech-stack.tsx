"use client";

const techStack = [
  {
    name: "Prophet by Meta",
    description: "Foundation model for time-series forecasting",
  },
  {
    name: "Gemini 1.5 Flash",
    description: "Plain English explanations & scenario analysis",
  },
  {
    name: "statsmodels",
    description: "Rolling z-score anomaly detection",
  },
  {
    name: "Flask",
    description: "Python backend API",
  },
  {
    name: "React + Recharts",
    description: "Interactive charts and UI",
  },
  {
    name: "Web Speech API",
    description: "Voice input & output, browser-native",
  },
];

export function LandingTechStack() {
  return (
    <section
      id="tech-stack"
      className="py-32 px-6 lg:px-12 bg-foreground text-background"
    >
      <div className="max-w-[1280px] mx-auto">
        {/* Section header */}
        <div className="mb-16">
          <h2 className="text-[clamp(2rem,5vw,2.5rem)] font-light tracking-tight">
            Built on tools that last.
          </h2>
        </div>

        {/* Tech cards grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {techStack.map((tech) => (
            <div
              key={tech.name}
              className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6 hover:border-[#3A3A3A] transition-colors"
            >
              <h3 className="text-base font-medium mb-2">{tech.name}</h3>
              <p className="text-sm text-[#A0A0A0]">{tech.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
