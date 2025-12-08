import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const logActivity = async (
    taskId: string,
    action: 'create' | 'update' | 'status_change' | 'comment' | 'assign' | 'upload',
    details: string,
    user: { uid: string; displayName: string | null; photoURL: string | null }
) => {
    if (!taskId || !user) return;

    try {
        await addDoc(collection(db, "tasks", taskId, "activity"), {
            action,
            details,
            userId: user.uid,
            userDisplayName: user.displayName || "Unknown",
            userPhoto: user.photoURL,
            createdAt: serverTimestamp()
        });
    } catch (error) {
        console.error("Failed to log activity:", error);
    }
};
