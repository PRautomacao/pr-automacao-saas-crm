import { fetchCompanySettings } from '@/app/actions/system-actions';
import SettingsClient from './settings-client';

export default async function SettingsPage() {
  const companyData = await fetchCompanySettings();

  return <SettingsClient initialData={companyData} />;
}
