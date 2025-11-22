import React from "react";
import WorkerPreview from "../components/UI/WorkerPreview";

export default function WorkerPreviewPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white pt-24 pb-24 px-6 flex flex-col items-center">
      <h1 className="text-4xl font-bold mb-10 text-center">Профили на майстори</h1>

      <div className="w-full max-w-5xl">
        <WorkerPreview />
      </div>

      <p className="text-gray-400 mt-12 text-sm">
        Това е примерен интерфейс. Реалните профили ще се зареждат автоматично от базата.
      </p>
    </div>
  );
}
