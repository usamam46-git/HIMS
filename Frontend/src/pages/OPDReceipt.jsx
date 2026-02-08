import React, { useState, useEffect, useCallback } from 'react';
import {
    User, Search, Stethoscope, Activity, FlaskConical, Scan,
    Plus, Minus, Trash2, Receipt, Calculator, Clock, AlertCircle,
    Percent, CreditCard, CheckCircle, RefreshCw,
    Calendar,
    Phone,
    MapPin
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getPatientByMR } from '@/services/mrDataService';
import {
    getOPDServices, getDoctors, createOPDReceipt,
    getCurrentShift, createConsultantPayment
} from '@/services/opdReceiptService';

const SERVICE_TYPES = [
    { id: 'opd', label: 'OPD Services', icon: Activity, color: 'text-blue-600 bg-blue-50 border-blue-200' },
    { id: 'consultation', label: 'Consultation', icon: Stethoscope, color: 'text-green-600 bg-green-50 border-green-200' },
    { id: 'lab', label: 'Laboratory', icon: FlaskConical, color: 'text-purple-600 bg-purple-50 border-purple-200', disabled: true },
    { id: 'xray', label: 'X-Ray / MRI', icon: Scan, color: 'text-orange-600 bg-orange-50 border-orange-200', disabled: true },
];

