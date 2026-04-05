import { z } from 'zod/v4';

export const smsWebhookSchema = z.object({
  message: z.string().min(1, 'SMS message is required').max(500),
  sender: z.string().max(50).optional(),
});

export type SmsWebhookInput = z.infer<typeof smsWebhookSchema>;
