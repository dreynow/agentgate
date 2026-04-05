import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';

interface User {
  email: string;
  name: string;
  picture: string;
  logged_in: boolean;
  has_refresh_token: boolean;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [githubToken, setGithubToken] = useState<string | null>(null);
  const [vaultError, setVaultError] = useState<string | null>(null);

  const checkSession = useCallback(async () => {
    try {
      const resp = await apiFetch('/auth/me');
      if (resp.ok) {
        const data = await resp.json();
        setUser(data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchGithubToken = useCallback(async () => {
    setVaultError(null);
    try {
      const resp = await apiFetch('/auth/token-vault/github');
      if (resp.ok) {
        const data = await resp.json();
        setGithubToken(data.token);
        return data.token;
      } else {
        const err = await resp.json();
        setVaultError(err.detail || 'Token Vault exchange failed');
        return null;
      }
    } catch (e) {
      setVaultError(e instanceof Error ? e.message : 'Token Vault error');
      return null;
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // Auto-fetch GitHub token when user is logged in with refresh token
  useEffect(() => {
    if (user?.has_refresh_token && !githubToken) {
      fetchGithubToken();
    }
  }, [user, githubToken, fetchGithubToken]);

  const login = () => {
    window.location.href = '/auth/login';
  };

  const logout = () => {
    window.location.href = '/auth/logout';
  };

  return {
    user,
    loading,
    isAuthenticated: !!user,
    githubToken,
    vaultError,
    login,
    logout,
    fetchGithubToken,
  };
}
