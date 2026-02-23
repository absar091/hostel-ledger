import React, { useState } from "react";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ShieldCheck, HelpCircle, LogOut, Loader2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { useNavigate } from "react-router-dom";

const TwoFactorVerification = () => {
  const { verify2FA, logout } = useFirebaseAuth();
  const [token, setToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTrusted, setIsTrusted] = useState(true);
  const navigate = useNavigate();

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!token || token.length !== 6) {
      toast.error("Please enter a valid 6-digit code");
      return;
    }

    setIsLoading(true);
    try {
      const deviceInfo = {
        userAgent: navigator.userAgent,
        screen: `${window.screen.width}x${window.screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };

      const result = await verify2FA(token, isTrusted, deviceInfo);
      if (result.success) {
        toast.success("Verified successfully");
      } else {
        toast.error(result.error || "Verification failed");
        setToken("");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-t-4 border-t-primary animate-in fade-in zoom-in-95 duration-200">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Two-Factor Authentication</CardTitle>
          <CardDescription>
            Enter the 6-digit code from your authenticator app to verify your identity.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={token}
              onChange={(val) => {
                setToken(val);
                if (val.length === 6) {
                  // Allow auto-submit logic if needed
                }
              }}
            >
              <InputOTPGroup className="gap-2">
                <InputOTPSlot index={0} className="w-10 h-12 text-lg border rounded-md" />
                <InputOTPSlot index={1} className="w-10 h-12 text-lg border rounded-md" />
                <InputOTPSlot index={2} className="w-10 h-12 text-lg border rounded-md" />
                <InputOTPSlot index={3} className="w-10 h-12 text-lg border rounded-md" />
                <InputOTPSlot index={4} className="w-10 h-12 text-lg border rounded-md" />
                <InputOTPSlot index={5} className="w-10 h-12 text-lg border rounded-md" />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <div className="flex items-center space-x-2 justify-center">
            <Checkbox
              id="trust-device"
              checked={isTrusted}
              onCheckedChange={(checked) => setIsTrusted(checked as boolean)}
            />
            <Label htmlFor="trust-device" className="text-sm font-medium cursor-pointer">
              Trust this device for 30 days
            </Label>
          </div>

          <Button
            className="w-full h-11 text-base"
            onClick={() => handleVerify()}
            disabled={isLoading || token.length !== 6}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...
              </>
            ) : (
              "Verify Identity"
            )}
          </Button>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 bg-gray-50/50 rounded-b-xl border-t p-6">
          <div className="grid grid-cols-2 gap-4 w-full">
            <Button variant="outline" size="sm" onClick={() => navigate('/recover-account')} className="w-full">
              <KeyRound className="mr-2 h-4 w-4" />
              Recover Account
            </Button>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full">
                    <HelpCircle className="mr-2 h-4 w-4" />
                    Help
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Open your Google Authenticator or Authy app to find the code.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <Button
            variant="link"
            size="sm"
            onClick={() => logout()}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Log out and try with another account
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default TwoFactorVerification;
