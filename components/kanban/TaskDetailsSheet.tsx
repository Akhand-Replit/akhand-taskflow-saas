"use client";

import { useState, useEffect } from "react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    addDoc,
    serverTimestamp,
    doc,
    updateDoc,
    deleteDoc,
    getDocs,
    getDoc,
    where
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/components/providers/AuthProvider";
import { Task, ActivityLog } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, User, CalendarDays, Flag, Edit2, Check, X, Trash2, Users, Paperclip, Link as LinkIcon, ExternalLink, Plus, MessageSquare, Reply, Clock } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { logActivity } from "@/lib/logger";

interface TaskDetailsSheetProps {
    task: Task | null;
    isOpen: boolean;
    onClose: () => void;
}

interface Comment {
    id: string;
    text: string;
    userId: string;
    userDisplayName: string;
    userPhoto?: string;
    createdAt: any;
    parentId?: string | null;
}

interface Member {
    uid: string;
    displayName: string;
    email: string;
    photoURL?: string;
}

interface Creator {
    uid: string;
    displayName: string;
    photoURL?: string;
}

export function TaskDetailsSheet({ task, isOpen, onClose }: TaskDetailsSheetProps) {
    const { user } = useAuth();
    const [comments, setComments] = useState<Comment[]>([]);
    const [activities, setActivities] = useState<ActivityLog[]>([]);
    const [creator, setCreator] = useState<Creator | null>(null);
    const [newComment, setNewComment] = useState("");
    const [replyTo, setReplyTo] = useState<string | null>(null);
    const [isSending, setIsSending] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("comments");

    // Editing States
    const [editTitle, setEditTitle] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [editPriority, setEditPriority] = useState("medium");

    // Assignee Editing States
    const [members, setMembers] = useState<Member[]>([]);
    const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
    const [isMembersLoading, setIsMembersLoading] = useState(false);

    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Initialize edit form
    useEffect(() => {
        if (task) {
            setEditTitle(task.title);
            setEditDescription(task.description || "");
            setEditPriority(task.priority);
            const currentAssigneeIds = task.assignees?.map(a => a.uid) || [];
            setSelectedAssignees(currentAssigneeIds);
        }
    }, [task]);

    // Fetch Comments & Activity Real-time
    useEffect(() => {
        if (!task?.id || !isOpen) return;

        const commentsQuery = query(
            collection(db, "tasks", task.id, "comments"),
            orderBy("createdAt", "asc")
        );

        const unsubComments = onSnapshot(commentsQuery, (snapshot) => {
            const fetchedComments = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Comment[];
            setComments(fetchedComments);
        });

        const activityQuery = query(
            collection(db, "tasks", task.id, "activity"),
            orderBy("createdAt", "desc")
        );

        const unsubActivity = onSnapshot(activityQuery, (snapshot) => {
            const fetchedActivity = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as ActivityLog[];
            setActivities(fetchedActivity);
        });

        return () => {
            unsubComments();
            unsubActivity();
        };
    }, [task, isOpen]);

    // Fetch Members when editing starts
    useEffect(() => {
        if (isEditing && task?.companyId) {
            const fetchMembers = async () => {
                setIsMembersLoading(true);
                try {
                    const q = query(collection(db, "users"), where("currentCompanyId", "==", task.companyId));
                    const snapshot = await getDocs(q);
                    const fetchedMembers = snapshot.docs.map(d => d.data() as Member);
                    setMembers(fetchedMembers);
                } catch (error) {
                    console.error("Error fetching members", error);
                    toast.error("Failed to load team members");
                } finally {
                    setIsMembersLoading(false);
                }
            };
            fetchMembers();
        }
    }, [isEditing, task?.companyId]);

    // Fetch Creator Details
    useEffect(() => {
        if (task?.createdBy) {
            const fetchCreator = async () => {
                try {
                    const docSnap = await getDoc(doc(db, "users", task.createdBy!));
                    if (docSnap.exists()) {
                        setCreator(docSnap.data() as Creator);
                    }
                } catch (e) {
                    console.error("Failed to fetch creator", e);
                }
            };
            fetchCreator();
        }
    }, [task?.createdBy]);


    const handleSendComment = async () => {
        if (!newComment.trim() || !user || !task) return;

        setIsSending(true);
        try {
            await addDoc(collection(db, "tasks", task.id, "comments"), {
                text: newComment,
                userId: user.uid,
                userDisplayName: user.displayName || "User",
                userPhoto: user.photoURL || null,
                createdAt: serverTimestamp(),
                parentId: replyTo
            });

            await logActivity(task.id, 'comment', `commented on this task`, { uid: user.uid, displayName: user.displayName, photoURL: user.photoURL });

            if (task.assignees && task.assignees.length > 0) {
                task.assignees.forEach(async (assignee) => {
                    if (assignee.uid !== user.uid) {
                        await addDoc(collection(db, "notifications"), {
                            recipientId: assignee.uid,
                            senderId: user.uid,
                            senderName: user.displayName,
                            senderPhoto: user.photoURL,
                            type: "comment",
                            taskId: task.id,
                            taskTitle: task.title,
                            commentPreview: newComment.substring(0, 50),
                            isRead: false,
                            createdAt: serverTimestamp(),
                            companyId: task.companyId
                        });
                    }
                });
            }

            if (replyTo) {
                const parentComment = comments.find(c => c.id === replyTo);
                if (parentComment && parentComment.userId !== user.uid) {
                    const isAssignee = task.assignees?.some(a => a.uid === parentComment.userId);
                    if (!isAssignee) {
                        await addDoc(collection(db, "notifications"), {
                            recipientId: parentComment.userId,
                            senderId: user.uid,
                            senderName: user.displayName,
                            senderPhoto: user.photoURL,
                            type: "reply",
                            taskId: task.id,
                            taskTitle: task.title,
                            commentPreview: newComment.substring(0, 50),
                            isRead: false,
                            createdAt: serverTimestamp(),
                            companyId: task.companyId
                        });
                    }
                }
            }

            setNewComment("");
            setReplyTo(null);
        } catch (error) {
            console.error("Failed to send comment", error);
            toast.error("Failed to post comment");
        } finally {
            setIsSending(false);
        }
    };

    const handleAssigneeSelect = (uid: string) => {
        if (!selectedAssignees.includes(uid)) {
            setSelectedAssignees([...selectedAssignees, uid]);
        }
    };

    const removeAssignee = (uid: string) => {
        setSelectedAssignees(selectedAssignees.filter(id => id !== uid));
    };

    const handleSaveEdit = async () => {
        if (!task || !task.id) return;
        setIsSaving(true);
        try {
            const taskRef = doc(db, "tasks", task.id);

            const updatedAssignees = selectedAssignees.map(uid => {
                const existing = task.assignees?.find(a => a.uid === uid);
                if (existing) return existing;
                const member = members.find(m => m.uid === uid);
                return member ? {
                    uid: member.uid,
                    displayName: member.displayName,
                    photoURL: member.photoURL || null
                } : null;
            }).filter(Boolean);

            await updateDoc(taskRef, {
                title: editTitle,
                description: editDescription,
                priority: editPriority,
                assignees: updatedAssignees
            });

            if (task.title !== editTitle) {
                await logActivity(task.id, 'update', `changed title to "${editTitle}"`, { uid: user!.uid, displayName: user!.displayName, photoURL: user!.photoURL });
            }
            if (task.priority !== editPriority) {
                await logActivity(task.id, 'update', `changed priority from ${task.priority} to ${editPriority}`, { uid: user!.uid, displayName: user!.displayName, photoURL: user!.photoURL });
            }
            if ((task.description || "") !== editDescription) {
                await logActivity(task.id, 'update', `updated the description`, { uid: user!.uid, displayName: user!.displayName, photoURL: user!.photoURL });
            }

            toast.success("Task updated");
            setIsEditing(false);
        } catch (error) {
            console.error("Edit failed", error);
            toast.error("Failed to update task");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteTask = async () => {
        if (!task || !task.id) return;
        setIsDeleting(true);
        try {
            await deleteDoc(doc(db, "tasks", task.id));
            toast.success("Task deleted successfully");
            setIsDeleteDialogOpen(false);
            onClose();
        } catch (error) {
            console.error("Delete failed", error);
            toast.error("Failed to delete task");
        } finally {
            setIsDeleting(false);
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case "high": return "destructive";
            case "medium": return "default";
            case "low": return "secondary";
            default: return "outline";
        }
    };

    const formatDate = (date: any) => {
        if (!date) return "No deadline set";
        if (date.toDate) return format(date.toDate(), "MMM d, yyyy");
        try {
            return format(new Date(date), "MMM d, yyyy");
        } catch (e) {
            return "Invalid Date";
        }
    };

    if (!task) return null;

    return (
        <Sheet open={isOpen} onOpenChange={(open) => { if (!open) setIsEditing(false); if (!open) onClose(); }}>
            <SheetContent className="w-full sm:w-[540px] flex flex-col h-full sm:max-w-[540px] p-0 gap-0 border-l shadow-2xl bg-white dark:bg-slate-950 transition-all duration-300">

                {/* --- HEADER (Fixed) --- */}
                <div className="flex-none p-6 pb-4 border-b bg-white dark:bg-slate-950 z-20">
                    <div className="flex items-center justify-between mb-4">
                        {isEditing ? (
                            <Select value={editPriority} onValueChange={setEditPriority}>
                                <SelectTrigger className="w-[120px] h-7 text-xs font-medium">
                                    <SelectValue placeholder="Priority" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="low">Low Priority</SelectItem>
                                    <SelectItem value="medium">Medium Priority</SelectItem>
                                    <SelectItem value="high">High Priority</SelectItem>
                                </SelectContent>
                            </Select>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Badge variant={getPriorityColor(task.priority) as any} className="uppercase text-[10px] tracking-wider font-bold px-2 py-0.5 rounded-sm">
                                    {task.priority} Priority
                                </Badge>
                                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide border px-1.5 py-0.5 rounded-sm">
                                    {task.status.replace("-", " ")}
                                </span>
                            </div>
                        )}

                        <div className="flex gap-1">
                            {isEditing ? (
                                <>
                                    <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)} disabled={isSaving}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                    <Button size="sm" onClick={handleSaveEdit} disabled={isSaving} className="h-7 text-xs">
                                        <Check className="h-3.5 w-3.5 mr-1" /> Save
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                                        <DialogTrigger asChild>
                                            <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-red-500">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Delete Task?</DialogTitle>
                                                <DialogDescription>
                                                    Cannot be undone. "{task.title}" will be permanently deleted.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <DialogFooter>
                                                <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
                                                <Button variant="destructive" onClick={handleDeleteTask} disabled={isDeleting}>Delete</Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-slate-900 dark:hover:text-slate-100" onClick={() => setIsEditing(true)}>
                                        <Edit2 className="h-4 w-4" />
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>

                    {isEditing ? (
                        <Input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="text-lg font-bold h-auto py-2 px-2 -ml-2"
                        />
                    ) : (
                        <SheetTitle className="text-xl font-bold leading-tight text-slate-900 dark:text-slate-100 break-words">
                            {task.title}
                        </SheetTitle>
                    )}

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            <span>Created {task.createdAt ? formatDate(task.createdAt) : "Unknown"}</span>
                        </div>
                        {task.deadline && (
                            <div className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400 font-medium">
                                <Flag className="h-3.5 w-3.5" />
                                <span>Due {formatDate(task.deadline)}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* --- MAIN SCROLLABLE BODY --- */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="p-6 space-y-8 min-h-full">

                        {/* 1. Compact Metadata Section (Assigned Info) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                            {/* Assigned By */}
                            <div className="space-y-2">
                                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Assigned By</h4>
                                {creator ? (
                                    <div className="flex items-center gap-2.5 group">
                                        <Avatar className="h-6 w-6 border border-slate-100 dark:border-slate-800 shadow-sm">
                                            <AvatarImage src={creator.photoURL} />
                                            <AvatarFallback className="text-[9px] bg-indigo-50 text-indigo-600 font-bold">
                                                {creator.displayName?.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">
                                            {creator.displayName}
                                        </span>
                                    </div>
                                ) : (
                                    <span className="text-sm text-muted-foreground italic pl-1">Unknown</span>
                                )}
                            </div>

                            {/* Assigned People */}
                            <div className="space-y-2">
                                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                    Assigned To
                                    {isEditing && isMembersLoading && <span className="text-[8px] font-normal animate-pulse text-blue-500">Loading...</span>}
                                </h4>
                                {isEditing ? (
                                    <div className="space-y-2">
                                        <Select onValueChange={handleAssigneeSelect} disabled={isMembersLoading}>
                                            <SelectTrigger className="h-7 text-xs w-full bg-slate-50 dark:bg-slate-900">
                                                <SelectValue placeholder="Add person..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {members.map((m) => (
                                                    <SelectItem key={m.uid} value={m.uid} disabled={selectedAssignees.includes(m.uid)}>
                                                        <div className="flex items-center gap-2">
                                                            <Avatar className="h-4 w-4"><AvatarImage src={m.photoURL} /><AvatarFallback>{m.displayName[0]}</AvatarFallback></Avatar>
                                                            {m.displayName}
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <div className="flex flex-wrap gap-1.5">
                                            {selectedAssignees.map(uid => {
                                                const memberInfo = members.find(m => m.uid === uid) || task.assignees?.find(a => a.uid === uid);
                                                if (!memberInfo) return null;
                                                return (
                                                    <Badge key={uid} variant="secondary" className="pl-1 pr-1.5 py-0.5 flex items-center gap-1 bg-white dark:bg-slate-800 border shadow-sm font-normal">
                                                        <Avatar className="h-3.5 w-3.5"><AvatarImage src={memberInfo.photoURL} /><AvatarFallback className="text-[6px]">{memberInfo.displayName?.[0]}</AvatarFallback></Avatar>
                                                        <span className="text-[10px] truncate max-w-[80px]">{memberInfo.displayName}</span>
                                                        <button type="button" onClick={() => removeAssignee(uid)} className="hover:text-red-500"><X className="h-2.5 w-2.5" /></button>
                                                    </Badge>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {task.assignees && task.assignees.length > 0 ? (
                                            task.assignees.map((assignee) => (
                                                <div key={assignee.uid} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 px-2 py-1 rounded-md border border-slate-100 dark:border-slate-800">
                                                    <Avatar className="h-5 w-5">
                                                        <AvatarImage src={assignee.photoURL} />
                                                        <AvatarFallback className="text-[8px] bg-blue-50 text-blue-600 font-bold">
                                                            {assignee.displayName?.charAt(0)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{assignee.displayName}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <span className="text-sm italic text-muted-foreground pl-1">Unassigned</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 2. Description Section */}
                        <div className="space-y-2.5">
                            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Description</h4>
                            {isEditing ? (
                                <Textarea
                                    value={editDescription}
                                    onChange={(e) => setEditDescription(e.target.value)}
                                    className="min-h-[120px] text-sm leading-relaxed p-3 bg-slate-50 dark:bg-slate-900"
                                    placeholder="Add a more detailed description..."
                                />
                            ) : (
                                <div
                                    className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap"
                                    dangerouslySetInnerHTML={{ __html: task.description || '<span class="italic text-muted-foreground opacity-70">No description provided.</span>' }}
                                />
                            )}
                        </div>

                        {/* 3. Attachments Section */}
                        {task.attachments && task.attachments.length > 0 && (
                            <div className="space-y-2.5">
                                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Attachments ({task.attachments.length})</h4>
                                <div className="grid grid-cols-1 gap-2">
                                    {task.attachments.map((att) => (
                                        <a
                                            key={att.id}
                                            href={att.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center p-2.5 rounded-lg border bg-white dark:bg-slate-900 shadow-sm hover:shadow-md hover:border-blue-200 dark:hover:border-blue-900 transition-all group"
                                        >
                                            <div className="h-8 w-8 rounded bg-slate-50 dark:bg-slate-800 flex items-center justify-center border mr-3">
                                                {att.type === 'file' ? <Paperclip className="h-4 w-4 text-blue-500" /> : <LinkIcon className="h-4 w-4 text-green-500" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate text-slate-700 dark:text-slate-200 group-hover:text-blue-600 transition-colors">{att.name}</p>
                                                <p className="text-[10px] text-muted-foreground">{att.type === 'file' ? "Uploaded File" : "External Link"}</p>
                                            </div>
                                            <ExternalLink className="h-3 w-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 4. Tabs Section (Comments / History) */}
                        <div className="pt-2">
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                <TabsList className="grid w-full grid-cols-2 h-9 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                                    <TabsTrigger value="comments" className="text-xs font-medium">Comments ({comments.length})</TabsTrigger>
                                    <TabsTrigger value="activity" className="text-xs font-medium">History ({activities.length})</TabsTrigger>
                                </TabsList>

                                {/* Comments Tab Content */}
                                <TabsContent value="comments" className="mt-4 space-y-4 data-[state=inactive]:hidden focus:outline-none">
                                    {comments.length === 0 ? (
                                        <div className="text-center py-10 opacity-50">
                                            <MessageSquare className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                                            <p className="text-sm text-slate-500">No comments yet</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            {comments.filter(c => !c.parentId).map((comment) => (
                                                <div key={comment.id} className="space-y-3">
                                                    {/* Parent Comment */}
                                                    <div className="flex gap-3 relative group">
                                                        <Avatar className="h-7 w-7 mt-0.5 border border-slate-100 dark:border-slate-800">
                                                            <AvatarImage src={comment.userPhoto} />
                                                            <AvatarFallback className="text-[10px]">{comment.userDisplayName[0]}</AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex-1 space-y-1">
                                                            <div className="flex items-baseline justify-between">
                                                                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{comment.userDisplayName}</span>
                                                                <span className="text-[10px] text-muted-foreground">{comment.createdAt?.toDate ? format(comment.createdAt.toDate(), "MMM d, h:mm a") : "Just now"}</span>
                                                            </div>
                                                            <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                                                {comment.text}
                                                            </div>
                                                            <button onClick={() => setReplyTo(comment.id)} className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors mt-1">
                                                                <Reply className="h-3 w-3" /> Reply
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Replies */}
                                                    {comments.filter(r => r.parentId === comment.id).map(reply => (
                                                        <div key={reply.id} className="flex gap-3 ml-8 relative pl-3 border-l-2 border-slate-100 dark:border-slate-800">
                                                            <Avatar className="h-6 w-6 mt-0.5">
                                                                <AvatarImage src={reply.userPhoto} />
                                                                <AvatarFallback className="text-[9px]">{reply.userDisplayName[0]}</AvatarFallback>
                                                            </Avatar>
                                                            <div className="flex-1 space-y-1">
                                                                <div className="flex items-baseline justify-between">
                                                                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">{reply.userDisplayName}</span>
                                                                    <span className="text-[10px] text-muted-foreground">{reply.createdAt?.toDate ? format(reply.createdAt.toDate(), "MMM d, h:mm a") : "Just now"}</span>
                                                                </div>
                                                                <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                                                    {reply.text}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </TabsContent>

                                {/* Activity Tab Content */}
                                <TabsContent value="activity" className="mt-4 space-y-0 relative pl-4 border-l border-slate-200 dark:border-slate-800 ml-2 data-[state=inactive]:hidden focus:outline-none">
                                    {activities.map((log, idx) => (
                                        <div key={log.id} className="relative pb-6 last:pb-0">
                                            <div className={`absolute -left-[21px] top-1 h-3 w-3 rounded-full border-2 border-white dark:border-slate-950 flex items-center justify-center ${log.action === 'create' ? 'bg-green-100 text-green-600' :
                                                log.action === 'status_change' ? 'bg-orange-100 text-orange-600' :
                                                    log.action === 'comment' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'
                                                }`}>
                                            </div>
                                            <div className="flex flex-col gap-0.5">
                                                <p className="text-xs text-slate-700 dark:text-slate-300">
                                                    <span className="font-semibold text-slate-900 dark:text-slate-100">{log.userDisplayName}</span> {log.details}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground">{log.createdAt?.toDate ? format(log.createdAt.toDate(), "MMM d, yyyy • h:mm a") : "Unknown date"}</p>
                                            </div>
                                        </div>
                                    ))}
                                </TabsContent>
                            </Tabs>
                        </div>
                    </div>
                </div>

                {/* --- FOOTER (Comment Input) --- */}
                {activeTab === 'comments' && (
                    <div className="flex-none p-4 bg-white dark:bg-slate-950 border-t z-20">
                        {replyTo && (
                            <div className="flex justify-between items-center mb-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 rounded-md border border-slate-100 dark:border-slate-800 text-xs shadow-sm animated-in slide-in-from-bottom-1">
                                <span className="text-blue-600 font-medium flex items-center gap-1"><Reply className="h-3 w-3" /> Replying to comment...</span>
                                <button onClick={() => setReplyTo(null)} className="text-slate-400 hover:text-slate-700"><X className="h-3 w-3" /></button>
                            </div>
                        )}
                        <div className="flex gap-2 items-end">
                            <Textarea
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        if (!isSending && newComment.trim()) handleSendComment();
                                    }
                                }}
                                placeholder="Write a comment..."
                                className="min-h-[44px] max-h-[120px] py-3 text-sm resize-none bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus-visible:ring-1 focus-visible:ring-offset-0"
                            />
                            <Button
                                onClick={handleSendComment}
                                disabled={isSending || !newComment.trim()}
                                size="icon"
                                className="h-[44px] w-[44px] flex-shrink-0"
                            >
                                {isSending ? <span className="animate-spin">↻</span> : <Send className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}
