"use client";

import { AppTopbar } from "@/components/forecastiq/app-topbar";
import { CSVUpload } from "@/components/forecastiq/csv-upload";

export default function UploadPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <AppTopbar title="Upload Data" />

      <div className="flex-1 p-6 lg:p-8 flex items-center justify-center">
        <CSVUpload />
      </div>
    </div>
  );
}
