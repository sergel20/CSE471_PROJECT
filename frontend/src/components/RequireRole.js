import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLE_HOME } from '../constants/roles';

// Route guard: renders children only if the logged-in user's role is in `roles`.
// Otherwise redirects to that user's own dashboard home instead of the blocked page.
function RequireRole({ roles, children }) {
  const { user } = useAuth();

  if (!user || !roles.includes(user.role)) {
    return <Navigate to={(user && ROLE_HOME[user.role]) || '/login'} replace />;
  }

  return children;
}

export default RequireRole;
