import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from "@/lib/utils";
import {
    ChevronLeft,
    ChevronRight,
    LayoutDashboard,
    Stethoscope,
    FileText,
    ClipboardList,
    Settings,
    LogOut,
    User,
    Hospital,
    Receipt,
    DollarSign,
    Clock
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const Sidebar = () => {
    const [collapsed, setCollapsed] = useState(false);

    const toggleSidebar = () => setCollapsed(!collapsed);

    const navItems = [
        { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
        { icon: User, label: "MR Details", path: "/mr-details" },
        { icon: Receipt, label: "OPD Receipt", path: "/opd" },
        { icon: DollarSign, label: "Consultant Payments", path: "/consultant-payments" },
        { icon: Clock, label: "Shift Management", path: "/shift-management" },
        { icon: FileText, label: "Reports", path: "/reports" },
    ];

    return (
        <div
            className={cn(
                "flex flex-col h-full bg-medical-bg-card border-r border-medical-border transition-all duration-300 relative",
                collapsed ? "w-16" : "w-64"
            )}
        >
            {/* Logo Area */}
            <div className="h-16 flex items-center justify-center p-4">
                <Hospital className="h-8 w-8 text-medical-accent" />
                {!collapsed && (
                    <span className="ml-2 font-bold text-xl text-medical-blue truncate">
                        HIMS
                    </span>
                )}
            </div>

            <Separator />

            {/* Toggle Button */}
            <Button
                variant="ghost"
                size="icon"
                className="absolute -right-3 top-20 bg-background border shadow-sm rounded-full w-6 h-6 z-10"
                onClick={toggleSidebar}
            >
                {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>

            {/* Navigation */}
            <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => cn(
                            "flex items-center px-3 py-2 rounded-md transition-colors text-sm font-medium",
                            isActive
                                ? "bg-medical-blue/10 text-medical-blue"
                                : "text-medical-text-secondary hover:bg-muted hover:text-medical-text-primary",
                            collapsed && "justify-center"
                        )}
                        title={collapsed ? item.label : undefined}
                    >
                        <item.icon className={cn("h-5 w-5", !collapsed && "mr-3")} />
                        {!collapsed && <span>{item.label}</span>}
                    </NavLink>
                ))}
            </nav>

            {/* Bottom Actions */}
            <div className="p-2 mt-auto">
                <Separator className="mb-2" />
                <Button variant="ghost" className={cn("w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10", collapsed && "justify-center px-0")}>
                    <LogOut className={cn("h-5 w-5", !collapsed && "mr-3")} />
                    {!collapsed && <span>Logout</span>}
                </Button>
            </div>
        </div>
    );
};

export default Sidebar;
