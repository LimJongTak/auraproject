import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "@/lib/firebase/client";

export async function uploadThemeImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const storageRef = ref(storage, `config/theme/${Date.now()}.${ext}`);
  await uploadBytes(storageRef, file, { contentType: file.type });
  return getDownloadURL(storageRef);
}
