
"use client";

import { LayoutDashboard, Kanban, Users, Settings, LogOut, Briefcase, ChevronRight } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/AuthProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface SidebarProps {
  userRole?: "admin" | "employee";
  className?: string;
}

export function Sidebar({ userRole, className }: SidebarProps) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const menuItems = [
    { name: "Dashboard", icon: LayoutDashboard, path: "/" },
    { name: "My Tasks", icon: Kanban, path: "/tasks" },
    ...(userRole === "admin" ? [{ name: "Team Members", icon: Users, path: "/team" }] : []),
    // { name: "Settings", icon: Settings, path: "/settings" },
  ];

  return (
    <div className={cn("h-full w-64 bg-[#0E0C15] text-slate-300 flex flex-col border-r border-[#2C243B] shadow-2xl font-sans", className)}>
      {/* Header / Logo Area */}
      <div className="p-6 flex items-center gap-3 mb-4">
        <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-900/40">
          <Briefcase className="h-4 w-4 text-white" />
        </div>
        <span className="font-bold text-xl tracking-tight text-white">TaskFlow</span>
      </div>

      {/* Navigation Links */}
      <ScrollArea className="flex-1 px-4">
        <div className="space-y-6">
          <div className="space-y-1">
            {menuItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <button
                  key={item.path}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 group relative overflow-hidden",
                    isActive
                      ? "text-white shadow-lg shadow-purple-900/20"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  )}
                  onClick={() => router.push(item.path)}
                >
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-600/20 to-blue-600/20 opacity-100" />
                  )}
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-violet-500 to-blue-500 rounded-r-full" />
                  )}

                  <item.icon className={cn("h-[18px] w-[18px] relative z-10", isActive ? "text-violet-300" : "text-slate-500 group-hover:text-slate-300")} />
                  <span className="flex-1 text-left relative z-10">{item.name}</span>
                </button>
              )
            })}
          </div>


        </div>
      </ScrollArea>

      {/* User Profile & Logout */}
      <div className="p-4 m-4 rounded-2xl bg-[#13111C] border border-[#2C243B]">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-9 w-9 border border-slate-700/50">
            <AvatarImage src={user?.photoURL || undefined} />
            <AvatarFallback className="bg-slate-800 text-slate-300 text-xs">{user?.displayName?.charAt(0) || "U"}</AvatarFallback>
          </Avatar>
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-white truncate">{user?.displayName || "User"}</p>
            <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
          onClick={handleLogout}
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}