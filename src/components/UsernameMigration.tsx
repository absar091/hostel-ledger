import { useState, useEffect } from "react";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Check, X, AtSign } from "lucide-react";
import { logger } from "@/lib/logger";

const UsernameMigration = () => {
    const { user, updateUserProfile, checkUsernameAvailable } = useFirebaseAuth();
    const [open, setOpen] = useState(false);
    const [username, setUsername] = useState("");
    const [isChecking, setIsChecking] = useState(false);
    const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        // Check if user is loaded and has no username
        if (user && !user.username) {
            // Suggest a username based on name
            const suggested = user.name
                ? user.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9._]/g, '')
                : "";
            setUsername(suggested);
            setOpen(true);
        }
    }, [user]);

    const handleUsernameChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, '');
        setUsername(value);
        setIsAvailable(null);
        setError("");

        if (value.length < 3) return;

        setIsChecking(true);
        try {
            const available = await checkUsernameAvailable(value);
            setIsAvailable(available);
            if (!available) setError("Username is already taken");
        } catch (err) {
            console.error(err);
        } finally {
            setIsChecking(false);
        }
    };

    const handleSubmit = async () => {
        if (!username || username.length < 3) {
            setError("Username must be at least 3 characters");
            return;
        }

        if (isAvailable === false) {
            return;
        }

        setIsSaving(true);
        try {
            const result = await updateUserProfile({ username });
            if (result.success) {
                toast.success("Username set successfully! 🎉");
                setOpen(false);
                logger.info("Username migration successful", { uid: user?.uid, username });
            } else {
                setError(result.error || "Failed to set username");
            }
        } catch (err: any) {
            setError(err.message || "An error occurred");
        } finally {
            setIsSaving(false);
        }
    };

    if (!open) return null;

    return (
        <Dialog open={open} onOpenChange={(val) => !val && setOpen(val)}> {/* Prevent closing by clicking outside if mandatory? For now allow close */}
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Choose a Username</DialogTitle>
                    <DialogDescription>
                        We've updated our system! Please choose a unique @username to make it easier for friends to invite you.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <div className="relative">
                            <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                id="username"
                                value={username}
                                onChange={handleUsernameChange}
                                className={`pl-9 ${isAvailable === true ? 'border-green-500 focus-visible:ring-green-500' : isAvailable === false ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                                placeholder="username"
                                autoFocus
                            />
                            {isChecking && (
                                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                            )}
                            {!isChecking && isAvailable === true && (
                                <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                            )}
                            {!isChecking && isAvailable === false && (
                                <X className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
                            )}
                        </div>
                        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
                        <p className="text-xs text-gray-400">
                            Only letters, numbers, dots, and underscores allowed.
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button onClick={handleSubmit} disabled={isSaving || isChecking || isAvailable === false || username.length < 3}>
                        {isSaving ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            "Claim Username"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default UsernameMigration;
