import React, { useState, useEffect } from 'react';
import {
    Stethoscope, Calendar, Search, Filter, DollarSign,
    Users, Clock, TrendingUp, RefreshCw
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAllPayments, getPaymentSummary } from '@/services/consultantPaymentsService';

const ConsultantPayments = () => {
    const [loading, setLoading] = useState(true);
    const [payments, setPayments] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);

    // Summary stats
    const [stats, setStats] = useState({
        totalPayments: 0,
        totalAmount: 0,
        pendingCount: 0,
        uniqueDoctors: 0
    });

    useEffect(() => {
        loadPayments();
    }, [dateFilter]);

    const loadPayments = async () => {
        setLoading(true);
        try {
            const response = await getAllPayments({ date: dateFilter });
            if (response.success) {
                setPayments(response.data);

                // Calculate stats
                const totalAmount = response.data.reduce((sum, p) => sum + parseFloat(p.payment_amount), 0);
                const pending = response.data.filter(p => !p.shift_closed).length;
                const doctors = new Set(response.data.map(p => p.doctor_name)).size;

                setStats({
                    totalPayments: response.data.length,
                    totalAmount,
                    pendingCount: pending,
                    uniqueDoctors: doctors
                });
            }
        } catch (err) {
            console.error('Failed to load payments:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredPayments = payments.filter(p =>
        p.doctor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.patient_id?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-medical-blue">Consultant Payments</h2>
                    <p className="text-medical-text-muted text-sm">Doctor share tracking and management</p>
                </div>
                <Button onClick={loadPayments} variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-medical-border">
                    <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Total Payments</p>
                                <p className="text-2xl font-bold">{stats.totalPayments}</p>
                            </div>
                            <TrendingUp className="h-8 w-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-medical-border">
                    <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Total Amount</p>
                                <p className="text-2xl font-bold">Rs. {stats.totalAmount.toLocaleString()}</p>
                            </div>
                            <DollarSign className="h-8 w-8 text-green-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-medical-border">
                    <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Pending</p>
                                <p className="text-2xl font-bold">{stats.pendingCount}</p>
                            </div>
                            <Clock className="h-8 w-8 text-orange-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-medical-border">
                    <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Doctors</p>
                                <p className="text-2xl font-bold">{stats.uniqueDoctors}</p>
                            </div>
                            <Users className="h-8 w-8 text-purple-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card className="border-medical-border">
                <CardContent className="pt-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search by doctor or patient..."
                                className="pl-9"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="w-full md:w-48">
                            <Input
                                type="date"
                                value={dateFilter}
                                onChange={(e) => setDateFilter(e.target.value)}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Payments Table */}
            <Card className="border-medical-border">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Stethoscope className="h-5 w-5 text-medical-accent" />
                        Payment Records
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8 text-gray-500">Loading payments...</div>
                    ) : filteredPayments.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">No payments found for this date</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-slate-50">
                                        <th className="text-left p-3">Time</th>
                                        <th className="text-left p-3">Doctor</th>
                                        <th className="text-left p-3">Patient</th>
                                        <th className="text-left p-3">Service</th>
                                        <th className="text-right p-3">Total</th>
                                        <th className="text-right p-3">Share %</th>
                                        <th className="text-right p-3">Amount</th>
                                        <th className="text-center p-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredPayments.map((payment) => (
                                        <tr key={payment.srl_no} className="border-b hover:bg-slate-50">
                                            <td className="p-3 font-mono text-xs">{payment.payment_time}</td>
                                            <td className="p-3 font-medium">{payment.doctor_name}</td>
                                            <td className="p-3">
                                                <div>{payment.patient_name}</div>
                                                <div className="text-xs text-gray-500">{payment.patient_id}</div>
                                            </td>
                                            <td className="p-3">{payment.patient_service}</td>
                                            <td className="p-3 text-right font-mono">
                                                Rs. {parseFloat(payment.total).toLocaleString()}
                                            </td>
                                            <td className="p-3 text-right font-mono">{payment.payment_share}%</td>
                                            <td className="p-3 text-right font-mono font-medium text-green-600">
                                                Rs. {parseFloat(payment.payment_amount).toLocaleString()}
                                            </td>
                                            <td className="p-3 text-center">
                                                <span className={`px-2 py-1 rounded-full text-xs ${payment.shift_closed
                                                        ? 'bg-gray-100 text-gray-600'
                                                        : 'bg-green-100 text-green-700'
                                                    }`}>
                                                    {payment.shift_closed ? 'Closed' : 'Active'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default ConsultantPayments;
