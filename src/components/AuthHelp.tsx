import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { HelpCircle, KeyRound, ShieldAlert, Mail } from "lucide-react";

export function AuthHelp() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" className="text-sm font-medium text-[#4a6850] hover:text-[#3d5643] hover:bg-transparent p-0 h-auto">
          <HelpCircle className="mr-2 h-4 w-4" />
          Need help?
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900">Login Help</DialogTitle>
          <DialogDescription className="text-gray-500">
            Choose an option below to get back into your account.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Link to="/forgot-password">
            <Button variant="outline" className="w-full justify-start h-auto py-4 px-4 hover:bg-gray-50 border-gray-200">
              <KeyRound className="mr-4 h-5 w-5 text-[#4a6850]" />
              <div className="flex flex-col items-start text-left">
                <span className="font-bold text-gray-900">Forgot Password?</span>
                <span className="text-xs text-gray-500 font-medium">Reset your password via email</span>
              </div>
            </Button>
          </Link>

          <Link to="/recover-account">
            <Button variant="outline" className="w-full justify-start h-auto py-4 px-4 hover:bg-gray-50 border-gray-200">
              <ShieldAlert className="mr-4 h-5 w-5 text-[#4a6850]" />
              <div className="flex flex-col items-start text-left">
                <span className="font-bold text-gray-900">Lost 2FA Device?</span>
                <span className="text-xs text-gray-500 font-medium">Recover access via email link</span>
              </div>
            </Button>
          </Link>

          <a href="mailto:support@hostelledger.com">
            <Button variant="outline" className="w-full justify-start h-auto py-4 px-4 hover:bg-gray-50 border-gray-200">
              <Mail className="mr-4 h-5 w-5 text-[#4a6850]" />
              <div className="flex flex-col items-start text-left">
                <span className="font-bold text-gray-900">Contact Support</span>
                <span className="text-xs text-gray-500 font-medium">Get help from our team</span>
              </div>
            </Button>
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
