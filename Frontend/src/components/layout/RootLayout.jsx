import React from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { Toaster } from 'sonner';
import { Outlet } from 'react-router-dom';

const RootLayout = () => {
    return (
        <div className="flex h-screen w-full bg-medical-bg-app overflow-hidden font-sans text-medical-text-primary">
            <Sidebar />
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                <Navbar />
                <main className="flex-1 overflow-x-hidden overflow-y-auto p-6 bg-medical-bg-app relative scroll-smooth">
                    <Outlet />
                </main>
            </div>
            <Toaster richColors />
        </div>
    );
};

export default RootLayout;
