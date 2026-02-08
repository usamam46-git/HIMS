import React, { useState } from 'react';
import {
    User, Calendar, Phone, MapPin, Activity,
    FileText, Search, Plus, Save, History,
    CreditCard, Clock, AlertCircle, RefreshCw, Edit, Mail, Briefcase, Users
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPatientByMR, createPatient, updatePatient } from '@/services/mrDataService';

const MRDetails = () => {
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // Patient Data State matching existing DB schema
    const [patientData, setPatientData] = useState({
        mr_number: '',
        first_name: '',
        last_name: '',
        guardian_name: '', // was father_husband_name
        guardian_relation: 'Parent',
        cnic: '',
        age: '',
        gender: 'Male',
        phone: '', // was phone_number
        email: '',
        profession: '',
        address: '',
        city: '',
        blood_group: ''
    });

    const [history, setHistory] = useState([]);
    const [isNewPatient, setIsNewPatient] = useState(true);

    // Handle MR Number Search/Blur
    const handleMrBlur = async () => {
        if (!patientData.mr_number) return;
        if (patientData.mr_number.length < 3) return;

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await getPatientByMR(patientData.mr_number);
            if (response.success) {
                const { history: visitHistory, ...data } = response.data;
                // Map backend response to local state if needed
                // Backend returns same keys mostly, except patient_name composite which we can ignore 
                // if we use first_name/last_name from raw data
                setPatientData(prev => ({
                    ...prev,
                    ...data,
                    // Ensure we handle potentially null fields
                    last_name: data.last_name || '',
                    guardian_relation: data.guardian_relation || 'Parent',
                    email: data.email || '',
                    profession: data.profession || ''
                }));

                // Handle Legacy Appointment Date
                let displayedHistory = [...(visitHistory || [])];
                if (data.appointment_date) {
                    // Check if this date is already in history to avoid duplicates if needed, 
                    // but usually legacy date is separate.
                    const legacyDate = new Date(data.appointment_date).toISOString().split('T')[0];
                    const hasDate = displayedHistory.some(h => h.date && h.date.startsWith(legacyDate));

                    if (!hasDate) {
                        displayedHistory.push({
                            srl_no: 'legacy-' + data.id,
                            date: data.appointment_date,
                            time: 'Legacy',
                            receipt_id: 'Old Record',
                            paid: 0,
                            dr_share: 0 // Will show as 'General' or we can customize
                        });
                        // Sort by date descending
                        displayedHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
                    }
                }

                setHistory(displayedHistory);
                setIsNewPatient(false);
                setSuccess('Patient record found.');
            }
        } catch (err) {
            if (err.response && err.response.status === 404) {
                setIsNewPatient(true);
                setHistory([]);
                setSuccess('New MR Number available.');
            } else {
                setError('Error searching MR Number.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleMrBlur();
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setPatientData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        setSuccess(null);

        const payload = {
            ...patientData,
            age: patientData.age ? parseInt(patientData.age) : null,
            // Map fields that the backend expects if they differ (backend now handles first_name/last_name directly)
        };

        try {
            let response;
            if (isNewPatient) {
                response = await createPatient(payload);
            } else {
                response = await updatePatient(patientData.mr_number, payload);
            }

            if (response.success) {
                setSuccess(isNewPatient ? 'New Patient Registered Successfully!' : 'Patient Details Updated Successfully!');
                if (isNewPatient && response.data.mr_number) {
                    setPatientData(prev => ({ ...prev, mr_number: response.data.mr_number }));
                    setIsNewPatient(false);
                }
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save patient record.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleClear = () => {
        setPatientData({
            mr_number: '',
            first_name: '',
            last_name: '',
            guardian_name: '',
            guardian_relation: 'Parent',
            cnic: '',
            age: '',
            gender: 'Male',
            phone: '',
            email: '',
            profession: '',
            address: '',
            city: '',
            blood_group: ''
        });
        setHistory([]);
        setIsNewPatient(true);
        setError(null);
        setSuccess(null);
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-medical-blue">MR Details</h2>
                    <p className="text-medical-text-muted">Patient Master Index & Medical Record</p>
                </div>
                <Button variant="outline" onClick={handleClear}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Patient
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Form */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="border-medical-border shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5 text-medical-accent" />
                                {isNewPatient ? 'New Patient Registration' : 'Edit Patient Details'}
                            </CardTitle>
                            <CardDescription>
                                {isNewPatient
                                    ? 'Enter details to register. MR Number is auto-generated if left blank.'
                                    : 'Update existing patient information.'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-6">

                                {/* Row 1: MR Number */}
                                <div className="bg-slate-50 p-4 rounded-md border border-medical-border">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                                        <div className="space-y-2">
                                            <Label htmlFor="mr_number" className="font-semibold text-medical-blue">MR Number</Label>
                                            <div className="relative">
                                                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                                <Input
                                                    id="mr_number"
                                                    name="mr_number"
                                                    placeholder="Auto-generate or search..."
                                                    className="pl-9 border-medical-border focus:ring-medical-accent font-mono"
                                                    value={patientData.mr_number}
                                                    onChange={handleInputChange}
                                                    onBlur={handleMrBlur}
                                                    onKeyDown={handleKeyDown}
                                                />
                                            </div>
                                        </div>
                                        <div className="pb-2">
                                            {loading && <span className="text-sm text-blue-600 flex items-center"><RefreshCw className="h-3 w-3 mr-1 animate-spin" /> Searching...</span>}
                                            {isNewPatient && patientData.mr_number && !loading && !error && <span className="text-sm text-green-600 flex items-center"><Plus className="h-3 w-3 mr-1" /> Creating New MR</span>}
                                            {!isNewPatient && <span className="text-sm text-blue-600 flex items-center"><Edit className="h-3 w-3 mr-1" /> Editing Existing Record</span>}
                                        </div>
                                    </div>
                                </div>

                                {/* Row 2: Name */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="first_name">First Name *</Label>
                                        <Input
                                            id="first_name"
                                            name="first_name"
                                            value={patientData.first_name}
                                            onChange={handleInputChange}
                                            required
                                            className="border-medical-border"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="last_name">Last Name</Label>
                                        <Input
                                            id="last_name"
                                            name="last_name"
                                            value={patientData.last_name}
                                            onChange={handleInputChange}
                                            className="border-medical-border"
                                        />
                                    </div>
                                </div>

                                {/* Row 3: Guardian */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor="guardian_name">Guardian Name (Father/Husband)</Label>
                                        <Input
                                            id="guardian_name"
                                            name="guardian_name"
                                            value={patientData.guardian_name}
                                            onChange={handleInputChange}
                                            className="border-medical-border"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="guardian_relation">Relation</Label>
                                        <select
                                            id="guardian_relation"
                                            name="guardian_relation"
                                            className="flex h-10 w-full rounded-md border border-medical-border bg-background px-3 py-2 text-sm"
                                            value={patientData.guardian_relation}
                                            onChange={handleInputChange}
                                        >
                                            <option value="Parent">Parent</option>
                                            <option value="Spouse">Spouse</option>
                                            <option value="Sibling">Sibling</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Row 4: Personal Details */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="gender">Gender *</Label>
                                        <select
                                            id="gender"
                                            name="gender"
                                            className="flex h-10 w-full rounded-md border border-medical-border bg-background px-3 py-2 text-sm"
                                            value={patientData.gender}
                                            onChange={handleInputChange}
                                        >
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="dob">Date of Birth</Label>
                                        <Input
                                            id="dob"
                                            name="dob"
                                            type="date"
                                            value={patientData.dob ? patientData.dob.split('T')[0] : ''}
                                            onChange={handleInputChange}
                                            className="border-medical-border"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="age">Age</Label>
                                        <Input
                                            id="age"
                                            name="age"
                                            type="number"
                                            value={patientData.age}
                                            onChange={handleInputChange}
                                            className="border-medical-border"
                                        />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor="profession">Profession</Label>
                                        <div className="relative">
                                            <Briefcase className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                            <Input
                                                id="profession"
                                                name="profession"
                                                ref={undefined}
                                                className="pl-9 border-medical-border"
                                                value={patientData.profession}
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Row 5: Contact */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Phone Number</Label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                            <Input
                                                id="phone"
                                                name="phone"
                                                className="pl-9 border-medical-border"
                                                value={patientData.phone}
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                            <Input
                                                id="email"
                                                name="email"
                                                type="email"
                                                className="pl-9 border-medical-border"
                                                value={patientData.email}
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="cnic">CNIC</Label>
                                        <Input
                                            id="cnic"
                                            name="cnic"
                                            placeholder="00000-0000000-0"
                                            value={patientData.cnic}
                                            onChange={handleInputChange}
                                            className="border-medical-border"
                                        />
                                    </div>
                                </div>

                                {/* Row 6: Address */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor="address">Address</Label>
                                        <Input
                                            id="address"
                                            name="address"
                                            value={patientData.address}
                                            onChange={handleInputChange}
                                            className="border-medical-border"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="city">City</Label>
                                        <Input
                                            id="city"
                                            name="city"
                                            value={patientData.city}
                                            onChange={handleInputChange}
                                            className="border-medical-border"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="blood_group">Blood Group</Label>
                                        <select
                                            id="blood_group"
                                            name="blood_group"
                                            className="flex h-10 w-full rounded-md border border-medical-border bg-background px-3 py-2 text-sm"
                                            value={patientData.blood_group || ''}
                                            onChange={handleInputChange}
                                        >
                                            <option value="">Select...</option>
                                            <option value="A+">A+</option>
                                            <option value="A-">A-</option>
                                            <option value="B+">B+</option>
                                            <option value="B-">B-</option>
                                            <option value="AB+">AB+</option>
                                            <option value="AB-">AB-</option>
                                            <option value="O+">O+</option>
                                            <option value="O-">O-</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Messages */}
                                {error && (
                                    <div className="flex items-center gap-2 p-3 rounded-md bg-red-50 text-red-700 text-sm border border-red-200">
                                        <AlertCircle className="h-4 w-4" /> {error}
                                    </div>
                                )}
                                {success && (
                                    <div className="p-3 rounded-md bg-green-50 text-green-700 text-sm border border-green-200">
                                        {success}
                                    </div>
                                )}

                                <div className="flex justify-end pt-4">
                                    <Button type="submit" disabled={submitting} className="bg-medical-blue hover:bg-medical-blue/90 w-full md:w-auto">
                                        {submitting ? 'Saving...' : (isNewPatient ? 'Register Patient' : 'Update Record')}
                                    </Button>
                                </div>

                            </form>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: History & Stats */}
                <div className="space-y-6">
                    {/* Quick Stats Card */}
                    <Card className="border-medical-border shadow-sm bg-slate-50">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg">Visit Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white p-3 rounded border text-center">
                                    <div className="text-2xl font-bold text-medical-blue">{history.length}</div>
                                    <div className="text-xs text-medical-text-muted">Total Visits</div>
                                </div>
                                <div className="bg-white p-3 rounded border text-center">
                                    <div className="text-2xl font-bold text-green-600">
                                        {history.filter(h => h.date === new Date().toISOString().split('T')[0]).length}
                                    </div>
                                    <div className="text-xs text-medical-text-muted">Visits Today</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Visit History Timeline */}
                    <Card className="border-medical-border shadow-sm h-full max-h-[600px] overflow-hidden flex flex-col">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <History className="h-5 w-5 text-medical-accent" />
                                Visit History
                            </CardTitle>
                            <CardDescription>Recent OPD visits and consultations</CardDescription>
                        </CardHeader>
                        <CardContent className="overflow-y-auto flex-1 pr-2">
                            {history.length === 0 ? (
                                <div className="text-center py-8 text-medical-text-muted text-sm">
                                    No visit history found for this patient.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {history.map((visit) => (
                                        <div key={visit.srl_no} className="border-l-2 border-medical-border pl-4 pb-4 relative last:pb-0">
                                            <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-medical-blue border-2 border-white ring-1 ring-medical-border"></div>
                                            <div className="text-sm font-semibold text-medical-text-primary">
                                                {new Date(visit.date).toLocaleDateString()}
                                            </div>
                                            <div className="text-xs text-medical-text-muted flex items-center gap-1 mb-1">
                                                <Clock className="h-3 w-3" /> {visit.time}
                                            </div>
                                            <div className="bg-slate-50 p-2 rounded border border-slate-100 text-sm">
                                                <div className="font-medium text-medical-blue">
                                                    {visit.receipt_id}
                                                </div>
                                                <div className="text-xs mt-1">
                                                    Dr. {visit.dr_share > 0 ? 'Consultant' : 'General'}
                                                </div>
                                                <div className="text-xs mt-1 font-mono text-slate-600">
                                                    Paid: {parseFloat(visit.paid).toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default MRDetails;
