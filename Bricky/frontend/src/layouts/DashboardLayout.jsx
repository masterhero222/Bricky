import Sidebar from "../components/UI/Sidebar";
import Topbar from "../components/UI/Topbar";

export default function DashboardLayout({ children }) {
  return (
<div className="flex h-screen bg-red-500 text-white">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <Topbar />
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