const OPDReceipt = () => {
    // State
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // Current Shift
    const [currentShift, setCurrentShift] = useState(null);
    const [noShiftWarning, setNoShiftWarning] = useState(false);

    // Patient Data
    const [mrNumber, setMrNumber] = useState('');
    const [patientData, setPatientData] = useState(null);

    // Service Selection
    const [selectedServiceType, setSelectedServiceType] = useState('opd');
    const [availableServices, setAvailableServices] = useState([]);
    const [availableDoctors, setAvailableDoctors] = useState([]);

    // Cart
    const [cartItems, setCartItems] = useState([]);

    // Payment
    const [discount, setDiscount] = useState(0);
    const [discountReason, setDiscountReason] = useState('');
    const [paidAmount, setPaidAmount] = useState(0);

    // Calculations
    const totalAmount = cartItems.reduce((sum, item) => sum + (item.rate * item.qty), 0);
    const payableAmount = Math.max(0, totalAmount - discount);
    const balanceAmount = Math.max(0, payableAmount - paidAmount);

    // Doctor share calculations (for consultation items)
    const consultationItems = cartItems.filter(item => item.type === 'consultation');
    const totalDrShareAmount = consultationItems.reduce((sum, item) => {
        return sum + (item.rate * item.qty * (item.drShare / 100));
    }, 0);
    const hospitalShare = consultationItems.reduce((sum, item) => {
        const itemTotal = item.rate * item.qty;
        const drAmount = itemTotal * (item.drShare / 100);
        return sum + (itemTotal - drAmount);
    }, 0);

    // Load current shift on mount
    useEffect(() => {
        loadCurrentShift();
        loadServices();
        loadDoctors();
    }, []);

    const loadCurrentShift = async () => {
        try {
            const response = await getCurrentShift();
            if (response.success && response.data) {
                setCurrentShift(response.data);
                setNoShiftWarning(false);
            } else {
                setNoShiftWarning(true);
            }
        } catch (err) {
            setNoShiftWarning(true);
        }
    };

    const loadServices = async () => {
        try {
            const response = await getOPDServices();
            if (response.success) {
                setAvailableServices(response.data.filter(s => s.is_active));
            }
        } catch (err) {
            console.error('Failed to load services:', err);
        }
    };

    const loadDoctors = async () => {
        try {
            const response = await getDoctors();
            if (response.success) {
                setAvailableDoctors(response.data.filter(d => d.is_active));
            }
        } catch (err) {
            console.error('Failed to load doctors:', err);
        }
    };

    // MR Search
    const handleMrSearch = async () => {
        if (!mrNumber || mrNumber.length < 1) return;

        setLoading(true);
        setError(null);

        try {
            const response = await getPatientByMR(mrNumber);
            if (response.success) {
                setPatientData(response.data);
            }
        } catch (err) {
            if (err.response?.status === 404) {
                setError('Patient not found. Please register in MR Details first.');
            } else {
                setError('Error searching patient.');
            }
            setPatientData(null);
        } finally {
            setLoading(false);
        }
    };

    const handleMrKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleMrSearch();
        }
    };

    // Add to Cart
    const addServiceToCart = (service) => {
        const existing = cartItems.find(item => item.id === service.service_id && item.type === 'opd');
        if (existing) {
            setCartItems(cartItems.map(item =>
                item.id === service.service_id && item.type === 'opd'
                    ? { ...item, qty: item.qty + 1 }
                    : item
            ));
        } else {
            setCartItems([...cartItems, {
                id: service.service_id,
                name: service.service_name,
                head: service.service_head, // Store service head for opd_service column
                rate: parseFloat(service.service_rate),
                qty: 1,
                type: 'opd',
                editable: service.price_editable,
                drShare: 0
            }]);
        }
    };

    const addDoctorToCart = (doctor) => {
        const existing = cartItems.find(item => item.id === doctor.doctor_id && item.type === 'consultation');
        if (existing) {
            // Don't add duplicate consultations, just notify
            return;
        }
        setCartItems([...cartItems, {
            id: doctor.doctor_id,
            name: `Consultation - Dr. ${doctor.doctor_name}`,
            doctorName: doctor.doctor_name,
            department: doctor.doctor_department,
            rate: parseFloat(doctor.consultation_fee),
            qty: 1,
            type: 'consultation',
            editable: false,
            drShare: parseFloat(doctor.doctor_share) || 0
        }]);
    };

    const updateCartItemQty = (index, delta) => {
        setCartItems(cartItems.map((item, i) => {
            if (i === index) {
                const newQty = Math.max(1, item.qty + delta);
                return { ...item, qty: newQty };
            }
            return item;
        }));
    };

    const updateCartItemRate = (index, newRate) => {
        setCartItems(cartItems.map((item, i) => {
            if (i === index && item.editable) {
                return { ...item, rate: parseFloat(newRate) || 0 };
            }
            return item;
        }));
    };

    const removeFromCart = (index) => {
        setCartItems(cartItems.filter((_, i) => i !== index));
    };

    // Submit Receipt
    const handleSubmit = async () => {
        if (!patientData) {
            setError('Please search and select a patient first.');
            return;
        }
        if (cartItems.length === 0) {
            setError('Please add at least one service.');
            return;
        }
        if (!currentShift) {
            setError('No active shift. Please open a shift in Shift Management.');
            return;
        }

        setSubmitting(true);
        setError(null);

        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().split(' ')[0];

        // Prepare service details JSON
        const serviceDetails = cartItems.map(item => ({
            id: item.id,
            name: item.name,
            rate: item.rate,
            qty: item.qty,
            total: item.rate * item.qty,
            type: item.type,
            drShare: item.drShare
        }));

        // Calculate opd_service and service_detail columns
        const opdServicesList = [];
        const serviceDetailsList = [];

        cartItems.forEach(item => {
            if (item.type === 'consultation') {
                opdServicesList.push('Consultation');
                // For consultation, service_detail is doctor's name
                // Extract "Dr. Name" from "Consultation - Dr. Name" or use item.name directly if needed
                // Using item.doctorName would be cleaner if available, but item.name is "Consultation - Dr. X"
                // Let's use a cleaner approach if the item has doctorName property preserved
                serviceDetailsList.push(item.doctorName ? `Dr. ${item.doctorName}` : item.name);
            } else {
                // For OPD services, use the service head as opd_service, and service name as detail
                // We need to retrieve service head. It might not be in cartItem directly unless we added it.
                // Looking at addServiceToCart, we didn't add service_head.
                // We should update addServiceToCart to include it, OR just use 'OPD' generic if missing.
                // User wants "OPD Service" column to show service name and "Service Detail" to show details if any.
                // Wait, user said: "first will be opd_service that will show the service name and second will be service_details"
                // Example screenshot shows: "Laboratory" -> "SERUM URIC ACID".
                // So `opd_service` should be the Category/Head (e.g. Laboratory, Ultrasound), and `service_detail` is the specific test.
                // I need to ensure cart items have the 'head' property.
                opdServicesList.push(item.head || 'OPD');
                serviceDetailsList.push(item.name);
            }
        });

        // Join with commas or newlines? Standard is often comma-separated or just first item if single.
        // If multiple items, we can join them.
        const opdServiceStr = opdServicesList.join(', ');
        const serviceDetailStr = serviceDetailsList.join(', ');

        // Calculate overall dr_share percentage (weighted average)
        const avgDrShare = consultationItems.length > 0
            ? consultationItems.reduce((sum, item) => sum + item.drShare, 0) / consultationItems.length
            : 0;

        try {
            // 1. Create OPD Receipt
            const receiptData = {
                patient_mr_number: patientData.mr_number,
                date: dateStr,
                time: timeStr,
                emergency_paid: false,
                patient_token_appointment: false,
                patient_checked: false,
                patient_requested_discount: discount > 0,
                patient_name: `${patientData.first_name} ${patientData.last_name || ''}`.trim(),
                phone_number: patientData.phone,
                patient_age: patientData.age?.toString() || '',
                patient_gender: patientData.gender,
                patient_address: patientData.address || '',
                opd_service: opdServiceStr,
                service_detail: serviceDetailStr,
                total_amount: totalAmount,
                discount: discount,
                payable: payableAmount,
                paid: paidAmount,
                balance: balanceAmount,
                service_details: serviceDetails,
                service_amount: totalAmount,
                opd_discount: discount > 0,
                discount_amount: discount,
                discount_reason: discountReason || null,
                discount_id: null,
                dr_share: avgDrShare,
                dr_share_amount: totalDrShareAmount,
                hospital_share: hospitalShare,
                shift_id: currentShift.shift_id,
                shift_type: currentShift.shift_type,
                shift_date: currentShift.shift_date
            };

            const receiptResponse = await createOPDReceipt(receiptData);

            if (!receiptResponse.success) {
                throw new Error(receiptResponse.message || 'Failed to create receipt');
            }

            // 2. Create Consultant Payment entries for each doctor
            for (const item of consultationItems) {
                const drShareAmount = item.rate * item.qty * (item.drShare / 100);

                await createConsultantPayment({
                    payment_date: dateStr,
                    payment_time: timeStr,
                    doctor_name: item.doctorName,
                    payment_department: item.department,
                    total: item.rate * item.qty,
                    payment_share: item.drShare,
                    payment_amount: drShareAmount,
                    patient_id: patientData.mr_number,
                    patient_date: dateStr,
                    patient_service: item.name,
                    patient_name: `${patientData.first_name} ${patientData.last_name || ''}`.trim(),
                    shift_id: currentShift.shift_id,
                    shift_type: currentShift.shift_type,
                    shift_date: currentShift.shift_date
                });
            }

            setSuccess(`Receipt ${receiptResponse.data.receipt_id} created successfully!`);

            // Reset form
            setTimeout(() => {
                setMrNumber('');
                setPatientData(null);
                setCartItems([]);
                setDiscount(0);
                setDiscountReason('');
                setPaidAmount(0);
                setSuccess(null);
            }, 3000);

        } catch (err) {
            setError(err.message || 'Failed to create receipt');
        } finally {
            setSubmitting(false);
        }
    };

    // Current date/time display
    const currentDateTime = new Date().toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-medical-blue">OPD Receipt</h2>
                    <p className="text-medical-text-muted text-sm">{currentDateTime}</p>
                </div>
                <div className="text-right">
                    {currentShift ? (
                        <div className="text-sm">
                            <span className="text-green-600 font-medium">● Shift Active</span>
                            <div className="text-medical-text-muted">
                                {currentShift.shift_type} | ID: {currentShift.shift_id}
                            </div>
                        </div>
                    ) : (
                        <div className="text-sm text-red-600 font-medium">
                            ⚠ No Active Shift
                        </div>
                    )}
                </div>
            </div>

            {noShiftWarning && (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    No active shift. Please open a shift in Shift Management before creating receipts.
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Left Column: Patient & Services */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Patient Search */}
                    <Card className="border-medical-border shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <User className="h-5 w-5 text-medical-accent" />
                                Patient Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* MR Search */}
                            <div className="flex gap-2">
                                <div className="flex-1 relative">
                                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                    <Input
                                        placeholder="Enter MR Number or ID..."
                                        className="pl-9 font-mono"
                                        value={mrNumber}
                                        onChange={(e) => setMrNumber(e.target.value)}
                                        onKeyDown={handleMrKeyDown}
                                        onBlur={handleMrSearch}
                                    />
                                </div>
                                <Button onClick={handleMrSearch} disabled={loading} variant="outline">
                                    {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Search'}
                                </Button>
                            </div>

                            {/* Patient Details Form - Auto-filled */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-xs text-gray-500">Patient Name</Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                        <Input
                                            readOnly
                                            value={patientData ? `${patientData.first_name} ${patientData.last_name || ''}` : ''}
                                            className="pl-9 bg-slate-50 font-medium text-gray-700"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-gray-500">Guardian / Father</Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                        <Input
                                            readOnly
                                            value={patientData ? patientData.guardian_name || '' : ''}
                                            className="pl-9 bg-slate-50 text-gray-600"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-gray-500">Age & Gender</Label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                        <Input
                                            readOnly
                                            value={patientData ? `${patientData.age || '-'} Y / ${patientData.gender}` : ''}
                                            className="pl-9 bg-slate-50 text-gray-600"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-gray-500">Contact Number</Label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                        <Input
                                            readOnly
                                            value={patientData ? patientData.phone || '' : ''}
                                            className="pl-9 bg-slate-50 text-gray-600"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                    <Label className="text-xs text-gray-500">Address</Label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                        <Input
                                            readOnly
                                            value={patientData ? patientData.address || '' : ''}
                                            className="pl-9 bg-slate-50 text-gray-600"
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Service Type Selection */}
                    <Card className="border-medical-border shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg">Select Service Type</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {SERVICE_TYPES.map((type) => {
                                    const Icon = type.icon;
                                    return (
                                        <button
                                            key={type.id}
                                            onClick={() => !type.disabled && setSelectedServiceType(type.id)}
                                            disabled={type.disabled}
                                            className={`p-4 rounded-xl border transition-all text-center flex flex-col items-center justify-center gap-2 ${selectedServiceType === type.id
                                                ? type.color + ' border-current ring-1 ring-offset-1'
                                                : type.disabled
                                                    ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                                                    : 'bg-white border-gray-100 hover:border-blue-200 hover:bg-slate-50 hover:shadow-sm'
                                                }`}
                                        >
                                            <div className={`p-3 rounded-full ${selectedServiceType === type.id ? 'bg-white/50' : 'bg-gray-50'} `}>
                                                <Icon className={`h-6 w-6 ${selectedServiceType === type.id ? 'text-current' : 'text-gray-500'}`} />
                                            </div>
                                            <div className="text-sm font-semibold">{type.label}</div>
                                            {type.disabled && <div className="text-[10px] uppercase tracking-wider font-bold text-gray-300">Coming Soon</div>}
                                        </button>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Services/Doctors List */}
                    <Card className="border-medical-border shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg">
                                {selectedServiceType === 'consultation' ? 'Select Doctor' : 'Select Services'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="max-h-80 overflow-y-auto space-y-2 pr-2">
                                {selectedServiceType === 'opd' && availableServices.map((service) => (
                                    <div
                                        key={service.service_id}
                                        className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 cursor-pointer transition-all group"
                                        onClick={() => addServiceToCart(service)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
                                                <Activity className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-gray-700">{service.service_name}</div>
                                                <div className="text-xs text-gray-500">{service.service_head}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="text-right">
                                                <span className="block font-bold text-gray-900">Rs. {parseFloat(service.service_rate).toLocaleString()}</span>
                                            </div>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-full">
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}

                                {selectedServiceType === 'consultation' && availableDoctors.map((doctor) => (
                                    <div
                                        key={doctor.doctor_id}
                                        className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-green-200 hover:bg-green-50/50 cursor-pointer transition-all group"
                                        onClick={() => addDoctorToCart(doctor)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-green-50 text-green-600 group-hover:bg-green-100 transition-colors">
                                                <Stethoscope className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-gray-700">Dr. {doctor.doctor_name}</div>
                                                <div className="text-xs text-gray-500">
                                                    {doctor.doctor_specialization}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="text-right">
                                                <span className="block font-bold text-gray-900">Rs. {parseFloat(doctor.consultation_fee).toLocaleString()}</span>
                                                <span className="text-[10px] text-green-600 font-medium bg-green-50 px-1.5 py-0.5 rounded-full inline-block">
                                                    Share: {doctor.doctor_share}%
                                                </span>
                                            </div>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 bg-green-50 hover:bg-green-100 rounded-full">
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}

                                {selectedServiceType === 'opd' && availableServices.length === 0 && (
                                    <div className="text-center py-12 flex flex-col items-center justify-center text-gray-400">
                                        <Activity className="h-12 w-12 mb-3 opacity-20" />
                                        <p>No services available</p>
                                    </div>
                                )}
                                {selectedServiceType === 'consultation' && availableDoctors.length === 0 && (
                                    <div className="text-center py-12 flex flex-col items-center justify-center text-gray-400">
                                        <Stethoscope className="h-12 w-12 mb-3 opacity-20" />
                                        <p>No doctors available</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Cart & Summary */}
                <div className="space-y-4">
                    {/* Cart */}
                    <Card className="border-medical-border shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Receipt className="h-5 w-5 text-medical-accent" />
                                Receipt Items
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {cartItems.length === 0 ? (
                                <div className="text-center py-8 text-gray-500 text-sm">
                                    No items added yet
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {cartItems.map((item, index) => (
                                        <div key={index} className="p-3 rounded-md bg-slate-50 border">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="text-sm font-medium flex-1 pr-2">{item.name}</div>
                                                <button onClick={() => removeFromCart(index)} className="text-red-500 hover:text-red-700">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                            <div className="flex items-center justify-between text-sm">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => updateCartItemQty(index, -1)}
                                                        className="w-6 h-6 rounded bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                                                    >
                                                        <Minus className="h-3 w-3" />
                                                    </button>
                                                    <span className="w-8 text-center">{item.qty}</span>
                                                    <button
                                                        onClick={() => updateCartItemQty(index, 1)}
                                                        className="w-6 h-6 rounded bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                                                    >
                                                        <Plus className="h-3 w-3" />
                                                    </button>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {item.editable ? (
                                                        <Input
                                                            type="number"
                                                            value={item.rate}
                                                            onChange={(e) => updateCartItemRate(index, e.target.value)}
                                                            className="w-20 h-7 text-right text-sm"
                                                        />
                                                    ) : (
                                                        <span className="font-mono">Rs. {item.rate.toLocaleString()}</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right text-sm font-medium mt-1">
                                                = Rs. {(item.rate * item.qty).toLocaleString()}
                                            </div>
                                            {item.type === 'consultation' && (
                                                <div className="text-xs text-green-600 mt-1">
                                                    Dr Share: {item.drShare}% (Rs. {(item.rate * item.qty * item.drShare / 100).toLocaleString()})
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Summary */}
                    <Card className="border-medical-border shadow-sm bg-slate-50">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Calculator className="h-5 w-5 text-medical-accent" />
                                Summary
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span>Total Amount</span>
                                <span className="font-mono font-medium">Rs. {totalAmount.toLocaleString()}</span>
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="discount" className="text-sm">Discount</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="discount"
                                        type="number"
                                        value={discount}
                                        onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                                        className="font-mono"
                                        min="0"
                                        max={totalAmount}
                                    />
                                </div>
                                {discount > 0 && (
                                    <Input
                                        placeholder="Discount reason..."
                                        value={discountReason}
                                        onChange={(e) => setDiscountReason(e.target.value)}
                                        className="text-sm"
                                    />
                                )}
                            </div>

                            <Separator />

                            <div className="flex justify-between font-medium">
                                <span>Payable</span>
                                <span className="font-mono text-lg text-medical-blue">Rs. {payableAmount.toLocaleString()}</span>
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="paid" className="text-sm">Paid Amount</Label>
                                <Input
                                    id="paid"
                                    type="number"
                                    value={paidAmount}
                                    onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                                    className="font-mono text-lg"
                                    min="0"
                                />
                            </div>

                            <div className="flex justify-between font-medium">
                                <span>Balance</span>
                                <span className={`font-mono text-lg ${balanceAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    Rs. {balanceAmount.toLocaleString()}
                                </span>
                            </div>

                            {totalDrShareAmount > 0 && (
                                <>
                                    <Separator />
                                    <div className="text-xs space-y-1 text-gray-600">
                                        <div className="flex justify-between">
                                            <span>Doctor Share</span>
                                            <span>Rs. {totalDrShareAmount.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Hospital Share</span>
                                            <span>Rs. {hospitalShare.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Messages */}
                            {error && (
                                <div className="p-2 rounded bg-red-50 text-red-700 text-sm flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4" /> {error}
                                </div>
                            )}
                            {success && (
                                <div className="p-2 rounded bg-green-50 text-green-700 text-sm flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4" /> {success}
                                </div>
                            )}

                            <Button
                                onClick={handleSubmit}
                                disabled={submitting || !patientData || cartItems.length === 0 || !currentShift}
                                className="w-full bg-medical-blue hover:bg-medical-blue/90"
                            >
                                {submitting ? 'Creating Receipt...' : 'Save Receipt'}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default OPDReceipt;
