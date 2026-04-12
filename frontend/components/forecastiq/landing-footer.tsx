"use client";

import { Github } from "lucide-react";

export function LandingFooter() {
  return (
    <footer className="py-12 px-6 lg:px-12 border-t border-border">
      <div className="max-w-[1280px] mx-auto">
        {/* Main footer content */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          {/* Left */}
          <div>
            <span className="text-lg font-semibold">
              ForecastIQ<sup className="text-[10px] ml-0.5">™</sup>
            </span>
            <p className="text-sm text-muted-foreground mt-1">
              Built for NatWest Code for Purpose Hackathon
            </p>
          </div>

          {/* Right */}
          <div className="flex items-center gap-4">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors"
            >
              <Github className="w-5 h-5" />
            </a>
            <span className="text-sm text-muted-foreground">Apache 2.0</span>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            All statistical computation is done locally. No data leaves your
            browser except to your own API keys.
          </p>
        </div>
      </div>
    </footer>
  );
}
