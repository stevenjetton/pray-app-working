import {
	deleteObject,
	getDownloadURL,
	getStorage,
	ref,
	uploadBytes,
	uploadBytesResumable
} from "firebase/storage";

// Initialize Storage only once
export const storage = getStorage();

/**
 * Upload a file to Firebase Storage.
 * @param storagePath The path in storage (e.g. 'users/uid/filename.png')
 * @param file The file Blob or Uint8Array to upload
 * @returns The download URL of the uploaded file
 */
export async function uploadFile(storagePath: string, file: Blob | Uint8Array) {
  const fileRef = ref(storage, storagePath);
  await uploadBytes(fileRef, file);
  return getDownloadURL(fileRef);
}

/**
 * Upload a file to Firebase Storage with progress tracking.
 * @param storagePath The path in storage (e.g. 'users/uid/filename.png')
 * @param file The file Blob or Uint8Array to upload
 * @param onProgress Callback for progress updates (0-100)
 * @returns Promise<string> Resolves to the download URL
 */
export function uploadFileWithProgress(
  storagePath: string,
  file: Blob | Uint8Array,
  onProgress: (progress: number) => void
): Promise<string> {
  const fileRef = ref(storage, storagePath);
  const uploadTask = uploadBytesResumable(fileRef, file);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        // Calculate progress percentage
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress(progress);
      },
      (error) => {
        reject(error);
      },
      async () => {
        // Upload complete, get the download URL
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        resolve(url);
      }
    );
  });
}

/**
 * Get the download URL for a file in Firebase Storage.
 * @param storagePath The path in storage
 * @returns The download URL
 */
export async function getFileUrl(storagePath: string) {
  const fileRef = ref(storage, storagePath);
  return getDownloadURL(fileRef);
}

/**
 * Delete a file from Firebase Storage.
 * @param storagePath The path in storage
 */
export async function deleteFile(storagePath: string) {
  const fileRef = ref(storage, storagePath);
  await deleteObject(fileRef);
}
