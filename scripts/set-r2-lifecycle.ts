/**
 * One-time setup script: applies a 7-day object expiration lifecycle rule
 * to the raw/ prefix in the R2 bucket, so uploaded source videos are
 * automatically deleted after transcoding is no longer needed.
 *
 * Run once (after setting env vars):
 *   npx tsx --env-file=.env.local scripts/set-r2-lifecycle.ts
 */

import { S3Client, PutBucketLifecycleConfigurationCommand, GetBucketLifecycleConfigurationCommand } from '@aws-sdk/client-s3'

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

const bucket = process.env.R2_BUCKET_NAME!

if (!process.env.CF_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !bucket) {
  console.error('Missing required env vars: CF_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME')
  process.exit(1)
}

async function main() {
  // Apply the lifecycle rule
  await r2.send(new PutBucketLifecycleConfigurationCommand({
    Bucket: bucket,
    LifecycleConfiguration: {
      Rules: [
        {
          ID: 'expire-raw-videos-7d',
          Status: 'Enabled',
          Filter: { Prefix: 'raw/' },
          Expiration: { Days: 7 },
        },
      ],
    },
  }))

  console.log(`✓ Lifecycle rule set on bucket "${bucket}": raw/ objects expire after 7 days`)

  // Verify by reading back
  const { Rules } = await r2.send(new GetBucketLifecycleConfigurationCommand({ Bucket: bucket }))
  console.log('Active rules:', JSON.stringify(Rules, null, 2))
}

main().catch((err) => {
  console.error('Failed to set lifecycle policy:', err)
  process.exit(1)
})
