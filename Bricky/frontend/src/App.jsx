import DashboardLayout from "./layouts/DashboardLayout";
import AppRoutes from "./routes/AppRoutes";

export default function App() {
  return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-screen text-3xl">
        Ready to rock ✅
          <AppRoutes />
      </div>
    </DashboardLayout>
  );
}
