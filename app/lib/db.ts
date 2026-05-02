import { Redis } from '@upstash/redis';

export const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export type ProductionStatus =
  | 'pending'
  | 'vector_ready'
  | 'vector_approved'
  | 'sent_to_manufacturer'
  | 'in_production'
  | 'shipped'
  | 'delivered';

export interface ProductionEvent {
  status: ProductionStatus;
  at: string;
  note?: string;
}

export interface ShippingAddress {
  recipientName: string;
  country: string;
  street: string;
  streetNumber: string;
  apartment?: string;
  postalCode: string;
  phone?: string;
  invoiceName?: string;
}

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
  productionSvg?: string;
  sealIndex: number;
  notes: string;
  shipping?: ShippingAddress;
  status: ProductionStatus;
  productionNotes?: string;
  manufacturerRef?: string;
  trackingNumber?: string;
  history?: ProductionEvent[];
}
