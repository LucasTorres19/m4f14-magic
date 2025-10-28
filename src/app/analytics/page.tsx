import { getAnalyticsSnapshot } from "@/server/services/analytics";

import { AnalyticsDashboard } from "./dashboard";

export default async function AnalyticsPage() {
  const analytics = await getAnalyticsSnapshot();
  return <AnalyticsDashboard analytics={analytics} />;
}
