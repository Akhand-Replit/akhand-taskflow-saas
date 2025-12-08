"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Menu, Loader2 } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { toast } from "sonner";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [role, setRole] = useState<"admin" | "employee">("employee");
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    async function checkProfile() {
      if (authLoading) return;
      if (!user) {
        router.push("/login");
        return;
      }
      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (!userData.currentCompanyId) {
            router.push("/onboarding");
            return;
          }
          setRole(userData.role);
          setIsChecking(false);
        } else {
          router.push("/onboarding");
        }
      } catch (error: any) {
        console.error("Profile check error", error);
        if (error.code === 'unavailable' || error.message?.includes("offline")) {
          toast.error("Network error. Please check your connection.");
        } else {
          toast.error("Failed to verify account status.");
        }
        setIsChecking(false);
      }
    }
    checkProfile();
  }, [user, authLoading, router]);

  if (authLoading || isChecking) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <div className="text-center">
            <p className="text-sm font-medium">Setting up your workspace...</p>
            <p className="text-xs text-muted-foreground">Verifying profile & company data</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center px-4 z-40">
        <Sheet>
          <SheetTrigger asChild>
            <button className="p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md">
              <Menu className="h-6 w-6 text-slate-600 dark:text-slate-300" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 border-r-0 bg-[#0E0C15]">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <Sidebar userRole={role} className="w-full h-full shadow-none border-none" />
          </SheetContent>
        </Sheet>
        <span className="ml-2 font-bold text-lg">TaskFlow</span>
      </div>

      {/* Desktop Sidebar (Fixed) */}
      <div className="hidden md:block fixed h-full w-64 z-50">
        <Sidebar userRole={role} />
      </div>

      {/* Main Content Area */}
      {/* Added pt-16 for mobile header space, removed on desktop (pt-0) */}
      {/* Adjusted margin: ml-0 on mobile, ml-64 on desktop */}
      <main className="flex-1 ml-0 md:ml-64 p-4 md:p-8 pt-20 md:pt-8 overflow-y-auto h-screen">
        {children}
      </main>
    </div>
  );
}