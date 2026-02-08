import React, { useState, useEffect } from 'react';
import { Plus, Package, DollarSign, Trash2, Edit, RefreshCw, Check, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getAllServices, createService, deleteService } from '@/services/opdServicesService';

const OPDServicesSetup = () => {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // Form state with all fields from schema
    const [formData, setFormData] = useState({
        service_id: '',
        service_name: '',
        service_head: '',
        service_rate: '',
        required_consultant: false,
        price_editable: false
    });

    // Fetch services on mount
    useEffect(() => {
        fetchServices();
    }, []);

    const fetchServices = async () => {
        setLoading(true);
        try {
            const response = await getAllServices();
            if (response.success) {
                setServices(response.data);
            }
        } catch (err) {
            setError('Failed to fetch services. Please ensure backend is running.');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await createService({
                ...formData,
                service_rate: parseFloat(formData.service_rate) || 0
            });

            if (response.success) {
                setSuccess('Service added successfully!');
                setFormData({
                    service_id: '',
                    service_name: '',
                    service_head: '',
                    service_rate: '',
                    required_consultant: false,
                    price_editable: false
                });
                fetchServices();
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add service');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this service?')) return;

        try {
            await deleteService(id);
            fetchServices();
        } catch (err) {
            setError('Failed to delete service');
        }
    };

    // Group services by head/category for better display
    const groupedServices = services.reduce((acc, service) => {
        const head = service.service_head || 'Uncategorized';
        if (!acc[head]) acc[head] = [];
        acc[head].push(service);
        return acc;
    }, {});

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-medical-blue">OPD Services Setup</h2>
                    <p className="text-medical-text-muted">Configure available services for OPD billing</p>
                </div>
                <Button variant="outline" onClick={fetchServices} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Add Service Form */}
            <Card className="border-medical-border shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Plus className="h-5 w-5 text-medical-accent" />
                        Add New Service
                    </CardTitle>
                    <CardDescription>Define a new OPD service with pricing and options</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Row 1: ID, Name, Head */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="service_id">Service ID *</Label>
                                <Input
                                    id="service_id"
                                    name="service_id"
                                    placeholder="SRV001"
                                    value={formData.service_id}
                                    onChange={handleInputChange}
                                    required
                                    className="border-medical-border"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="service_name">Service Name *</Label>
                                <Input
                                    id="service_name"
                                    name="service_name"
                                    placeholder="General Consultation"
                                    value={formData.service_name}
                                    onChange={handleInputChange}
                                    required
                                    className="border-medical-border"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="service_head" className="flex items-center gap-1">
                                    <Package className="h-3 w-3" /> Service Head/Category *
                                </Label>
                                <Input
                                    id="service_head"
                                    name="service_head"
                                    placeholder="OPD, Lab, Radiology"
                                    value={formData.service_head}
                                    onChange={handleInputChange}
                                    required
                                    className="border-medical-border"
                                />
                            </div>
                        </div>

                        {/* Row 2: Rate */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="service_rate" className="flex items-center gap-1">
                                    <DollarSign className="h-3 w-3" /> Service Rate (PKR) *
                                </Label>
                                <Input
                                    id="service_rate"
                                    name="service_rate"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="500.00"
                                    value={formData.service_rate}
                                    onChange={handleInputChange}
                                    required
                                    className="border-medical-border"
                                />
                            </div>
                        </div>

                        {/* Row 3: Checkboxes */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center space-x-3 p-3 rounded-md border border-medical-border bg-slate-50">
                                <input
                                    type="checkbox"
                                    id="required_consultant"
                                    name="required_consultant"
                                    checked={formData.required_consultant}
                                    onChange={handleInputChange}
                                    className="h-4 w-4 rounded border-gray-300 text-medical-accent focus:ring-medical-accent"
                                />
                                <div>
                                    <Label htmlFor="required_consultant" className="cursor-pointer font-medium">
                                        Requires Consultant
                                    </Label>
                                    <p className="text-xs text-medical-text-muted">
                                        Check if this service requires a doctor consultation
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center space-x-3 p-3 rounded-md border border-medical-border bg-slate-50">
                                <input
                                    type="checkbox"
                                    id="price_editable"
                                    name="price_editable"
                                    checked={formData.price_editable}
                                    onChange={handleInputChange}
                                    className="h-4 w-4 rounded border-gray-300 text-medical-accent focus:ring-medical-accent"
                                />
                                <div>
                                    <Label htmlFor="price_editable" className="cursor-pointer font-medium">
                                        Price Editable
                                    </Label>
                                    <p className="text-xs text-medical-text-muted">
                                        Allow operators to modify the rate at billing time
                                    </p>
                                </div>
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
                                {submitting ? 'Adding...' : 'Add Service'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Separator />

            {/* Services List */}
            <Card className="border-medical-border shadow-sm">
                <CardHeader>
                    <CardTitle>Configured Services</CardTitle>
                    <CardDescription>{services.length} service(s) configured</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-8 text-medical-text-muted">
                            Loading services...
                        </div>
                    ) : services.length === 0 ? (
                        <div className="flex items-center justify-center py-8 text-medical-text-muted">
                            No services configured yet. Add your first service above.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-medical-border bg-medical-bg-header">
                                        <th className="text-left p-3 font-medium text-medical-text-secondary">ID</th>
                                        <th className="text-left p-3 font-medium text-medical-text-secondary">Service Name</th>
                                        <th className="text-left p-3 font-medium text-medical-text-secondary">Category</th>
                                        <th className="text-right p-3 font-medium text-medical-text-secondary">Rate (PKR)</th>
                                        <th className="text-center p-3 font-medium text-medical-text-secondary">Consultant Req.</th>
                                        <th className="text-center p-3 font-medium text-medical-text-secondary">Price Editable</th>
                                        <th className="text-center p-3 font-medium text-medical-text-secondary">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {services.map((service) => (
                                        <tr key={service.srl_no} className="border-b border-medical-border hover:bg-slate-50">
                                            <td className="p-3 font-mono text-xs">{service.service_id}</td>
                                            <td className="p-3 font-medium">{service.service_name}</td>
                                            <td className="p-3">
                                                <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-xs">
                                                    {service.service_head}
                                                </span>
                                            </td>
                                            <td className="p-3 text-right font-medium">
                                                {parseFloat(service.service_rate).toLocaleString()}
                                            </td>
                                            <td className="p-3 text-center">
                                                {service.required_consultant ? (
                                                    <Check className="h-4 w-4 text-green-600 mx-auto" />
                                                ) : (
                                                    <X className="h-4 w-4 text-slate-300 mx-auto" />
                                                )}
                                            </td>
                                            <td className="p-3 text-center">
                                                {service.price_editable ? (
                                                    <Check className="h-4 w-4 text-green-600 mx-auto" />
                                                ) : (
                                                    <X className="h-4 w-4 text-slate-300 mx-auto" />
                                                )}
                                            </td>
                                            <td className="p-3 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                        onClick={() => handleDelete(service.srl_no)}
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

export default OPDServicesSetup;
