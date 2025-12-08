"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { addDoc, collection, serverTimestamp, getDoc, doc, query, where, getDocs, Timestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { logActivity } from "@/lib/logger";
import { useAuth } from "@/components/providers/AuthProvider";
import { toast } from "sonner";
import { Loader2, Calendar as CalendarIcon, X, Paperclip, Link as LinkIcon, UploadCloud, Lock, Globe } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Attachment } from "@/types";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { Switch } from "@/components/ui/switch";

interface Member {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
}

interface NewTaskDialogProps {
  children: React.ReactNode;
  defaultAssignee?: string;
}

export function NewTaskDialog({ children, defaultAssignee }: NewTaskDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [isMembersLoading, setIsMembersLoading] = useState(false);

  // Form States
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');

  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]); // Array of UIDs
  const [deadline, setDeadline] = useState("");

  // Attachment States
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [linkInput, setLinkInput] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);

  // Fetch Members
  useEffect(() => {
    if (open && user) {
      const fetchData = async () => {
        setIsMembersLoading(true);
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          const companyId = userDoc.data()?.currentCompanyId;

          if (companyId) {
            const q = query(collection(db, "users"), where("currentCompanyId", "==", companyId));
            const snapshot = await getDocs(q);
            const fetchedMembers = snapshot.docs.map(d => d.data() as Member);
            setMembers(fetchedMembers);

            if (defaultAssignee) {
              setSelectedAssignees([defaultAssignee]);
            }
          }
        } catch (error) {
          console.error("Failed to load members", error);
        } finally {
          setIsMembersLoading(false);
        }
      };
      fetchData();
    }
  }, [open, user, defaultAssignee]);

  const handleAssigneeSelect = (uid: string) => {
    if (uid === "unassigned") return; // Do nothing
    if (!selectedAssignees.includes(uid)) {
      setSelectedAssignees([...selectedAssignees, uid]);
    }
  };

  const removeAssignee = (uid: string) => {
    setSelectedAssignees(selectedAssignees.filter(id => id !== uid));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 100KB Limit Check (100 * 1024 bytes)
    if (file.size > 100 * 1024) {
      toast.error("File exceeds 100KB limit.", {
        description: "Please upload your file to Google Drive and attach the link instead.",
        action: {
          label: "Use Link",
          onClick: () => setShowLinkInput(true)
        },
        duration: 5000
      });
      e.target.value = ""; // Reset input
      return;
    }

    setIsUploading(true);
    try {
      const fileRef = ref(storage, `attachments/temp_${Date.now()}_${file.name}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);

      const newAttachment: Attachment = {
        id: Math.random().toString(36).substring(7),
        name: file.name,
        url: url,
        type: 'file',
        uploadedAt: Timestamp.now()
      };

      setAttachments([...attachments, newAttachment]);
      toast.success("File attached");
    } catch (error) {
      console.error("Upload failed", error);
      toast.error("Upload failed");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const addLinkAttachment = () => {
    if (!linkInput.trim()) return;

    const newAttachment: Attachment = {
      id: Math.random().toString(36).substring(7),
      name: linkInput,
      url: linkInput,
      type: 'link',
      uploadedAt: Timestamp.now()
    };

    setAttachments([...attachments, newAttachment]);
    setLinkInput("");
    setShowLinkInput(false);
  };

  const removeAttachment = (id: string) => {
    setAttachments(attachments.filter(a => a.id !== id));
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !user) return;

    setLoading(true);
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) {
        toast.error("User profile not found");
        return;
      }
      const companyId = userDoc.data().currentCompanyId;

      // Prepare Assignee Data array
      const assigneesList = selectedAssignees.map(uid => {
        const member = members.find(m => m.uid === uid);
        return member ? {
          uid: member.uid,
          displayName: member.displayName,
          photoURL: member.photoURL || null
        } : null;
      }).filter(Boolean); // Remove nulls

      const taskRef = await addDoc(collection(db, "tasks"), {
        title,
        description,
        priority,
        status: "todo",
        visibility,
        companyId,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        deadline: deadline ? Timestamp.fromDate(new Date(deadline)) : null,
        assignees: assigneesList,
        attachments: attachments
      });

      // Notifications for all assignees
      const notificationPromises = assigneesList
        .filter(a => a!.uid !== user.uid)
        .map(a =>
          addDoc(collection(db, "notifications"), {
            recipientId: a!.uid,
            senderId: user.uid,
            senderName: user.displayName,
            senderPhoto: user.photoURL,
            type: "task_assigned",
            taskId: taskRef.id,
            taskTitle: title,
            isRead: false,
            createdAt: serverTimestamp(),
            companyId
          })
        );


      await Promise.all(notificationPromises);

      // Log Activity
      await logActivity(
        taskRef.id,
        'create',
        `created this ${visibility} task`,
        { uid: user.uid, displayName: user.displayName, photoURL: user.photoURL }
      );

      toast.success("Task created successfully!");
      setOpen(false);

      // Reset
      setTitle("");
      setDescription("");
      setPriority("medium");
      setVisibility("public");
      setSelectedAssignees([]);
      setDeadline("");
      setAttachments([]);
      setLinkInput("");
    } catch (error) {
      console.error(error);
      toast.error("Failed to create task");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>
            Assign work to your team members.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">

          <div className="grid gap-2">
            <Label htmlFor="title">Task Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Redesign Homepage"
              required
            />
          </div>

          <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-900 px-3 py-2 rounded-md border">
            <Switch
              id="visibility"
              checked={visibility === 'private'}
              onCheckedChange={(c) => setVisibility(c ? 'private' : 'public')}
            />
            <Label htmlFor="visibility" className="flex items-center gap-2 cursor-pointer flex-1">
              {visibility === 'private' ? <Lock className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
              <span>{visibility === 'private' ? 'Private Task (Only Me)' : 'Public Task (Visible to Team)'}</span>
            </Label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="deadline">Deadline</Label>
              <div className="relative">
                <Input
                  id="deadline"
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="pl-10"
                />
                <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </div>

          {/* Multi-select Assignee */}
          <div className="grid gap-2">
            <Label>Assign To {isMembersLoading && <span className="text-xs text-muted-foreground">(Loading...)</span>}</Label>

            <Select onValueChange={handleAssigneeSelect} disabled={isMembersLoading}>
              <SelectTrigger>
                <SelectValue placeholder="Select members..." />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.uid} value={m.uid} disabled={selectedAssignees.includes(m.uid)}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={m.photoURL} />
                        <AvatarFallback className="text-[8px]">{m.displayName[0]}</AvatarFallback>
                      </Avatar>
                      {m.displayName}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Selected Tags */}
            <div className="flex flex-wrap gap-2 mt-1">
              {selectedAssignees.map(uid => {
                const m = members.find(mem => mem.uid === uid);
                if (!m) return null;
                return (
                  <Badge key={uid} variant="secondary" className="pl-1 pr-2 py-1 flex items-center gap-1">
                    <Avatar className="h-4 w-4">
                      <AvatarImage src={m.photoURL} />
                      <AvatarFallback className="text-[6px]">{m.displayName[0]}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs">{m.displayName}</span>
                    <button
                      type="button"
                      onClick={() => removeAssignee(uid)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )
              })}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <RichTextEditor
              content={description}
              onChange={setDescription}
              placeholder="Detailed instructions..."
              className="min-h-[120px]"
            />
          </div>

          {/* Attachments Section */}
          <div className="space-y-2">
            <Label className="flex justify-between items-center">
              Attachments
              <span className="text-[10px] text-muted-foreground font-normal">Max 100KB per file</span>
            </Label>

            <div className="flex gap-2">
              <div className="relative">
                <Input
                  type="file"
                  className="opacity-0 absolute inset-0 w-10 overflow-hidden z-10 cursor-pointer"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  accept="image/*,application/pdf"
                />
                <Button type="button" size="sm" variant="outline" className="gap-2" disabled={isUploading}>
                  {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                  Upload
                </Button>
              </div>

              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={() => setShowLinkInput(!showLinkInput)}
              >
                <LinkIcon className="h-4 w-4" />
                Add Link
              </Button>
            </div>

            {showLinkInput && (
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="Paste Google Drive or external link..."
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  className="h-8 text-xs"
                />
                <Button type="button" size="sm" onClick={addLinkAttachment} className="h-8">Add</Button>
              </div>
            )}

            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {attachments.map((att) => (
                  <div key={att.id} className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded text-xs border group">
                    {att.type === 'file' ? <Paperclip className="h-3 w-3 text-blue-500" /> : <LinkIcon className="h-3 w-3 text-green-500" />}
                    <span className="max-w-[150px] truncate">{att.name}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(att.id)}
                      className="text-muted-foreground hover:text-red-500 ml-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}