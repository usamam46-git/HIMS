import React, { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Printer, RefreshCw, Filter, DollarSign, Wallet, ShoppingBag } from 'lucide-react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

const ShiftReport = () => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedShiftType, setSelectedShiftType] = useState("All");
    const [loading, setLoading] = useState(false);
    const [opdData, setOpdData] = useState([]);
    const [expenses, setExpenses] = useState([]);

    // Fetch Data
    const fetchData = async () => {
        setLoading(true);
        try {
            const dateStr = format(selectedDate, 'yyyy-MM-dd');

            // Fetch OPD Data
            const opdParams = {
                shift_date: dateStr, // Use shift_date for filtering by logical date
                // limit: 10000 // Ensure we get all records
            };

            if (selectedShiftType !== "All") {
                opdParams.shift_type = selectedShiftType;
            }

            const opdRes = await axiosInstance.get('/opd-patient-data', { params: opdParams });

            if (opdRes.data.success) {
                // Filter out previous night shift logic if "All" is selected
                // The backend filtering by shift_date should handle the logical date assignment
                // But if we need to be extra careful about the "3 shifts starting on that day" rule:
                // Morning (starts ~6am), Evening (starts ~2pm), Night (starts ~10pm)
                // If the backend 'shift_date' is correctly assigned on creation, we can trust it.
                // Assuming 'shift_date' in DB represents the logical day the shift belongs to.
                setOpdData(opdRes.data.data);
            }

            // Fetch Expenses
            const expenseParams = {
                shift_date: dateStr,
                // limit: 10000
            };
            if (selectedShiftType !== "All") {
                expenseParams.shift_type = selectedShiftType; // Mapped to expense_shift in backend
            }

            const expenseRes = await axiosInstance.get('/expenses', { params: expenseParams });

            if (expenseRes.data.success) {
                setExpenses(expenseRes.data.data);
            }

        } catch (error) {
            console.error("Error fetching report data:", error);
            toast.error("Failed to fetch report data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [selectedDate, selectedShiftType]);

    // Calculate Totals
    const {
        totalRevenue,
        totalExpensesWithDocShare,
        netHospitalRevenue,
        consultationData,
        otherData,
        expenseTotalOnly
    } = useMemo(() => {
        // 1. Calculate Revenue and Doctor Shares from OPD Data
        let revenue = 0;
        let totalDocShare = 0;

        const consultMap = new Map();
        const otherMap = new Map();

        opdData.forEach(record => {
            const amount = Number(record.total_amount) || 0; // Use total_amount (which is usually the charged amount)
            const docShare = Number(record.dr_share_amount) || 0;
            const hospitalShare = Number(record.hospital_share) || (amount - docShare);
            const isConsultation = record.opd_service === 'Consultation';

            revenue += amount;
            totalDocShare += docShare;

            if (isConsultation) {
                const drName = record.service_detail || "Unknown Doctor";
                if (!consultMap.has(drName)) {
                    consultMap.set(drName, { name: drName, total: 0, share: 0, hospital: 0, count: 0 });
                }
                const entry = consultMap.get(drName);
                entry.total += amount;
                entry.share += docShare;
                entry.hospital += hospitalShare;
                entry.count += 1;
            } else {
                const serviceName = record.opd_service || "Other";
                if (!otherMap.has(serviceName)) {
                    otherMap.set(serviceName, { name: serviceName, total: 0, share: 0, hospital: 0, count: 0 });
                }
                const entry = otherMap.get(serviceName);
                entry.total += amount;
                entry.share += docShare;
                entry.hospital += hospitalShare;
                entry.count += 1;
            }
        });

        // 2. Calculate Expenses
        const expenseTotal = expenses.reduce((sum, exp) => sum + (Number(exp.expense_amount) || 0), 0);

        // 3. Totals
        // User said: "doctor share in case of consultancy will also add up to expenses"
        const finalTotalExpenses = expenseTotal + totalDocShare;
        const netRevenue = revenue - finalTotalExpenses;

        return {
            totalRevenue: revenue,
            totalExpensesWithDocShare: finalTotalExpenses,
            netHospitalRevenue: netRevenue,
            consultationData: Array.from(consultMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
            otherData: Array.from(otherMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
            expenseTotalOnly: expenseTotal
        };
    }, [opdData, expenses]);


    const handlePrint = () => {
        const printWindow = window.open("", "", "width=1000,height=800");
        const dateStr = format(selectedDate, "dd/MM/yyyy");
        const shiftStr = selectedShiftType === "All" ? "All Shifts" : selectedShiftType;

        printWindow.document.write(`
            <html>
                <head>
                    <title>Shift Report - ${dateStr}</title>
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 12px; padding: 20px; color: #333; }
                        h1 { text-align: center; margin-bottom: 5px; color: #111; text-transform: uppercase; letter-spacing: 1px; }
                        .hosp-name { text-align: center; font-size: 16px; font-weight: bold; margin-bottom: 20px; color: #555; }
                        .meta { margin-bottom: 20px; border-bottom: 2px solid #eee; padding-bottom: 15px; display: flex; justify-content: space-between; }
                        .meta-item { font-size: 14px; }
                        h2 { margin-top: 25px; font-size: 14px; border-bottom: 1px solid #ccc; padding-bottom: 5px; color: #444; }
                        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #f3f4f6; font-weight: 600; color: #374151; font-size: 11px; text-transform: uppercase; }
                        .right { text-align: right; }
                        .total-row { font-weight: bold; background-color: #f9fafb; }
                        .summary-box { margin-top: 40px; border: 1px solid #ddd; padding: 15px; width: 300px; margin-left: auto; background: #fff; page-break-inside: avoid; }
                        .summary-item { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
                        .summary-item.total { font-weight: bold; border-top: 1px solid #ddd; padding-top: 8px; margin-top: 8px; font-size: 14px; }
                        .footer { margin-top: 50px; text-align: center; font-size: 10px; color: #999; }
                    </style>
                </head>
                <body>
                    <h1>Shift Report</h1>
                    <div class="hosp-name">Health Management System</div>
                    
                    <div class="meta">
                        <div class="meta-item">Date: <strong>${dateStr}</strong></div>
                        <div class="meta-item">Shift: <strong>${shiftStr}</strong></div>
                        <div class="meta-item">Printed: ${format(new Date(), "dd/MM/yyyy HH:mm")}</div>
                    </div>

                    <h2>Consultations (Doctors)</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Doctor Name</th>
                                <th class="right">Total Amount</th>
                                <th class="right">Dr. Share</th>
                                <th class="right">Hospital Share</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${consultationData.map(r => `
                                <tr>
                                    <td>${r.name}</td>
                                    <td class="right">${r.total.toLocaleString()}</td>
                                    <td class="right">${r.share.toLocaleString()}</td>
                                    <td class="right">${r.hospital.toLocaleString()}</td>
                                </tr>
                            `).join('')}
                            <tr class="total-row">
                                <td>Total</td>
                                <td class="right">${consultationData.reduce((s, c) => s + c.total, 0).toLocaleString()}</td>
                                <td class="right">${consultationData.reduce((s, c) => s + c.share, 0).toLocaleString()}</td>
                                <td class="right">${consultationData.reduce((s, c) => s + c.hospital, 0).toLocaleString()}</td>
                            </tr>
                        </tbody>
                    </table>

                    <h2>Other Services</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Service Name</th>
                                <th class="right">Total Amount</th>
                                <th class="right">Dr. Share</th>
                                <th class="right">Hospital Share</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${otherData.map(r => `
                                <tr>
                                    <td>${r.name}</td>
                                    <td class="right">${r.total.toLocaleString()}</td>
                                    <td class="right">${r.share.toLocaleString()}</td>
                                    <td class="right">${r.hospital.toLocaleString()}</td>
                                </tr>
                            `).join('')}
                             <tr class="total-row">
                                <td>Total</td>
                                <td class="right">${otherData.reduce((s, c) => s + c.total, 0).toLocaleString()}</td>
                                <td class="right">${otherData.reduce((s, c) => s + c.share, 0).toLocaleString()}</td>
                                <td class="right">${otherData.reduce((s, c) => s + c.hospital, 0).toLocaleString()}</td>
                            </tr>
                        </tbody>
                    </table>

                    <h2>Expenses</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Expense Name</th>
                                <th>Description</th>
                                <th class="right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${expenses.map(r => `
                                <tr>
                                    <td>${r.expense_name}</td>
                                    <td>${r.expense_description || '-'}</td>
                                    <td class="right">${Number(r.expense_amount).toLocaleString()}</td>
                                </tr>
                            `).join('')}
                             <tr class="total-row">
                                <td colspan="2">Total Direct Expenses</td>
                                <td class="right">${expenseTotalOnly.toLocaleString()}</td>
                            </tr>
                        </tbody>
                    </table>

                    <div class="summary-box">
                        <div class="summary-item">
                            <span>Total Revenue:</span>
                            <span>${totalRevenue.toLocaleString()}</span>
                        </div>
                        <div class="summary-item">
                            <span>Direct Expenses:</span>
                            <span>(-) ${expenseTotalOnly.toLocaleString()}</span>
                        </div>
                         <div class="summary-item">
                            <span>Doctor Shares:</span>
                            <span>(-) ${totalDocShare.toLocaleString()}</span>
                        </div>
                        <div class="summary-item total">
                            <span>Net Hospital Revenue:</span>
                            <span>${netHospitalRevenue.toLocaleString()}</span>
                        </div>
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    };


    return (
        <div className="space-y-6">
            {/* Controls */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="space-y-2">
                            <Label>Date</Label>
                            <div className="relative">
                                <DatePicker
                                    selected={selectedDate}
                                    onChange={(date) => setSelectedDate(date)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    dateFormat="dd/MM/yyyy"
                                />
                                <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                            </div>
                        </div>

                        <div className="space-y-2 w-full md:w-48">
                            <Label>Shift</Label>
                            <Select value={selectedShiftType} onValueChange={setSelectedShiftType}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Shift" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="All">All Shifts</SelectItem>
                                    <SelectItem value="Morning">Morning</SelectItem>
                                    <SelectItem value="Evening">Evening</SelectItem>
                                    <SelectItem value="Night">Night</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex gap-2 ml-auto">
                            <Button variant="outline" onClick={fetchData} disabled={loading}>
                                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                                Refresh
                            </Button>
                            <Button onClick={handlePrint} disabled={opdData.length === 0 && expenses.length === 0}>
                                <Printer className="h-4 w-4 mr-2" />
                                Print Report
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-blue-50 border-blue-100">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-blue-800">Total Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-700">Rs {totalRevenue.toLocaleString()}</div>
                        <p className="text-xs text-blue-600 mt-1">All OPD Services</p>
                    </CardContent>
                </Card>

                <Card className="bg-red-50 border-red-100">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-red-800">Total Expenses</CardTitle>
                        <ShoppingBag className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-700">Rs {totalExpensesWithDocShare.toLocaleString()}</div>
                        <p className="text-xs text-red-600 mt-1">Direct Expenses + Dr. Shares</p>
                    </CardContent>
                </Card>

                <Card className="bg-emerald-50 border-emerald-100">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-emerald-800">Net Hospital Revenue</CardTitle>
                        <Wallet className="h-4 w-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-700">Rs {netHospitalRevenue.toLocaleString()}</div>
                        <p className="text-xs text-emerald-600 mt-1">Revenue - All Expenses</p>
                    </CardContent>
                </Card>
            </div>

            {/* Consultation Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Filter className="h-4 w-4 text-blue-600" />
                        Consultation (Doctors)
                    </CardTitle>
                    <CardDescription>Breakdown of revenue by doctor</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Doctor Name</TableHead>
                                <TableHead className="text-right">Total Amount</TableHead>
                                <TableHead className="text-right">Dr. Share</TableHead>
                                <TableHead className="text-right">Hospital Share</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {consultationData.length > 0 ? (
                                consultationData.map((record) => (
                                    <TableRow key={record.name}>
                                        <TableCell className="font-medium">{record.name}</TableCell>
                                        <TableCell className="text-right">{record.total.toLocaleString()}</TableCell>
                                        <TableCell className="text-right text-red-500">{record.share.toLocaleString()}</TableCell>
                                        <TableCell className="text-right text-emerald-600 font-medium">{record.hospital.toLocaleString()}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colspan={4} className="text-center py-6 text-slate-500">No consultation records found</TableCell>
                                </TableRow>
                            )}
                            {consultationData.length > 0 && (
                                <TableRow className="bg-slate-50 font-bold">
                                    <TableCell>Total</TableCell>
                                    <TableCell className="text-right">{consultationData.reduce((s, c) => s + c.total, 0).toLocaleString()}</TableCell>
                                    <TableCell className="text-right text-red-600">{consultationData.reduce((s, c) => s + c.share, 0).toLocaleString()}</TableCell>
                                    <TableCell className="text-right text-emerald-700">{consultationData.reduce((s, c) => s + c.hospital, 0).toLocaleString()}</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Other Services Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Filter className="h-4 w-4 text-indigo-600" />
                        Other Services
                    </CardTitle>
                    <CardDescription>Breakdown by service type</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Service Name</TableHead>
                                <TableHead className="text-right">Total Amount</TableHead>
                                <TableHead className="text-right">Share</TableHead>
                                <TableHead className="text-right">Hospital Share</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {otherData.length > 0 ? (
                                otherData.map((record) => (
                                    <TableRow key={record.name}>
                                        <TableCell className="font-medium">{record.name}</TableCell>
                                        <TableCell className="text-right">{record.total.toLocaleString()}</TableCell>
                                        <TableCell className="text-right text-red-500">{record.share.toLocaleString()}</TableCell>
                                        <TableCell className="text-right text-emerald-600 font-medium">{record.hospital.toLocaleString()}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colspan={4} className="text-center py-6 text-slate-500">No other service records found</TableCell>
                                </TableRow>
                            )}
                            {otherData.length > 0 && (
                                <TableRow className="bg-slate-50 font-bold">
                                    <TableCell>Total</TableCell>
                                    <TableCell className="text-right">{otherData.reduce((s, c) => s + c.total, 0).toLocaleString()}</TableCell>
                                    <TableCell className="text-right text-red-600">{otherData.reduce((s, c) => s + c.share, 0).toLocaleString()}</TableCell>
                                    <TableCell className="text-right text-emerald-700">{otherData.reduce((s, c) => s + c.hospital, 0).toLocaleString()}</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Expenses Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Filter className="h-4 w-4 text-red-600" />
                        Expenses
                    </CardTitle>
                    <CardDescription>Direct expenses recorded during the shift</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Expense Name</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {expenses.length > 0 ? (
                                expenses.map((record) => (
                                    <TableRow key={record.srl_no || Math.random()}>
                                        <TableCell className="font-medium">{record.expense_name}</TableCell>
                                        <TableCell>{record.expense_description}</TableCell>
                                        <TableCell className="text-right font-medium">{Number(record.expense_amount).toLocaleString()}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colspan={3} className="text-center py-6 text-slate-500">No expenses recorded</TableCell>
                                </TableRow>
                            )}
                            {expenses.length > 0 && (
                                <TableRow className="bg-slate-50 font-bold">
                                    <TableCell colspan={2}>Total Expenses</TableCell>
                                    <TableCell className="text-right text-red-700">{expenseTotalOnly.toLocaleString()}</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

export default ShiftReport;
