import React from 'react';
import {
    Users,
    CreditCard,
    Activity,
    TrendingUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Dashboard = () => {
    const stats = [
        {
            title: "Today's OPD",
            value: "128",
            description: "+12% from yesterday",
            icon: Users,
            color: "text-blue-600",
            bgColor: "bg-blue-100"
        },
        {
            title: "Revenue",
            value: "PKR 45,200",
            description: "Daily Collection",
            icon: CreditCard,
            color: "text-green-600",
            bgColor: "bg-green-100"
        },
        {
            title: "Active Doctors",
            value: "14",
            description: "Currently checked-in",
            icon: Activity,
            color: "text-indigo-600",
            bgColor: "bg-indigo-100"
        },
        {
            title: "Avg Wait Time",
            value: "12m",
            description: "-2m improvement",
            icon: TrendingUp,
            color: "text-amber-600",
            bgColor: "bg-amber-100"
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight text-medical-blue">Dashboard</h2>
                <div className="text-sm text-medical-text-muted">
                    Welcome back, Admin
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat, index) => (
                    <Card key={index} className="border-medical-border shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-medical-text-secondary">
                                {stat.title}
                            </CardTitle>
                            <div className={`p-2 rounded-full ${stat.bgColor}`}>
                                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-medical-text-primary">{stat.value}</div>
                            <p className="text-xs text-medical-text-muted mt-1">
                                {stat.description}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4 border-medical-border shadow-sm">
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[200px] flex items-center justify-center text-medical-text-muted bg-slate-50 rounded-md border border-dashed border-slate-200">
                            Chart Placeholder: Patient Volume Trend
                        </div>
                    </CardContent>
                </Card>
                <Card className="col-span-3 border-medical-border shadow-sm">
                    <CardHeader>
                        <CardTitle>Shift Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between border-b pb-2">
                                <span className="text-sm font-medium">Morning Shift</span>
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Completed</span>
                            </div>
                            <div className="flex items-center justify-between border-b pb-2">
                                <span className="text-sm font-medium">Evening Shift</span>
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Active</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Night Shift</span>
                                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">Pending</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default Dashboard;
