import React, { useState, useEffect, useMemo } from "react";
import {
    Card,
    Table,
    Typography,
    DatePicker,
    Button,
    Row,
    Col,
    Space,
    Select,
    Statistic,
    Spin,
    Divider,
    Alert
} from "antd";
import {
    ReloadOutlined,
    PrinterOutlined,
    FileTextOutlined,
    FilterOutlined,
    DollarOutlined,
    ShoppingOutlined,
    WalletOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../api/axiosConfig";
import toast from "react-hot-toast";
import { useFilterContext } from "../../context/FilterContext"; // Adjust path as needed

const { Title, Text } = Typography;
const { Option } = Select;

const ShiftReport = () => {
    const navigate = useNavigate();
    const { setOpdFilterValues } = useFilterContext();
    
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [availableShifts, setAvailableShifts] = useState([]);

    // Filters
    const [selectedDate, setSelectedDate] = useState(dayjs());
    const [selectedShiftId, setSelectedShiftId] = useState("All");

    // Calculate totals
    const { totalRevenue, totalExpensesWithDocShare, netHospitalRevenue } = useMemo(() => {
        // Calculate total revenue (all amounts including consultation and other services - no doctor share deduction)
        const revenue = data.reduce((sum, record) => {
            const amount = Number(record.amount) || 0;
            return sum + amount;
        }, 0);

        // Calculate total expenses from expenses table
        const expenseTotal = expenses.reduce((sum, expense) => {
            return sum + (Number(expense.expense_amount) || 0);
        }, 0);

        // Calculate total doctor share (considered as expense)
        const docShareTotal = data.reduce((sum, record) => {
            const docShare = Number(record.doc_share) || 0;
            return sum + docShare;
        }, 0);

        // Total expenses = expenses + doctor share
        const totalExpenses = expenseTotal + docShareTotal;

        // Net hospital revenue = total revenue - total expenses
        const netRevenue = revenue - totalExpenses;

        return {
            totalRevenue: revenue,
            totalExpensesWithDocShare: totalExpenses,
            netHospitalRevenue: netRevenue
        };
    }, [data, expenses]);

    // Fetch available shifts for the selected date
    const fetchAvailableShifts = async (date) => {
        if (!date) return;

        try {
            // Fetch all data for the selected date to extract shift_ids
            const params = {
                page: 1,
                limit: 10000,
                dateFrom: date.format("YYYY-MM-DD"),
                dateTo: date.format("YYYY-MM-DD"),
            };

            const { data: res } = await axiosInstance.get("/patient-opd/list", { params });
            
            if (res.success && res.data.length > 0) {
                // Extract unique shift_id and shift_type combinations
                const shiftsMap = new Map();
                
                res.data.forEach(record => {
                    const shiftId = record.shift_id;
                    const shiftType = record.shift_type;
                    
                    if (shiftId && !shiftsMap.has(shiftId)) {
                        shiftsMap.set(shiftId, {
                            shift_id: shiftId,
                            shift_type: shiftType || 'Unknown',
                            entry_date: record.entry_date
                        });
                    }
                });

                const allShifts = Array.from(shiftsMap.values()).sort((a, b) => a.shift_id - b.shift_id);
                
                // Filter out the previous night shift
                // If there are multiple "Night" shifts, exclude the one with the lower shift_id
                const nightShifts = allShifts.filter(s => s.shift_type.toLowerCase() === 'night');
                let shiftIdToExclude = null;
                
                if (nightShifts.length > 1) {
                    // Exclude the night shift with the lowest ID (previous night)
                    shiftIdToExclude = nightShifts[0].shift_id;
                }
                
                const shifts = allShifts.filter(shift => shift.shift_id !== shiftIdToExclude);
                setAvailableShifts(shifts);
                
                // Auto-select "All" when date changes
                setSelectedShiftId("All");
            } else {
                setAvailableShifts([]);
                setSelectedShiftId("All");
            }
        } catch (err) {
            console.error("Error fetching available shifts:", err);
            setAvailableShifts([]);
            setSelectedShiftId("All");
        }
    };

    // Fetch Data based on shift_id or all shifts for the date
    const fetchData = async () => {
        if (!selectedDate) {
            toast.error("Please select a date");
            return;
        }

        setLoading(true);

        // Determine which shift_ids to fetch
        let shiftIdsToFetch = [];
        
        if (selectedShiftId === "All") {
            // Get all shift_ids for the selected date
            shiftIdsToFetch = availableShifts.map(s => s.shift_id);
        } else {
            // Get specific shift_id
            shiftIdsToFetch = [selectedShiftId];
        }

        if (shiftIdsToFetch.length === 0) {
            setData([]);
            setExpenses([]);
            setLoading(false);
            return;
        }

        // Fetch Patient OPD Data for all relevant shift_ids
        try {
            let allOpdData = [];
            
            // Fetch data for each shift_id
            for (const shiftId of shiftIdsToFetch) {
                const { data: res } = await axiosInstance.get("/patient-opd/list", { 
                    params: { 
                        page: 1, 
                        limit: 10000,
                        shiftId: shiftId 
                    } 
                });
                
                if (res.success && res.data) {
                    allOpdData = [...allOpdData, ...res.data];
                }
            }
            
            setData(allOpdData);
            console.log(`Loaded ${allOpdData.length} OPD records for shift_id(s):`, shiftIdsToFetch);
        } catch (err) {
            console.error("Patient list fetch error:", err);
            toast.error("Failed to load patient report");
            setData([]);
        }

        // Fetch Expenses Data for all relevant shift_ids
        try {
            let allExpenses = [];
            
            // Fetch expenses for each shift_id
            for (const shiftId of shiftIdsToFetch) {
                const { data: expenseRes } = await axiosInstance.get("/expenses/list", { 
                    params: { shiftId: shiftId } 
                });
                
                if (expenseRes.success && expenseRes.data) {
                    allExpenses = [...allExpenses, ...expenseRes.data];
                }
            }
            
            setExpenses(allExpenses);
            console.log(`Loaded ${allExpenses.length} expense records for shift_id(s):`, shiftIdsToFetch);
        } catch (err) {
            console.error("Expense fetch error:", err);
            setExpenses([]);
        }

        setLoading(false);
    };

    // Fetch available shifts when date changes
    useEffect(() => {
        if (selectedDate) {
            fetchAvailableShifts(selectedDate);
        }
    }, [selectedDate]);

    // Fetch data when shift_id changes or when availableShifts changes
    useEffect(() => {
        if (availableShifts.length > 0 || selectedShiftId === "All") {
            fetchData();
        }
    }, [selectedShiftId, availableShifts]);

    // Aggregation Logic
    const { consultationData, otherData, grandTotal } = useMemo(() => {
        const consultMap = new Map();
        const otherMap = new Map();

        let totalAmount = 0;
        let totalDrShare = 0;
        let totalHospitalShare = 0;

        data.forEach(record => {
            const isConsultation = record.opd_service === "Consultation";
            const amount = Number(record.amount) || 0;
            const docShare = Number(record.doc_share) || 0;
            const hospitalShare = amount - docShare;

            if (isConsultation) {
                const drName = record.service_detail || "Unknown Doctor";
                if (!consultMap.has(drName)) {
                    consultMap.set(drName, {
                        doctorName: drName,
                        totalAmount: 0,
                        drShare: 0,
                        hospitalShare: 0,
                        count: 0
                    });
                }
                const entry = consultMap.get(drName);
                entry.totalAmount += amount;
                entry.drShare += docShare;
                entry.hospitalShare += hospitalShare;
                entry.count += 1;
            } else {
                const serviceName = record.opd_service || "Other";
                if (!otherMap.has(serviceName)) {
                    otherMap.set(serviceName, {
                        serviceName: serviceName,
                        totalAmount: 0,
                        drShare: 0,
                        hospitalShare: 0,
                        count: 0
                    });
                }
                const entry = otherMap.get(serviceName);
                entry.totalAmount += amount;
                entry.drShare += docShare;
                entry.hospitalShare += hospitalShare;
                entry.count += 1;
            }

            totalAmount += amount;
            totalDrShare += docShare;
            totalHospitalShare += hospitalShare;
        });

        return {
            consultationData: Array.from(consultMap.values()).sort((a, b) => a.doctorName.localeCompare(b.doctorName)),
            otherData: Array.from(otherMap.values()).sort((a, b) => a.serviceName.localeCompare(b.serviceName)),
            grandTotal: { totalAmount, totalDrShare, totalHospitalShare }
        };
    }, [data]);

    // Handle row click - navigate to Patient OPD View with filters
    const handleRowClick = (record, isConsultation) => {
        // For consultation, use the doctor name; for other services, use service name
        const serviceName = isConsultation ? record.doctorName : record.serviceName;
        
        // Set the filter values in context
        setOpdFilterValues(selectedDate, serviceName);
        
        // Navigate to Patient OPD View page
        navigate("/patient-opd-view"); // Adjust this route as per your routing setup
        
        // toast.success(`Navigating to OPD records for ${serviceName}`);
    };

    // Columns
    const consultationColumns = [
        {
            title: "Doctor Name",
            dataIndex: "doctorName",
            key: "doctorName",
            render: (text) => <Text strong>{text}</Text>
        },
        {
            title: "Total Service Amount",
            dataIndex: "totalAmount",
            key: "totalAmount",
            align: "right",
            render: (val) => val.toLocaleString()
        },
        {
            title: "Dr. Share",
            dataIndex: "drShare",
            key: "drShare",
            align: "right",
            render: (val) => val.toLocaleString()
        },
        {
            title: "Hospital Received",
            dataIndex: "hospitalShare",
            key: "hospitalShare",
            align: "right",
            render: (val) => <Text type="success" strong>{val.toLocaleString()}</Text>
        }
    ];

    const otherColumns = [
        {
            title: "Service Name",
            dataIndex: "serviceName",
            key: "serviceName",
            render: (text) => <Text strong>{text}</Text>
        },
        {
            title: "Total Amount",
            dataIndex: "totalAmount",
            key: "totalAmount",
            align: "right",
            render: (val) => val.toLocaleString()
        },
        {
            title: "Dr. Share",
            dataIndex: "drShare",
            key: "drShare",
            align: "right",
            render: (val) => val.toLocaleString()
        },
        {
            title: "Hospital Received",
            dataIndex: "hospitalShare",
            key: "hospitalShare",
            align: "right",
            render: (val) => <Text type="success" strong>{val.toLocaleString()}</Text>
        }
    ];

    const expenseColumns = [
        {
            title: "Expense Head",
            dataIndex: "expense_head",
            key: "expense_head",
            render: (text) => <Text strong>{text}</Text>
        },
        {
            title: "Description",
            dataIndex: "expense_description",
            key: "expense_description",
        },
        {
            title: "Amount",
            dataIndex: "expense_amount",
            key: "expense_amount",
            align: "right",
            render: (val) => val ? Number(val).toLocaleString() : "0"
        }
    ];

    const handlePrint = () => {
        const printWindow = window.open("", "", "width=1000,height=800");
        const dateStr = selectedDate ? selectedDate.format("DD/MM/YYYY") : "All Dates";
        
        let shiftStr = "";
        if (selectedShiftId === "All") {
            shiftStr = `All Shifts (${availableShifts.map(s => `${s.shift_type}`).join(", ")})`;
        } else {
            const selectedShift = availableShifts.find(s => s.shift_id === selectedShiftId);
            shiftStr = selectedShift ? `${selectedShift.shift_type}` : "Unknown";
        }

        printWindow.document.write(`
            <html>
                <head>
                    <title>Shift Report - ${dateStr}</title>
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 12px; padding: 20px; }
                        h1 { text-align: center; margin-bottom: 5px; color: #333; }
                        h2 { margin-top: 20px; font-size: 14px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
                        .meta { text-align: center; margin-bottom: 20px; color: #666; font-size: 13px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                        th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
                        th { background-color: #f8f9fa; font-weight: bold; color: #444; }
                        .right { text-align: right; }
                        .total-row { font-weight: bold; background-color: #f0f0f0; }
                        .grand-total { margin-top: 30px; text-align: right; font-size: 14px; font-weight: bold; padding: 10px; border: 2px solid #eee; }
                    </style>
                </head>
                <body>
                    <h1>Shift Report</h1>
                    <div class="meta">
                        Date: <strong>${dateStr}</strong> | Shift: <strong>${shiftStr}</strong>
                    </div>

                    <h2>Consultations (Doctors)</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Doctor Name</th>
                                <th class="right">Total Amount</th>
                                <th class="right">Dr. Share</th>
                                <th class="right">Hospital Received</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${consultationData.map(r => `
                                <tr>
                                    <td>${r.doctorName}</td>
                                    <td class="right">${r.totalAmount.toLocaleString()}</td>
                                    <td class="right">${r.drShare.toLocaleString()}</td>
                                    <td class="right">${r.hospitalShare.toLocaleString()}</td>
                                </tr>
                            `).join('')}
                            <tr class="total-row">
                                <td>Total Consultation</td>
                                <td class="right">${consultationData.reduce((s, c) => s + c.totalAmount, 0).toLocaleString()}</td>
                                <td class="right">${consultationData.reduce((s, c) => s + c.drShare, 0).toLocaleString()}</td>
                                <td class="right">${consultationData.reduce((s, c) => s + c.hospitalShare, 0).toLocaleString()}</td>
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
                                <th class="right">Hospital Received</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${otherData.map(r => `
                                <tr>
                                    <td>${r.serviceName}</td>
                                    <td class="right">${r.totalAmount.toLocaleString()}</td>
                                    <td class="right">${r.drShare.toLocaleString()}</td>
                                    <td class="right">${r.hospitalShare.toLocaleString()}</td>
                                </tr>
                            `).join('')}
                             <tr class="total-row">
                                <td>Total Services</td>
                                <td class="right">${otherData.reduce((s, c) => s + c.totalAmount, 0).toLocaleString()}</td>
                                <td class="right">${otherData.reduce((s, c) => s + c.drShare, 0).toLocaleString()}</td>
                                <td class="right">${otherData.reduce((s, c) => s + c.hospitalShare, 0).toLocaleString()}</td>
                            </tr>
                        </tbody>
                    </table>

                    <h2>Expenses</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Expense Head</th>
                                <th>Description</th>
                                <th class="right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${expenses.map(r => `
                                <tr>
                                    <td>${r.expense_head || '-'}</td>
                                    <td>${r.expense_description || '-'}</td>
                                    <td class="right">${Number(r.expense_amount).toLocaleString()}</td>
                                </tr>
                            `).join('')}
                             <tr class="total-row">
                                <td colspan="2">Total Expenses</td>
                                <td class="right">${expenses.reduce((s, c) => s + Number(c.expense_amount), 0).toLocaleString()}</td>
                            </tr>
                        </tbody>
                    </table>

                    <div class="grand-total">
                        <div>Total Revenue: ${totalRevenue.toLocaleString()}</div>
                        <div>Total Expenses (incl. Dr. Share): ${totalExpensesWithDocShare.toLocaleString()}</div>
                        <div style="margin-top: 10px; font-size: 16px; color: #059669;">Net Hospital Revenue: ${netHospitalRevenue.toLocaleString()}</div>
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    };

    return (
        <div style={{ padding: "16px", background: "#f9fafb", minHeight: "100vh" }}>
            {/* Header */}
            <Card
                style={{
                    borderRadius: 10,
                    background: "linear-gradient(135deg, #037389 0%, #14b8a6 100%)",
                    border: "none",
                    marginBottom: 16,
                }}
                bodyStyle={{ padding: "16px 20px" }}
            >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                        <Title level={4} style={{ color: "white", margin: 0, fontSize: "18px", fontWeight: 600 }}>
                            <FileTextOutlined style={{ marginRight: 8 }} />
                            Shift Report
                        </Title>
                        <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: "12px" }}>
                            Shift-based financial summary (Click on any row to view detailed OPD records)
                        </Text>
                    </div>
                </div>
            </Card>

            {/* Filters */}
            <Card 
                style={{ 
                    marginBottom: 16, 
                    borderRadius: 10,
                    background: "#ffffff",
                    border: "1px solid #e5e7eb",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.06)"
                }} 
                size="small"
                bodyStyle={{ padding: "14px 16px" }}
            >
                <Row gutter={[12, 12]} align="middle">
                    <Col xs={24} sm={8} md={5}>
                        <Text strong style={{ display: "block", marginBottom: 4, color: "#374151", fontSize: "13px" }}>Date</Text>
                        <DatePicker
                            style={{ width: "100%" }}
                            value={selectedDate}
                            onChange={setSelectedDate}
                            allowClear={false}
                            size="small"
                        />
                    </Col>
                    <Col xs={24} sm={8} md={6}>
                        <Text strong style={{ display: "block", marginBottom: 4, color: "#374151", fontSize: "13px" }}>
                            Shift
                        </Text>
                        <Select
                            style={{ width: "100%" }}
                            value={selectedShiftId}
                            onChange={setSelectedShiftId}
                            size="small"
                            placeholder="Select shift"
                            loading={loading}
                        >
                            <Option value="All">All Shifts</Option>
                            {availableShifts.map(shift => (
                                <Option key={shift.shift_id} value={shift.shift_id}>
                                    {shift.shift_type}
                                </Option>
                            ))}
                        </Select>
                    </Col>
                    
                    <Col xs={24} sm={8} md={13} style={{ textAlign: "right" }}>
                        <Space size="small">
                            <Button 
                                icon={<PrinterOutlined />} 
                                onClick={handlePrint}
                                disabled={data.length === 0}
                                size="small"
                                style={{
                                    borderRadius: 6,
                                    fontWeight: 500,
                                    fontSize: "13px"
                                }}
                            >
                                Print
                            </Button>
                            <Button 
                                icon={<ReloadOutlined />} 
                                onClick={() => {
                                    fetchAvailableShifts(selectedDate);
                                    fetchData();
                                }}
                                loading={loading}
                                size="small"
                                style={{
                                    borderRadius: 6,
                                    fontWeight: 500,
                                    fontSize: "13px"
                                }}
                            >
                                Refresh
                            </Button>
                        </Space>
                    </Col>
                </Row>

                {selectedShiftId !== "All" && selectedShiftId && (
                    <Alert
                        type="info"
                        showIcon
                        style={{ marginTop: 10, padding: "6px 12px", fontSize: "12px" }}
                    />
                )}
            </Card>

            {/* Summary Cards - 3 Cards */}
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                {/* Card 1: Total Hospital Received (Total Revenue) */}
                <Col xs={24} sm={8} md={8}>
                    <Card
                        style={{ 
                            background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
                            border: "1px solid #bfdbfe",
                            borderRadius: 10,
                            boxShadow: "0 1px 3px rgba(59, 130, 246, 0.1)",
                        }}
                        bodyStyle={{ padding: "14px 16px" }}
                    >
                        <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
                            <div style={{
                                width: 32,
                                height: 32,
                                borderRadius: 8,
                                background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                marginRight: 10
                            }}>
                                <DollarOutlined style={{ color: "white", fontSize: "16px" }} />
                            </div>
                            <Text strong style={{ fontSize: "13px", color: "#1e3a8a" }}>
                                Total Revenue
                            </Text>
                        </div>
                        <Text style={{ 
                            fontSize: "22px", 
                            fontWeight: "700", 
                            color: "#1e40af",
                            lineHeight: 1.2,
                            display: "block"
                        }}>
                            Rs {totalRevenue.toLocaleString()}
                        </Text>
                        <Text style={{ 
                            fontSize: "11px", 
                            color: "#60a5fa",
                            marginTop: 4,
                            display: "block"
                        }}>
                            All services
                        </Text>
                    </Card>
                </Col>

                {/* Card 2: Total Expenses (including Doctor Share) */}
                <Col xs={24} sm={8} md={8}>
                    <Card
                        style={{ 
                            background: "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)",
                            border: "1px solid #fecaca",
                            borderRadius: 10,
                            boxShadow: "0 1px 3px rgba(239, 68, 68, 0.1)",
                        }}
                        bodyStyle={{ padding: "14px 16px" }}
                    >
                        <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
                            <div style={{
                                width: 32,
                                height: 32,
                                borderRadius: 8,
                                background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                marginRight: 10
                            }}>
                                <ShoppingOutlined style={{ color: "white", fontSize: "16px" }} />
                            </div>
                            <Text strong style={{ fontSize: "13px", color: "#7f1d1d" }}>
                                Total Expenses
                            </Text>
                        </div>
                        <Text style={{ 
                            fontSize: "22px", 
                            fontWeight: "700", 
                            color: "#991b1b",
                            lineHeight: 1.2,
                            display: "block"
                        }}>
                            Rs {totalExpensesWithDocShare.toLocaleString()}
                        </Text>
                        <Text style={{ 
                            fontSize: "11px", 
                            color: "#f87171",
                            marginTop: 4,
                            display: "block"
                        }}>
                            Incl. doctor share
                        </Text>
                    </Card>
                </Col>

                {/* Card 3: Net Hospital Revenue */}
                <Col xs={24} sm={8} md={8}>
                    <Card
                        style={{ 
                            background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
                            border: "1px solid #86efac",
                            borderRadius: 10,
                            boxShadow: "0 1px 3px rgba(16, 185, 129, 0.1)",
                        }}
                        bodyStyle={{ padding: "14px 16px" }}
                    >
                        <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
                            <div style={{
                                width: 32,
                                height: 32,
                                borderRadius: 8,
                                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                marginRight: 10
                            }}>
                                <WalletOutlined style={{ color: "white", fontSize: "16px" }} />
                            </div>
                            <Text strong style={{ fontSize: "13px", color: "#064e3b" }}>
                                Net Revenue
                            </Text>
                        </div>
                        <Text style={{ 
                            fontSize: "22px", 
                            fontWeight: "700", 
                            color: "#065f46",
                            lineHeight: 1.2,
                            display: "block"
                        }}>
                            Rs {netHospitalRevenue.toLocaleString()}
                        </Text>
                        <Text style={{ 
                            fontSize: "11px", 
                            color: "#34d399",
                            marginTop: 4,
                            display: "block"
                        }}>
                            After expenses
                        </Text>
                    </Card>
                </Col>
            </Row>

            {/* Consultation Table */}
            <Card
                title={
                    <Space size="small">
                        <FileTextOutlined style={{ color: "#037389", fontSize: "14px" }} /> 
                        <Text strong style={{ fontSize: "14px" }}>Consultation (Doctors) - Click any row to view details</Text>
                    </Space>
                }
                style={{ marginBottom: 16, borderRadius: 10, border: "1px solid #e5e7eb" }}
                bodyStyle={{ padding: "12px" }}
                headStyle={{ padding: "10px 16px", minHeight: "auto" }}
            >
                <Table
                    columns={consultationColumns}
                    dataSource={consultationData}
                    rowKey="doctorName"
                    pagination={false}
                    loading={loading}
                    bordered
                    size="small"
                    onRow={(record) => ({
                        onClick: () => handleRowClick(record, true),
                        style: { cursor: 'pointer' },
                        onMouseEnter: (e) => {
                            e.currentTarget.style.backgroundColor = '#f0fdfc';
                        },
                        onMouseLeave: (e) => {
                            e.currentTarget.style.backgroundColor = '';
                        },
                    })}
                    summary={(pageData) => {
                        let totalAmt = 0;
                        let totalShare = 0;
                        let totalHosp = 0;

                        pageData.forEach(p => {
                            totalAmt += p.totalAmount;
                            totalShare += p.drShare;
                            totalHosp += p.hospitalShare;
                        });

                        return (
                            <Table.Summary.Row style={{ background: '#fafafa', fontWeight: 'bold' }}>
                                <Table.Summary.Cell>Total</Table.Summary.Cell>
                                <Table.Summary.Cell align="right">{totalAmt.toLocaleString()}</Table.Summary.Cell>
                                <Table.Summary.Cell align="right">{totalShare.toLocaleString()}</Table.Summary.Cell>
                                <Table.Summary.Cell align="right">
                                    <Text type="success" strong>{totalHosp.toLocaleString()}</Text>
                                </Table.Summary.Cell>
                            </Table.Summary.Row>
                        );
                    }}
                />
            </Card>

            {/* Other Services Table */}
            <Card
                title={
                    <Space size="small">
                        <FileTextOutlined style={{ color: "#037389", fontSize: "14px" }} /> 
                        <Text strong style={{ fontSize: "14px" }}>Other Services - Click any row to view details</Text>
                    </Space>
                }
                style={{ borderRadius: 10, border: "1px solid #e5e7eb", marginBottom: 16 }}
                bodyStyle={{ padding: "12px" }}
                headStyle={{ padding: "10px 16px", minHeight: "auto" }}
            >
                <Table
                    columns={otherColumns}
                    dataSource={otherData}
                    rowKey="serviceName"
                    pagination={false}
                    loading={loading}
                    bordered
                    size="small"
                    onRow={(record) => ({
                        onClick: () => handleRowClick(record, false),
                        style: { cursor: 'pointer' },
                        onMouseEnter: (e) => {
                            e.currentTarget.style.backgroundColor = '#f0fdfc';
                        },
                        onMouseLeave: (e) => {
                            e.currentTarget.style.backgroundColor = '';
                        },
                    })}
                    summary={(pageData) => {
                        let totalAmt = 0;
                        let totalShare = 0;
                        let totalHosp = 0;

                        pageData.forEach(p => {
                            totalAmt += p.totalAmount;
                            totalShare += p.drShare;
                            totalHosp += p.hospitalShare;
                        });

                        return (
                            <Table.Summary.Row style={{ background: '#fafafa', fontWeight: 'bold' }}>
                                <Table.Summary.Cell>Total</Table.Summary.Cell>
                                <Table.Summary.Cell align="right">{totalAmt.toLocaleString()}</Table.Summary.Cell>
                                <Table.Summary.Cell align="right">{totalShare.toLocaleString()}</Table.Summary.Cell>
                                <Table.Summary.Cell align="right">
                                    <Text type="success" strong>{totalHosp.toLocaleString()}</Text>
                                </Table.Summary.Cell>
                            </Table.Summary.Row>
                        );
                    }}
                />
            </Card>

            {/* Expenses Table */}
            <Card
                title={
                    <Space size="small">
                        <ShoppingOutlined style={{ color: "#d97706", fontSize: "14px" }} /> 
                        <Text strong style={{ fontSize: "14px" }}>Expenses</Text>
                    </Space>
                }
                style={{ borderRadius: 10, border: "1px solid #e5e7eb" }}
                bodyStyle={{ padding: "12px" }}
                headStyle={{ padding: "10px 16px", minHeight: "auto" }}
            >
                <Table
                    columns={expenseColumns}
                    dataSource={expenses}
                    rowKey="id"
                    pagination={false}
                    loading={loading}
                    bordered
                    size="small"
                    summary={(pageData) => {
                        let totalExp = 0;
                        pageData.forEach(p => {
                            totalExp += Number(p.expense_amount);
                        });

                        return (
                            <Table.Summary.Row style={{ background: '#fffbeb', fontWeight: 'bold' }}>
                                <Table.Summary.Cell colSpan={2}>Total Expenses</Table.Summary.Cell>
                                <Table.Summary.Cell align="right">
                                    <Text type="warning" strong>{totalExp.toLocaleString()}</Text>
                                </Table.Summary.Cell>
                            </Table.Summary.Row>
                        );
                    }}
                />
            </Card>
        </div>
    );
};

export default ShiftReport;