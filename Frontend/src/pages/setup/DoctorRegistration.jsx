import React, { useState, useEffect } from 'react';
import { UserPlus, Phone, Mail, Building2, GraduationCap, Stethoscope, Percent, DollarSign, Trash2, Edit, RefreshCw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getAllDoctors, createDoctor, deleteDoctor } from '@/services/doctorsService';

const DoctorRegistration = () => {
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // Form state with all fields from schema
    const [formData, setFormData] = useState({
        doctor_id: '',
        doctor_name: '',
        doctor_specialization: '',
        doctor_department: '',
        doctor_qualification: '',
        doctor_phone: '',
        doctor_email: '',
        doctor_address: '',
        doctor_share: '',
        consultation_fee: ''
    });

    // Fetch doctors on mount
    useEffect(() => {
        fetchDoctors();
    }, []);

    const fetchDoctors = async () => {
        setLoading(true);
        try {
            const response = await getAllDoctors();
            if (response.success) {
                setDoctors(response.data);
            }
        } catch (err) {
            setError('Failed to fetch doctors. Please ensure backend is running.');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await createDoctor({
                ...formData,
                doctor_share: parseFloat(formData.doctor_share) || 0,
                consultation_fee: parseFloat(formData.consultation_fee) || 0
            });

            if (response.success) {
                setSuccess('Doctor registered successfully!');
                setFormData({
                    doctor_id: '',
                    doctor_name: '',
                    doctor_specialization: '',
                    doctor_department: '',
                    doctor_qualification: '',
                    doctor_phone: '',
                    doctor_email: '',
                    doctor_address: '',
                    doctor_share: '',
                    consultation_fee: ''
                });
                fetchDoctors();
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to register doctor');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this doctor?')) return;

        try {
            await deleteDoctor(id);
            fetchDoctors();
        } catch (err) {
            setError('Failed to delete doctor');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-medical-blue">Doctor Registration</h2>
                    <p className="text-medical-text-muted">Add and manage consultant doctors</p>
                </div>
                <Button variant="outline" onClick={fetchDoctors} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Registration Form */}
            <Card className="border-medical-border shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <UserPlus className="h-5 w-5 text-medical-accent" />
                        Register New Doctor
                    </CardTitle>
                    <CardDescription>Fill in all the details to register a new consultant</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Row 1: ID and Name */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="doctor_id">Doctor ID *</Label>
                                <Input
                                    id="doctor_id"
                                    name="doctor_id"
                                    placeholder="DOC001"
                                    value={formData.doctor_id}
                                    onChange={handleInputChange}
                                    required
                                    className="border-medical-border"
                                />
                            </div>
                            <div className="space-y-2 lg:col-span-2">
                                <Label htmlFor="doctor_name">Full Name *</Label>
                                <Input
                                    id="doctor_name"
                                    name="doctor_name"
                                    placeholder="Dr. John Doe"
                                    value={formData.doctor_name}
                                    onChange={handleInputChange}
                                    required
                                    className="border-medical-border"
                                />
                            </div>
                        </div>

                        {/* Row 2: Specialization, Department, Qualification */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="doctor_specialization" className="flex items-center gap-1">
                                    <Stethoscope className="h-3 w-3" /> Specialization
                                </Label>
                                <Input
                                    id="doctor_specialization"
                                    name="doctor_specialization"
                                    placeholder="Cardiologist"
                                    value={formData.doctor_specialization}
                                    onChange={handleInputChange}
                                    className="border-medical-border"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="doctor_department" className="flex items-center gap-1">
                                    <Building2 className="h-3 w-3" /> Department
                                </Label>
                                <Input
                                    id="doctor_department"
                                    name="doctor_department"
                                    placeholder="Cardiology"
                                    value={formData.doctor_department}
                                    onChange={handleInputChange}
                                    className="border-medical-border"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="doctor_qualification" className="flex items-center gap-1">
                                    <GraduationCap className="h-3 w-3" /> Qualification
                                </Label>
                                <Input
                                    id="doctor_qualification"
                                    name="doctor_qualification"
                                    placeholder="MBBS, FCPS"
                                    value={formData.doctor_qualification}
                                    onChange={handleInputChange}
                                    className="border-medical-border"
                                />
                            </div>
                        </div>

                        {/* Row 3: Phone, Email */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="doctor_phone" className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" /> Phone Number
                                </Label>
                                <Input
                                    id="doctor_phone"
                                    name="doctor_phone"
                                    type="tel"
                                    placeholder="+92 300 1234567"
                                    value={formData.doctor_phone}
                                    onChange={handleInputChange}
                                    className="border-medical-border"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="doctor_email" className="flex items-center gap-1">
                                    <Mail className="h-3 w-3" /> Email Address
                                </Label>
                                <Input
                                    id="doctor_email"
                                    name="doctor_email"
                                    type="email"
                                    placeholder="doctor@hospital.com"
                                    value={formData.doctor_email}
                                    onChange={handleInputChange}
                                    className="border-medical-border"
                                />
                            </div>
                        </div>

                        {/* Row 4: Address */}
                        <div className="space-y-2">
                            <Label htmlFor="doctor_address">Address</Label>
                            <Input
                                id="doctor_address"
                                name="doctor_address"
                                placeholder="Full address"
                                value={formData.doctor_address}
                                onChange={handleInputChange}
                                className="border-medical-border"
                            />
                        </div>

                        {/* Row 5: Share and Fee */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="doctor_share" className="flex items-center gap-1">
                                    <Percent className="h-3 w-3" /> Doctor Share (%)
                                </Label>
                                <Input
                                    id="doctor_share"
                                    name="doctor_share"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    placeholder="30.00"
                                    value={formData.doctor_share}
                                    onChange={handleInputChange}
                                    className="border-medical-border"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="consultation_fee" className="flex items-center gap-1">
                                    <DollarSign className="h-3 w-3" /> Consultation Fee (PKR)
                                </Label>
                                <Input
                                    id="consultation_fee"
                                    name="consultation_fee"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="500.00"
                                    value={formData.consultation_fee}
                                    onChange={handleInputChange}
                                    className="border-medical-border"
                                />
                            </div>
                        </div>

                        {/* Error/Success Messages */}
                        {error && (
                            <div className="p-3 rounded-md bg-red-50 text-red-700 text-sm border border-red-200">
                                {error}
                            </div>
                        )}
                        {success && (
                            <div className="p-3 rounded-md bg-green-50 text-green-700 text-sm border border-green-200">
                                {success}
                            </div>
                        )}

                        {/* Submit Button */}
                        <div className="flex justify-end">
                            <Button type="submit" disabled={submitting} className="bg-medical-blue hover:bg-medical-blue/90">
                                {submitting ? 'Registering...' : 'Register Doctor'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Separator />

            {/* Registered Doctors List */}
            <Card className="border-medical-border shadow-sm">
                <CardHeader>
                    <CardTitle>Registered Doctors</CardTitle>
                    <CardDescription>{doctors.length} doctor(s) registered</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-8 text-medical-text-muted">
                            Loading doctors...
                        </div>
                    ) : doctors.length === 0 ? (
                        <div className="flex items-center justify-center py-8 text-medical-text-muted">
                            No doctors registered yet. Add your first doctor above.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-medical-border bg-medical-bg-header">
                                        <th className="text-left p-3 font-medium text-medical-text-secondary">ID</th>
                                        <th className="text-left p-3 font-medium text-medical-text-secondary">Name</th>
                                        <th className="text-left p-3 font-medium text-medical-text-secondary">Specialization</th>
                                        <th className="text-left p-3 font-medium text-medical-text-secondary">Department</th>
                                        <th className="text-left p-3 font-medium text-medical-text-secondary">Phone</th>
                                        <th className="text-right p-3 font-medium text-medical-text-secondary">Share %</th>
                                        <th className="text-right p-3 font-medium text-medical-text-secondary">Fee</th>
                                        <th className="text-center p-3 font-medium text-medical-text-secondary">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {doctors.map((doctor) => (
                                        <tr key={doctor.srl_no} className="border-b border-medical-border hover:bg-slate-50">
                                            <td className="p-3 font-mono text-xs">{doctor.doctor_id}</td>
                                            <td className="p-3 font-medium">{doctor.doctor_name}</td>
                                            <td className="p-3">{doctor.doctor_specialization || '-'}</td>
                                            <td className="p-3">{doctor.doctor_department || '-'}</td>
                                            <td className="p-3">{doctor.doctor_phone || '-'}</td>
                                            <td className="p-3 text-right">{doctor.doctor_share}%</td>
                                            <td className="p-3 text-right">PKR {parseFloat(doctor.consultation_fee).toLocaleString()}</td>
                                            <td className="p-3 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                        onClick={() => handleDelete(doctor.srl_no)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
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

export default DoctorRegistration;
