"use client";

const steps = [
  {
    number: 1,
    title: "Upload CSV",
    description: "Drop any date+value CSV file",
  },
  {
    number: 2,
    title: "Select Columns",
    description: "Choose your date and value columns",
  },
  {
    number: 3,
    title: "Run Analysis",
    description: "Forecast, anomalies, or scenarios — one click",
  },
  {
    number: 4,
    title: "Get Insights",
    description: "Plain English results, spoken aloud if you want",
  },
];

export function LandingHowItWorks() {
  return (
    <section id="how-it-works" className="py-32 px-6 lg:px-12 border-t border-border">
      <div className="max-w-[1280px] mx-auto">
        {/* Section header */}
        <div className="text-center mb-20">
          <h2 className="text-[clamp(2rem,5vw,2.5rem)] font-light tracking-tight">
            From CSV to insight in 30 seconds.
          </h2>
        </div>

        {/* Steps timeline */}
        <div className="relative">
          {/* Connecting line */}
          <div className="absolute top-8 left-0 right-0 h-px border-t border-dashed border-border hidden md:block" />

          <div className="grid md:grid-cols-4 gap-8 md:gap-6">
            {steps.map((step) => (
              <div key={step.number} className="relative text-center">
                {/* Step number circle */}
                <div className="w-16 h-16 rounded-full bg-foreground text-background flex items-center justify-center text-xl font-medium mx-auto mb-6 relative z-10">
                  {step.number}
                </div>

                {/* Title */}
                <h3 className="text-base font-medium mb-2">{step.title}</h3>

                {/* Description */}
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
