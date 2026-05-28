import { z } from "zod";

const DisputeReasonSchema = z.object({
    reason: z.string().min(1, "Dispute reason is required").max(500, "Reason must be 500 characters or less"),
    evidence: z.string().optional(),
});

const ResolveDisputeSchema = z.object({
    resolution: z.enum(["resolved_in_favor_of_owner", "resolved_in_favor_of_counterparty", "dismissed"]),
    notes: z.string().max(1000, "Notes must be 1000 characters or less").optional(),
});

export { DisputeReasonSchema, ResolveDisputeSchema };
export type DisputeReasonInput = z.infer<typeof DisputeReasonSchema>;
export type ResolveDisputeInput = z.infer<typeof ResolveDisputeSchema>;
