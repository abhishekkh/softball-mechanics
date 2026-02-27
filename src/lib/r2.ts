import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

export async function getPresignedPutUrl(key: string, contentType: string): Promise<string> {
  // ContentType MUST match exactly what browser sends — R2 validates signature
  return getSignedUrl(
    r2,
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: 3600 }
  )
}

export async function getPresignedGetUrl(key: string): Promise<string> {
  return getSignedUrl(
    r2,
    new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
    }),
    { expiresIn: 3600 }
  )
}

export function getPublicUrl(key: string): string {
  return `${process.env.R2_PUBLIC_URL}/${key}`
}
