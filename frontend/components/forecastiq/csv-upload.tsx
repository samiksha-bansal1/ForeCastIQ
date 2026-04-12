"use client";

/**
 * components/forecastiq/csv-upload.tsx
 * Stores parsed CSV data in DataContext so all pages share it.
 * On "Use this data" navigates to /app which auto-runs the forecast.
 */

import { useState, useCallback } from "react";
import { Upload, FileText, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useData } from "@/context/DataContext";

interface ParsedCSV {
  headers: string[];
  rows: string[][];
  rawRows: Record<string, string>[];
}

export function CSVUpload() {
  const router = useRouter();
  const { setCsvData } = useData();

  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile]             = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedCSV | null>(null);
  const [dateColumn, setDateColumn] = useState("");
  const [valueColumn, setValueColumn] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const parseCSV = useCallback((text: string): ParsedCSV => {
    const lines   = text.trim().split("\n");
    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
    const allRows = lines.slice(1).map((line) =>
      line.split(",").map((cell) => cell.trim().replace(/"/g, ""))
    );
    const previewRows = allRows.slice(0, 5);
    // Build raw row objects for the API
    const rawRows = allRows.map((cells) => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = cells[i] ?? ""; });
      return obj;
    });
    return { headers, rows: previewRows, rawRows };
  }, []);

  const detectColumns = useCallback((headers: string[]) => {
    const datePatterns  = ["date", "time", "day", "week", "month", "year"];
    const valuePatterns = ["value", "amount", "sales", "revenue", "count", "total"];
    const dateCol  = headers.find((h) => datePatterns.some((p)  => h.toLowerCase().includes(p))) ?? headers[0];
    const valueCol = headers.find((h) => valuePatterns.some((p) => h.toLowerCase().includes(p))) ?? headers[1] ?? headers[0];
    return { dateColumn: dateCol, valueColumn: valueCol };
  }, []);

  const handleFile = useCallback(
    (uploadedFile: File) => {
      setFile(uploadedFile);
      const reader = new FileReader();
      reader.onload = (e) => {
        const text   = e.target?.result as string;
        const parsed = parseCSV(text);
        setParsedData(parsed);
        const detected = detectColumns(parsed.headers);
        setDateColumn(detected.dateColumn);
        setValueColumn(detected.valueColumn);
      };
      reader.readAsText(uploadedFile);
    },
    [parseCSV, detectColumns]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped?.type === "text/csv" || dropped?.name.endsWith(".csv")) {
        handleFile(dropped);
      }
    },
    [handleFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (selected) handleFile(selected);
    },
    [handleFile]
  );

  const handleUseData = useCallback(() => {
    if (!parsedData || !file) return;
    setIsProcessing(true);

    // Store the full dataset in context
    setCsvData({
      rows:        parsedData.rawRows,
      dateColumn,
      valueColumn,
      fileName:    file.name,
    });

    // Navigate to the app — forecast page will auto-run
    router.push("/app");
  }, [parsedData, file, dateColumn, valueColumn, setCsvData, router]);

  return (
    <div className="max-w-[640px] mx-auto">
      <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
        <h2 className="text-xl font-medium mb-2">Upload your data</h2>
        <p className="text-sm text-muted-foreground mb-8">
          CSV files only. Needs at least one date column and one numeric value
          column. Minimum 8 rows.
        </p>

        {!parsedData ? (
          <>
            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              className={cn(
                "border-2 border-dashed rounded-2xl p-12 text-center transition-colors cursor-pointer",
                isDragging
                  ? "border-foreground bg-card"
                  : "border-border bg-muted/30 hover:border-foreground/50"
              )}
            >
              <input type="file" accept=".csv" onChange={handleFileInput}
                className="hidden" id="csv-upload" />
              <label htmlFor="csv-upload" className="cursor-pointer">
                <Upload className="w-8 h-8 mx-auto mb-4 text-foreground" />
                <p className="text-base font-medium mb-1">Drop your CSV here</p>
                <p className="text-sm text-muted-foreground">
                  or <span className="underline hover:text-foreground">click to browse</span>
                </p>
              </label>
            </div>

            <div className="text-center mt-6">
              <Link href="/app" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
                Skip upload — use demo_sales.csv
              </Link>
            </div>
          </>
        ) : (
          <>
            {/* File info */}
            <div className="flex items-center gap-3 mb-6 p-4 rounded-xl bg-muted/50">
              <FileText className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{file?.name}</p>
                <p className="text-xs text-muted-foreground">
                  {parsedData.headers.length} columns detected
                </p>
              </div>
              <Check className="w-5 h-5 text-green-600 ml-auto" />
            </div>

            {/* Preview table */}
            <div className="mb-6">
              <h4 className="text-sm font-medium mb-3">Preview — first 5 rows</h4>
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50">
                      {parsedData.headers.map((header) => (
                        <th key={header} className="text-left px-3 py-2 font-mono font-medium">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.rows.map((row, i) => (
                      <tr key={i} className={cn("border-t border-border", i % 2 === 1 && "bg-muted/30")}>
                        {row.map((cell, j) => (
                          <td key={j} className="px-3 py-2 font-mono">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Column selectors */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-xs font-medium mb-2 block">Date Column</label>
                <select value={dateColumn} onChange={(e) => setDateColumn(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20">
                  {parsedData.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium mb-2 block">Value Column</label>
                <select value={valueColumn} onChange={(e) => setValueColumn(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20">
                  {parsedData.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            </div>

            <Button onClick={handleUseData} disabled={isProcessing}
              className="w-full bg-foreground hover:bg-foreground/90 text-background rounded-full h-12">
              {isProcessing ? "Processing..." : "Use this data →"}
            </Button>

            <div className="text-center mt-4">
              <button onClick={() => { setFile(null); setParsedData(null); }}
                className="text-sm text-muted-foreground hover:text-foreground hover:underline">
                Upload a different file
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
