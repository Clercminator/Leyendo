import { redirect } from "next/navigation";

interface DashboardPageProps {
  searchParams?: Promise<{
    payment?: string;
  }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const destination = new URLSearchParams();

  if (resolvedSearchParams.payment) {
    destination.set("payment", resolvedSearchParams.payment);
  }

  const query = destination.toString();

  redirect(query ? `/pricing?${query}` : "/pricing");
}