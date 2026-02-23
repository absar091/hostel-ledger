import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ChevronLeft, Loader2, Mail } from "lucide-react";
import { callSecureApi } from "@/lib/api";

const RecoverAccount = () => {
  const { user } = useFirebaseAuth();
  const [email, setEmail] = useState(user?.email || "");
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Handle token processing if user clicks the link
  const token = searchParams.get('token');
  const uid = searchParams.get('uid');
  const mode = searchParams.get('mode');

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    setIsLoading(true);
    try {
      // Call the backend endpoint to send reset email
      const result = await callSecureApi('/api/2fa/initiate-reset', { email });
      if (result.success) {
        setIsSent(true);
        toast.success("Reset link sent to your email");
      } else {
        toast.error(result.error || "Failed to send reset link");
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteReset = async () => {
    if (!token || !uid) return;

    setIsLoading(true);
    try {
      const result = await callSecureApi('/api/2fa/complete-reset', { uid, token });
      if (result.success) {
        toast.success("2FA Disabled Successfully");
        navigate('/'); // Redirect to dashboard (now unlocked)
      } else {
        toast.error(result.error || "Failed to disable 2FA");
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  // If token is present, show processing UI
  if (token && uid && mode === 'reset2fa') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Disable 2FA</CardTitle>
            <CardDescription>Confirming your request to disable Two-Factor Authentication.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={handleCompleteReset}
              disabled={isLoading}
              variant="destructive"
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirm Disable 2FA
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md mb-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 pl-0 hover:bg-transparent">
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Card className="w-full shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Recover Account</CardTitle>
            <CardDescription>
              Lost access to your authenticator app? Request a reset link to disable 2FA.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isSent ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-2">
                  <Mail className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-green-800 mb-1">Check your email</h3>
                <p className="text-sm text-green-700">
                  We've sent a link to <strong>{email}</strong>. Click the link to disable 2FA and regain access.
                </p>
                <Button
                  variant="outline"
                  className="mt-4 w-full"
                  onClick={() => setIsSent(false)}
                >
                  Try another email
                </Button>
              </div>
            ) : (
              <form onSubmit={handleResetRequest} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your registered email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={!!user?.email} // If user is known (stuck in 2FA), lock it
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>
              </form>
            )}
          </CardContent>
          <CardFooter className="flex justify-center border-t p-4 bg-gray-50/50 rounded-b-xl">
            <p className="text-xs text-center text-gray-500">
              If you still can't access your account, please contact support.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default RecoverAccount;
