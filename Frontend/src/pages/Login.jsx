import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Hospital, CheckCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const Login = () => {
    const navigate = useNavigate();

    const handleLogin = (e) => {
        e.preventDefault();
        // Placeholder login logic
        navigate('/dashboard');
    };

    return (
        <div className="min-h-screen bg-medical-bg-app flex items-center justify-center p-4">
            <Card className="w-full max-w-md shadow-lg border-medical-border">
                <CardHeader className="space-y-1 items-center text-center">
                    <div className="w-12 h-12 bg-medical-blue/10 rounded-full flex items-center justify-center mb-4">
                        <Hospital className="h-6 w-6 text-medical-blue" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-medical-blue">HIMS Enterprise</CardTitle>
                    <CardDescription>
                        Enter your credentials to access the system
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="username">Username</Label>
                            <Input id="username" placeholder="admin" required className="border-medical-border focus:ring-medical-accent" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input id="password" type="password" required className="border-medical-border focus:ring-medical-accent" />
                        </div>
                        <Button type="submit" className="w-full bg-medical-blue hover:bg-medical-blue/90">
                            Sign In
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex flex-col space-y-2 text-center text-sm text-medical-text-muted">
                    <div className="flex items-center justify-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>Secure System Access</span>
                    </div>
                    <p>© 2026 InfinityCodeHIMS.</p>
                </CardFooter>
            </Card>
        </div>
    );
};

export default Login;
