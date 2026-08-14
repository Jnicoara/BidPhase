/**
 * Where bytes get written — the one piece that knows about Cloudflare.
 *
 * ── Kept behind an interface on purpose ─────────────────────────────────────
 * R2 is the confirmed choice and this is not built to be provider-agnostic for
 * its own sake. But everything else in this folder — enumerating tables,
 * dumping rows, copying files, reporting — is about HelixBid's data and has no
 * opinion about the destination. Putting the destination behind three methods
 * means swapping it later is one new file rather than a rewrite, and it is what
 * lets the tests prove the whole pipeline works without a network or a
 * credential.
 *
 * R2 speaks the S3 API, so this is the AWS SDK the repo already depends on for
 * the Manus storage proxy — no new dependency for a tool whose whole purpose is
 * to work when things are going wrong.
 */
import {
  PutObjectCommand,
  S3Client,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";
import type { R2Config } from "./config";

export type BackupTarget = {
  /** Shown in the report, so a manifest says where it actually went. */
  readonly name: string;
  /** Fails loudly. Every caller treats a rejection as a failed backup. */
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  /**
   * Cheap reachability check, run BEFORE the database is read.
   *
   * The alternative is discovering a bad credential after dumping every table
   * and downloading every PDF, which on a slow connection is the difference
   * between a typo and a wasted hour.
   */
  check(): Promise<void>;
};

export function createR2Target(config: R2Config): BackupTarget {
  const client = new S3Client({
    region: "auto", // R2 ignores region but the SDK requires one.
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return {
    name: `r2://${config.bucket}/${config.prefix}`,

    async check() {
      await client.send(new HeadBucketCommand({ Bucket: config.bucket }));
    },

    async put(key, body, contentType) {
      await client.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: `${config.prefix}/${key}`.replace(/\/+/g, "/"),
          Body: body,
          ContentType: contentType,
        })
      );
    },
  };
}
