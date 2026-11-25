import { generatePath, Navigate, useLocation, useParams } from 'react-router';

export default function LegacyRedirect({ to }: { to: string }) {
  const params = useParams();
  const { search, hash } = useLocation();
  return <Navigate to={{ pathname: generatePath(to, params), search, hash }} replace />;
}
