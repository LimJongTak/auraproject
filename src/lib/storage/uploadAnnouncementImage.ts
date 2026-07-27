import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "@/lib/firebase/client";

export async function uploadAnnouncementImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const storageRef = ref(storage, `announcements/${Date.now()}.${ext}`);
  await uploadBytes(storageRef, file, { contentType: file.type });
  return getDownloadURL(storageRef);
}
