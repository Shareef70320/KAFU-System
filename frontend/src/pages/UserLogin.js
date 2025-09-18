import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { 
  User, 
  Building2, 
  ArrowRight,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import api from '../lib/api';

const UserLogin = () => {
  const navigate = useNavigate();
  const { setCurrentSid } = useUser();
  const [sid, setSid] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validating, setValidating] = useState(false);

  const handleSidChange = (e) => {
    const value = e.target.value;
    setSid(value);
    setError('');
    
    // Auto-validate SID as user types (with debounce)
    if (value.length >= 4) {
      setValidating(true);
      validateSid(value);
    } else {
      setValidating(false);
    }
  };

  const validateSid = async (sidToValidate) => {
    try {
      const response = await api.get('/employees?limit=2000');
      const employees = response.data.employees || response.data;
      const employee = employees.find(emp => emp.sid === sidToValidate);
      
      if (employee) {
        setError('');
      } else {
        setError('Invalid SID. Please check and try again.');
      }
    } catch (error) {
      setError('Unable to validate SID. Please try again.');
    } finally {
      setValidating(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!sid.trim()) {
      setError('Please enter your SID');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Validate SID exists
      const response = await api.get('/employees?limit=2000');
      const employees = response.data.employees || response.data;
      const employee = employees.find(emp => emp.sid === sid.trim());

      if (employee) {
        // Set the SID in context and navigate to user dashboard
        setCurrentSid(sid.trim());
        navigate('/user');
      } else {
        setError('Invalid SID. Please check and try again.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Unable to login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLogin(e);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Building2 className="h-12 w-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">KAFU System</h1>
          <p className="text-gray-600">Employee Portal</p>
        </div>

        {/* Login Card */}
        <Card className="shadow-xl">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-semibold text-gray-900">
              Welcome Back
            </CardTitle>
            <p className="text-gray-600 mt-2">
              Please enter your Employee SID to access your dashboard
            </p>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="sid" className="text-sm font-medium text-gray-700">
                  Employee SID
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    id="sid"
                    type="text"
                    value={sid}
                    onChange={handleSidChange}
                    onKeyPress={handleKeyPress}
                    placeholder="Enter your SID (e.g., 2254)"
                    className={`pl-10 ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                    disabled={loading}
                    autoFocus
                  />
                  {validating && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                    </div>
                  )}
                  {!validating && sid.length >= 4 && !error && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                  )}
                </div>
                
                {error && (
                  <div className="flex items-center text-red-600 text-sm">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    {error}
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                disabled={loading || !sid.trim() || !!error}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Signing In...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    Sign In
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </div>
                )}
              </Button>
            </form>

            {/* Help Text */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                Don't know your SID? Contact your HR department.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-xs text-gray-500">
            © 2024 KAFU System. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default UserLogin;

