import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { cn } from "@/lib/utils";
import { FileText, Sun, Calendar, CalendarDays } from 'lucide-react';

const ReportsLayout = () => {
    const location = useLocation();

    const tabs = [
        { path: "/reports/shift", label: "Shift Report", icon: Sun },
        { path: "/reports/daily", label: "Day Closing", icon: Calendar }, // Placeholder for future
        { path: "/reports/monthly", label: "Monthly", icon: CalendarDays }, // Placeholder
        { path: "/reports/yearly", label: "Yearly", icon: FileText }, // Placeholder
    ];

    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            <div className="bg-white border-b px-6 py-3">
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <FileText className="h-6 w-6 text-blue-600" />
                    Reports
                </h1>
                <p className="text-slate-500 text-sm mt-1">
                    Financial and operational reports
                </p>

                <div className="flex space-x-1 mt-6 border-b border-slate-200">
                    {tabs.map((tab) => (
                        <NavLink
                            key={tab.path}
                            to={tab.path}
                            className={({ isActive }) => cn(
                                "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px hover:text-blue-600",
                                isActive
                                    ? "border-blue-600 text-blue-600 bg-blue-50/50"
                                    : "border-transparent text-slate-600 hover:border-slate-300"
                            )}
                        >
                            <tab.icon className="h-4 w-4" />
                            {tab.label}
                        </NavLink>
                    ))}
                </div>
            </div>

            <div className="flex-1 p-6 overflow-auto">
                <Outlet />
            </div>
        </div>
    );
};

export default ReportsLayout;
