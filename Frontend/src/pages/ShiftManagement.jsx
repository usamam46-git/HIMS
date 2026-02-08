import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import {
    Calendar, Clock, Sun, Sunset, Moon, CheckCircle,
    AlertCircle, Play, StopCircle, RefreshCw, Receipt,
    DollarSign, Users
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
    getCurrentShift, getShiftsByDate, openShift, closeShift,
    getShiftSummary
} from '@/services/shiftService';
import { getReceiptsByShift } from '@/services/opdReceiptService';

const SHIFT_TYPES = [
    { id: 'Morning', icon: Sun, color: 'text-yellow-600 bg-yellow-50', time: '06:00 - 14:00' },
    { id: 'Evening', icon: Sunset, color: 'text-orange-600 bg-orange-50', time: '14:00 - 22:00' },
    { id: 'Night', icon: Moon, color: 'text-indigo-600 bg-indigo-50', time: '22:00 - 06:00' }
];

const ShiftManagement = () => {
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // State
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [shiftsForDate, setShiftsForDate] = useState([]);
    const [currentShift, setCurrentShift] = useState(null);
    const [selectedShiftType, setSelectedShiftType] = useState('Morning');
    const [userName, setUserName] = useState('Admin'); // Would come from auth

    // Shift Summary (for closing)
    const [shiftSummary, setShiftSummary] = useState(null);
    const [shiftReceipts, setShiftReceipts] = useState([]);

    useEffect(() => {
        loadCurrentShift();
    }, []);

    useEffect(() => {
        loadShiftsForDate();
    }, [selectedDate]);

    useEffect(() => {
        if (currentShift) {
            loadShiftDetails(currentShift.shift_id);
        }
    }, [currentShift]);

    const loadCurrentShift = async () => {
        try {
            const response = await getCurrentShift();
            if (response.success && response.data) {
                setCurrentShift(response.data);
            } else {
                setCurrentShift(null);
            }
        } catch (err) {
            console.error('Error loading current shift:', err);
        }
    };

    const loadShiftsForDate = async () => {
        setLoading(true);
        try {
            const dateStr = selectedDate.toISOString().split('T')[0];
            const response = await getShiftsByDate(dateStr);
            if (response.success) {
                setShiftsForDate(response.data);
            }
        } catch (err) {
            console.error('Error loading shifts:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadShiftDetails = async (shiftId) => {
        try {
            const receiptsResponse = await getReceiptsByShift(shiftId);
            if (receiptsResponse.success) {
                setShiftReceipts(receiptsResponse.data);

                // Calculate summary
                const receipts = receiptsResponse.data;
                const summary = {
                    receiptCount: receipts.length,
                    receiptFrom: receipts.length > 0 ? receipts[0].receipt_id : 'N/A',
                    receiptTo: receipts.length > 0 ? receipts[receipts.length - 1].receipt_id : 'N/A',
                    totalAmount: receipts.reduce((sum, r) => sum + parseFloat(r.total_amount || 0), 0),
                    totalDiscount: receipts.reduce((sum, r) => sum + parseFloat(r.discount_amount || 0), 0),
                    totalPaid: receipts.reduce((sum, r) => sum + parseFloat(r.paid || 0), 0),
                    totalBalance: receipts.reduce((sum, r) => sum + parseFloat(r.balance || 0), 0),
                    drShareAmount: receipts.reduce((sum, r) => sum + parseFloat(r.dr_share_amount || 0), 0),
                };
                setShiftSummary(summary);
            }
        } catch (err) {
            console.error('Error loading shift details:', err);
        }
    };

    const handleOpenShift = async () => {
        if (currentShift) {
            setError('Please close the current shift before opening a new one.');
            return;
        }

        setSubmitting(true);
        setError(null);
        setSuccess(null);

        try {
            const dateStr = selectedDate.toISOString().split('T')[0];
            const response = await openShift({
                shift_date: dateStr,
                shift_type: selectedShiftType,
                opened_by: userName
            });

            if (response.success) {
                setSuccess(`${selectedShiftType} shift opened successfully!`);
                setCurrentShift(response.data);
                loadShiftsForDate();
            } else {
                setError(response.message || 'Failed to open shift');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to open shift');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCloseShift = async () => {
        if (!currentShift) {
            setError('No active shift to close.');
            return;
        }

        setSubmitting(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await closeShift(currentShift.shift_id, userName);

            if (response.success) {
                setSuccess(`Shift closed successfully! ID: ${currentShift.shift_id}`);
                setCurrentShift(null);
                setShiftSummary(null);
                setShiftReceipts([]);
                loadShiftsForDate();
            } else {
                setError(response.message || 'Failed to close shift');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to close shift');
        } finally {
            setSubmitting(false);
        }
    };

    const getShiftStatus = (shiftType) => {
        const shift = shiftsForDate.find(s => s.shift_type === shiftType);
        if (!shift) return { status: 'not_started', label: 'Not Started', className: 'bg-gray-100 text-gray-600' };
        if (shift.is_closed) return { status: 'closed', label: 'Closed', className: 'bg-green-100 text-green-700', shift };
        return { status: 'open', label: 'Open', className: 'bg-blue-100 text-blue-700', shift };
    };

    const dateStr = selectedDate.toISOString().split('T')[0];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-medical-blue">Shift Management</h2>
                    <p className="text-medical-text-muted mt-1">Open, close, and manage daily shifts</p>
                </div>
                <Button onClick={loadShiftsForDate} variant="outline" size="sm" className="h-9">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Data
                </Button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                {/* Left: Calendar and Shift Selection */}
                <div className="xl:col-span-4 space-y-6">
                    {/* Calendar */}
                    <Card className="border-medical-border shadow-sm">
                        <CardHeader className="pb-3 border-b bg-slate-50">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-blue-600" />
                                Select Date
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="p-4 flex justify-center">
                                <DatePicker
                                    selected={selectedDate}
                                    onChange={(date) => setSelectedDate(date)}
                                    inline
                                    maxDate={new Date()}
                                    calendarClassName="!w-full !border-0 !font-sans"
                                    dayClassName={() => "rounded-full hover:bg-blue-50"}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Shift Status for Date */}
                    <Card className="border-medical-border shadow-sm">
                        <CardHeader className="pb-3 border-b bg-slate-50">
                            <CardTitle className="text-lg">Shifts for {dateStr}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3">
                            {SHIFT_TYPES.map((type) => {
                                const Icon = type.icon;
                                const shiftStatus = getShiftStatus(type.id);
                                const isActive = currentShift?.shift_type === type.id;

                                return (
                                    <div
                                        key={type.id}
                                        className={`flex items-center justify-between p-4 rounded-xl border transition-all ${isActive
                                                ? 'border-blue-500 bg-blue-50/50 shadow-sm ring-1 ring-blue-200'
                                                : 'hover:border-blue-200 hover:bg-slate-50'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`p-3 rounded-xl ${type.color} shadow-sm`}>
                                                <Icon className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-gray-900">{type.id}</div>
                                                <div className="text-sm text-gray-500 font-medium">{type.time}</div>
                                            </div>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${shiftStatus.className}`}>
                                            {shiftStatus.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>
                </div>

                {/* Right: Shift Actions */}
                <div className="xl:col-span-8 space-y-6">
                    {/* Open Shift Panel */}
                    {!currentShift && (
                        <Card className="border-medical-border shadow-md">
                            <CardHeader className="pb-4 border-b bg-slate-50">
                                <CardTitle className="text-xl flex items-center gap-2 text-gray-800">
                                    <Play className="h-6 w-6 text-green-600" />
                                    Open New Shift
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-base">Shift Type</Label>
                                        <select
                                            className="flex h-12 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                            value={selectedShiftType}
                                            onChange={(e) => setSelectedShiftType(e.target.value)}
                                        >
                                            {SHIFT_TYPES.map((type) => {
                                                const status = getShiftStatus(type.id);
                                                return (
                                                    <option
                                                        key={type.id}
                                                        value={type.id}
                                                        disabled={status.status !== 'not_started'}
                                                    >
                                                        {type.id} {status.status !== 'not_started' ? `(Already ${status.label})` : ''}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-base">Opened By</Label>
                                        <Input
                                            value={userName}
                                            onChange={(e) => setUserName(e.target.value)}
                                            placeholder="Enter your name"
                                            className="h-12"
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <div className="p-4 rounded-lg bg-red-50 text-red-700 text-sm flex items-center gap-2 border border-red-200">
                                        <AlertCircle className="h-5 w-5" /> {error}
                                    </div>
                                )}
                                {success && (
                                    <div className="p-4 rounded-lg bg-green-50 text-green-700 text-sm flex items-center gap-2 border border-green-200">
                                        <CheckCircle className="h-5 w-5" /> {success}
                                    </div>
                                )}

                                <div className="flex justify-end">
                                    <Button
                                        onClick={handleOpenShift}
                                        disabled={submitting}
                                        className="w-full md:w-auto md:min-w-[200px] h-12 text-base bg-green-600 hover:bg-green-700 shadow-sm"
                                    >
                                        {submitting ? 'Opening Shift...' : 'Open Shift Now'}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Current Shift Panel */}
                    {currentShift && (
                        <div className="space-y-6">
                            <Card className="border-green-200 bg-green-50/50 shadow-md">
                                <CardHeader className="pb-4 border-b border-green-200 bg-green-100/50">
                                    <CardTitle className="text-xl flex items-center gap-2 text-green-800">
                                        <Clock className="h-6 w-6" />
                                        Current Active Shift
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                                        <div className="bg-white/60 p-4 rounded-lg border border-green-100">
                                            <span className="text-gray-600 block mb-1">Shift ID</span>
                                            <div className="text-xl font-bold font-mono text-green-900">{currentShift.shift_id}</div>
                                        </div>
                                        <div className="bg-white/60 p-4 rounded-lg border border-green-100">
                                            <span className="text-gray-600 block mb-1">Type</span>
                                            <div className="text-xl font-bold text-green-900">{currentShift.shift_type}</div>
                                        </div>
                                        <div className="bg-white/60 p-4 rounded-lg border border-green-100">
                                            <span className="text-gray-600 block mb-1">Date</span>
                                            <div className="text-xl font-bold text-green-900">{currentShift.shift_date}</div>
                                        </div>
                                        <div className="bg-white/60 p-4 rounded-lg border border-green-100">
                                            <span className="text-gray-600 block mb-1">Opened By</span>
                                            <div className="text-xl font-bold text-green-900">{currentShift.opened_by}</div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Shift Summary */}
                            {shiftSummary && (
                                <Card className="border-medical-border shadow-md">
                                    <CardHeader className="pb-4 border-b bg-slate-50">
                                        <CardTitle className="text-xl flex items-center gap-2">
                                            <Receipt className="h-6 w-6 text-blue-600" />
                                            Live Shift Summary
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-6">
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm mb-6">
                                            <div className="p-4 bg-slate-50 rounded-xl border">
                                                <span className="text-gray-500 font-medium">Receipts Generated</span>
                                                <div className="text-2xl font-bold mt-1">{shiftSummary.receiptCount}</div>
                                            </div>
                                            <div className="p-4 bg-slate-50 rounded-xl border">
                                                <span className="text-gray-500 font-medium">Total Amount</span>
                                                <div className="text-2xl font-bold font-mono mt-1">
                                                    Rs. {shiftSummary.totalAmount.toLocaleString()}
                                                </div>
                                            </div>
                                            <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                                                <span className="text-green-700 font-medium">Total Collected</span>
                                                <div className="text-2xl font-bold font-mono text-green-700 mt-1">
                                                    Rs. {shiftSummary.totalPaid.toLocaleString()}
                                                </div>
                                            </div>
                                            <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                                                <span className="text-red-700 font-medium">Balance Due</span>
                                                <div className="text-2xl font-bold font-mono text-red-700 mt-1">
                                                    Rs. {shiftSummary.totalBalance.toLocaleString()}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm border-t pt-6">
                                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                                <span className="text-gray-600 font-medium">Receipt Range</span>
                                                <span className="font-mono font-bold text-base">
                                                    {shiftSummary.receiptFrom} <span className="text-gray-400 mx-2">→</span> {shiftSummary.receiptTo}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                                <span className="text-gray-600 font-medium">Doctor Shares</span>
                                                <span className="font-mono font-bold text-base">Rs. {shiftSummary.drShareAmount.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Close Shift */}
                            <Card className="border-red-200 shadow-md">
                                <CardHeader className="pb-4 border-b border-red-100 bg-red-50/50">
                                    <CardTitle className="text-xl flex items-center gap-2 text-red-700">
                                        <StopCircle className="h-6 w-6" />
                                        Close Shift
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6 space-y-6">
                                    <div className="space-y-2">
                                        <Label className="text-base">Closed By</Label>
                                        <Input
                                            value={userName}
                                            onChange={(e) => setUserName(e.target.value)}
                                            placeholder="Enter your name"
                                            className="h-12"
                                        />
                                    </div>

                                    {error && (
                                        <div className="p-4 rounded-lg bg-red-50 text-red-700 text-sm flex items-center gap-2 border border-red-200">
                                            <AlertCircle className="h-5 w-5" /> {error}
                                        </div>
                                    )}
                                    {success && (
                                        <div className="p-4 rounded-lg bg-green-50 text-green-700 text-sm flex items-center gap-2 border border-green-200">
                                            <CheckCircle className="h-5 w-5" /> {success}
                                        </div>
                                    )}

                                    <Button
                                        onClick={handleCloseShift}
                                        disabled={submitting}
                                        variant="destructive"
                                        className="h-12 text-base w-full shadow-sm hover:bg-red-700"
                                    >
                                        {submitting ? 'Closing Shift...' : 'Close Shift & Save Summary'}
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ShiftManagement;
