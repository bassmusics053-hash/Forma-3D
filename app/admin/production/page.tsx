import "../admin.css";
import "./production.css";
import ProductionDashboard from "@/components/ProductionDashboard";

export const metadata = {
  title: "Ishlab chiqarish | FORMA 3D",
  robots: { index: false, follow: false },
};

export default function ProductionPage() {
  return <ProductionDashboard />;
}
