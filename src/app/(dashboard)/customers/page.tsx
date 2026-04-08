import { fetchCustomers } from '@/app/actions/customer-actions';
import CustomerList from './customer-list';

export default async function CustomersPage() {
  // Fetch real data from PostgreSQL directly in SSR
  const customers = await fetchCustomers();

  return <CustomerList initialCustomers={customers} />;
}