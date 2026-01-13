// API functions pour interagir avec S3 et DynamoDB via votre backend

import { fetchAuthSession } from 'aws-amplify/auth';

const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT || 'http://localhost:3000/api';

async function getAuthToken(): Promise<string | undefined> {
  try {
    const session = await fetchAuthSession();
    return session.tokens?.accessToken?.toString();
  } catch (error) {
    console.error('Error getting auth token:', error);
    return undefined;
  }
}

export interface S3Image {
  key: string;
  size: number;
  lastModified: string;
  url: string;
}

export interface UploadedRecord {
  image_id: string;
  image_key: string;
  instagram_post_id: string;
  uploaded_at: string;
  trigger_time: string;
  status: string;
}

/**
 * Récupérer la liste des images dans le S3 bucket
 */
export async function getS3Images(): Promise<S3Image[]> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_ENDPOINT}/s3/images`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    throw new Error('Failed to fetch S3 images');
  }
  const data = await response.json();
  return data.images || [];
}

/**
 * Uploader des images vers S3
 */
export async function uploadToS3(files: File[]): Promise<{ uploaded: number }> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const formData = new FormData();
  files.forEach((file) => {
    formData.append('images', file);
  });

  const response = await fetch(`${API_ENDPOINT}/s3/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData
  });

  if (!response.ok) {
    throw new Error('Failed to upload images');
  }

  return response.json();
}

/**
 * Supprimer une image du S3 bucket
 */
export async function deleteFromS3(key: string): Promise<void> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_ENDPOINT}/s3/delete`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ key })
  });

  if (!response.ok) {
    throw new Error('Failed to delete image');
  }
}

/**
 * Récupérer l'historique des uploads depuis DynamoDB
 */
export async function getUploadedRecords(): Promise<UploadedRecord[]> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_ENDPOINT}/dynamodb/records`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    throw new Error('Failed to fetch uploaded records');
  }
  const data = await response.json();
  return data.records || [];
}

/**
 * Télécharger une image depuis S3
 */
export async function downloadFromS3(url: string, filename: string): Promise<void> {
  const response = await fetch(url);
  const blob = await response.blob();
  const objectUrl = window.URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  
  window.URL.revokeObjectURL(objectUrl);
  document.body.removeChild(a);
}
