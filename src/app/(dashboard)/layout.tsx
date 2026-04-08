import DashboardLayout from '@/components/layouts/dashboard-layout';

export default function RootDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}