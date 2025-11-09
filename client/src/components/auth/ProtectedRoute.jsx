import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const resolveRedirect = (requestedRole) => {
  if (requestedRole === "customer") {
    return "/customer/login";
  }
  return "/manager/login";
};

const ProtectedRoute = ({ children, redirectTo = "/manager/login" }) => {
  const { hasSession, switchRole, activeRole } = useAuth();
  const location = useLocation();

  const searchParams = React.useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );

  const requestedRole = searchParams.get("role");
  const availableRoles = React.useMemo(
    () => ["manager", "customer"].filter((role) => hasSession(role)),
    [hasSession],
  );

  const targetRole = React.useMemo(() => {
    if (requestedRole && hasSession(requestedRole)) {
      return requestedRole;
    }
    if (availableRoles.length > 0) {
      return availableRoles[0];
    }
    return null;
  }, [requestedRole, availableRoles, hasSession]);

  React.useEffect(() => {
    if (targetRole && targetRole !== activeRole) {
      switchRole(targetRole);
    }
  }, [targetRole, activeRole, switchRole]);

  if (!targetRole) {
    return (
      <Navigate
        to={resolveRedirect(requestedRole) ?? redirectTo}
        replace
        state={{
          from: location.pathname + location.search,
        }}
      />
    );
  }

  return children;
};

export default ProtectedRoute;
