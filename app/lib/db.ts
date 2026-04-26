import { Redis } from '@upstash/redis';

export const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export interface SealSelection {
  id: string;
  createdAt: string;
  profile: {
    origin: string;
    occupation: string;
    values: string[];
    shape: string;
    style: string;
    inkColor: string;
  };
  sealSvg: string;
  sealIndex: number;
  notes: string;
  status: 'pending' | 'approved' | 'rejected';
}
