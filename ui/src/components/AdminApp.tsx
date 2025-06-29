import { SmartAppsManager } from './SmartAppsManager';
import { IdPManager } from './IdPManager';
import { useState } from 'react';
import { Navigation } from './Navigation';
import { HealthcareUsersManager } from './HealthcareUsersManager';
import { useAuth } from '../stores/authStore';
import { LoginForm } from './LoginForm';
import { Loading, Document, Panel, AppShell } from '@medplum/react';

export function AdminApp() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const { profile, loading, error } = useAuth();

    // Show loading state while fetching profile
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loading />
            </div>
        );
    }

    // Show error state if profile fetch failed
    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-600 text-xl mb-4">⚠️</div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Error</h2>
                    <p className="text-gray-600">{error}</p>
                    <button 
                        onClick={() => window.location.reload()} 
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    // Show login prompt if no profile (not authenticated)
    if (!profile) {
        return <LoginForm />;
    }

    return (
        <AppShell logo={<div>Healthcare Admin</div>}>
            <Navigation activeTab={activeTab} onTabChange={setActiveTab} profile={profile} />
            <main className="container mx-auto px-4 py-8">
                {activeTab === 'dashboard' && <Dashboard />}
                {activeTab === 'smart-apps' && <SmartAppsManager />}
                {activeTab === 'users' && <HealthcareUsersManager />}
                {activeTab === 'idp' && <IdPManager />}
            </main>
        </AppShell>
    );
}

function Dashboard() {
    const { profile, fetchProfile } = useAuth();
    const handleRefresh = () => {
        fetchProfile();
    };

    return (
        <Document>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Healthcare Admin Dashboard</h1>
                        <p className="text-gray-600 mt-2">
                            Welcome back, {profile?.firstName && profile?.lastName 
                                ? `${profile.firstName} ${profile.lastName}` 
                                : profile?.username || 'User'}
                        </p>
                    </div>
                    <button
                        onClick={handleRefresh}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                    >
                        Refresh Data
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Panel>
                        <h3 className="text-lg font-semibold mb-2">SMART on FHIR Apps</h3>
                        <p className="text-gray-600 mb-4">Manage registered applications</p>
                        <div className="text-2xl font-bold text-blue-600">12</div>
                        <p className="text-sm text-gray-600">Active applications</p>
                    </Panel>

                    <Panel>
                        <h3 className="text-lg font-semibold mb-2">Healthcare Users</h3>
                        <p className="text-gray-600 mb-4">Manage user accounts</p>
                        <div className="text-2xl font-bold text-green-600">247</div>
                        <p className="text-sm text-gray-600">Registered users</p>
                    </Panel>

                    <Panel>
                        <h3 className="text-lg font-semibold mb-2">IdP Management</h3>
                        <p className="text-gray-600 mb-4">Identity provider configurations</p>
                        <div className="text-2xl font-bold text-purple-600">5</div>
                        <p className="text-sm text-gray-600">Active providers</p>
                    </Panel>
                </div>
            </div>
        </Document>
    );
}
