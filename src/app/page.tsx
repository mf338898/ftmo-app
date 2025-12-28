import { MainDashboard } from "@/components/ftmo/main-dashboard";
import { DisplayModeProvider } from "@/components/ftmo/display-mode-context";

export default function Home() {
  return (
    <DisplayModeProvider>
      <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-12">
        <MainDashboard />
      </div>
    </DisplayModeProvider>
  );
}
