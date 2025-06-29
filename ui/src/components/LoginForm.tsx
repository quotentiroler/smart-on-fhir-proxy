import { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { Panel, Form, FormSection } from '@medplum/react';

export function LoginForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchProfile = useAuthStore((state) => state.fetchProfile);

  const handleFormSubmit = async (formData: Record<string, string>) => {
    setLoading(true);
    setError(null);

    const username = formData.username;
    const password = formData.password;

    try {
      // For development, simulate OAuth flow
      // In production, this would redirect to Keycloak
      const response = await fetch('/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'password',
          username,
          password,
          client_id: 'admin-ui',
        }),
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      setAccessToken(data.access_token);
      
      // Fetch the profile using the store
      await fetchProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-full max-w-md">
        <Panel>
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold">Healthcare Admin</h2>
            <p className="text-gray-600 mt-2">Sign in to access the admin dashboard</p>
          </div>
          
          <Form onSubmit={handleFormSubmit}>
            <FormSection title="">
              <div className="space-y-4">
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                    Username
                  </label>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    disabled={loading}
                    placeholder="Enter your username"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    disabled={loading}
                    placeholder="Enter your password"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                {error && (
                  <div className="text-red-600 text-sm">{error}</div>
                )}
                <button 
                  type="submit" 
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50" 
                  disabled={loading}
                >
                  {loading ? 'Signing in...' : 'Sign in'}
                </button>
              </div>
            </FormSection>
          </Form>
          
          <div className="mt-4 text-center text-sm text-gray-600">
            <p>For development, use any credentials</p>
          </div>
        </Panel>
      </div>
    </div>
  );
}
