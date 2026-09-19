import { useState } from 'react';
import AdminLogin from '@/components/admin/AdminLogin';
import AdminPanel from '@/pages/AdminPanel';
import { isAdminLoggedIn } from '@/lib/adminData';

const Index = () => {
  const [loggedIn, setLoggedIn] = useState(() => isAdminLoggedIn());

  if (!loggedIn) {
    return <AdminLogin onLogin={() => setLoggedIn(true)} />;
  }

  return <AdminPanel onLogout={() => setLoggedIn(false)} />;
};

export { Index as AdminPage };

export default Index;
