import React from 'react';
import { Link } from 'react-router-dom';
import { Bell, User, Settings } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Navbar = () => {
    return (
        <header className="h-16 shrink-0 border-b border-medical-border bg-medical-bg-header/50 backdrop-blur-sm px-6 flex items-center justify-between">
            {/* Left side (Breadcrumbs or meaningful title) */}
            <div className="flex items-center">
                <h1 className="text-lg font-semibold text-medical-blue">
                    HIMS Enterprise
                </h1>
            </div>

            {/* Right side actions */}
            <div className="flex items-center space-x-4">
                {/* Setup Dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="border-medical-accent text-medical-accent hover:bg-medical-accent hover:text-white">
                            <Settings className="h-4 w-4 mr-2" />
                            Setup
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>System Configuration</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <Link to="/setup/doctors" className="cursor-pointer">Doctor Registration</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link to="/setup/opd-services" className="cursor-pointer">OPD Services Setup</Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>User Management</DropdownMenuItem>
                        <DropdownMenuItem>Role Permissions</DropdownMenuItem>
                        <DropdownMenuItem>Expense Heads</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <Button variant="ghost" size="icon" className="text-medical-text-muted hover:text-medical-text-primary">
                    <Bell className="h-5 w-5" />
                </Button>

                {/* User Profile */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-full bg-slate-200">
                            <User className="h-5 w-5 text-slate-600" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>My Account</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>Profile</DropdownMenuItem>
                        <DropdownMenuItem>Settings</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">Logout</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
};

export default Navbar;
