import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "@/lib/firebase/client";
import { resizeImageFile } from "@/lib/utils/resizeImage";

export async function uploadAnnouncementImage(file: File): Promise<string> {
  const { blob, ext } = await resizeImageFile(file);
  const storageRef = ref(storage, `announcements/${Date.now()}.${ext}`);
  await uploadBytes(storageRef, blob, { contentType: blob.type });
  return getDownloadURL(storageRef);
}
