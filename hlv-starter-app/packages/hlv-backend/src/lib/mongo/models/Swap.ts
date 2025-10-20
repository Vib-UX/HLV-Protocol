import mongoose, { Document, Schema } from 'mongoose';

export enum SwapDirection {
  HEDERA_TO_LIGHTNING = 'hedera_to_lightning',
  LIGHTNING_TO_HEDERA = 'lightning_to_hedera',
}

export enum SwapStatus {
  PENDING = 'pending',
  HTLC_LOCKED = 'htlc_locked',
  LIGHTNING_PAID = 'lightning_paid',
  PREIMAGE_SUBMITTED = 'preimage_submitted',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
}

export interface ISwap extends Document {
  // Core swap data
  swapId: string;
  direction: SwapDirection;
  status: SwapStatus;
  
  // HTLC data
  paymentHash: string;
  preimage?: string;
  htlcAmount: string; // wBTC amount in wei
  htlcAddress: string; // HTLC contract address
  htlcTxHash?: string;
  timelock: Date;
  
  // Lightning data
  lightningInvoice: string;
  lightningAmount: number; // in satoshis
  lightningPaymentHash?: string;
  lightningPaymentTxId?: string;
  
  // Parties
  userAddress: string; // Hedera address
  agentAddress: string; // Agent's Hedera address
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  error?: string;
}

const swapSchema = new Schema<ISwap>(
  {
    swapId: { type: String, required: true, unique: true, index: true },
    direction: { type: String, enum: Object.values(SwapDirection), required: true },
    status: { type: String, enum: Object.values(SwapStatus), required: true, default: SwapStatus.PENDING },
    
    paymentHash: { type: String, required: true, index: true },
    preimage: { type: String },
    htlcAmount: { type: String, required: true },
    htlcAddress: { type: String, required: true },
    htlcTxHash: { type: String },
    timelock: { type: Date, required: true },
    
    lightningInvoice: { type: String, required: true },
    lightningAmount: { type: Number, required: true },
    lightningPaymentHash: { type: String },
    lightningPaymentTxId: { type: String },
    
    userAddress: { type: String, required: true, index: true },
    agentAddress: { type: String, required: true },
    
    completedAt: { type: Date },
    error: { type: String },
  },
  {
    timestamps: true,
  },
);

// Indexes for efficient queries
swapSchema.index({ status: 1, createdAt: -1 });
swapSchema.index({ userAddress: 1, createdAt: -1 });
swapSchema.index({ paymentHash: 1 });

export const Swap = mongoose.model<ISwap>('Swap', swapSchema);

