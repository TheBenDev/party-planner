import { zodResolver } from "@hookform/resolvers/zod";
import { WorkerTypeEnum } from "@planner/enums/colony";
import { UserRole } from "@planner/enums/user";
import { Pencil, X } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
	WORKER_TYPE_LABEL,
	WORKER_TYPE_OPTIONS,
} from "@/features/colony/constants";
import { useColonyData } from "@/features/colony/hooks/useColonyData";
import type {
	ColonyWorkforce,
	EditWorkforceDetailsProps,
	WorkerCountsEditForm,
} from "@/features/colony/types";
import { WorkerCountsEditFormSchema } from "@/features/colony/types";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useAuth } from "@/shared/hooks/auth";

export function WorkforceCard({
	colonyId,
	workforces,
	workforceIsLoading,
}: {
	colonyId: string;
	workforces: ColonyWorkforce[];
	workforceIsLoading: boolean;
}) {
	const { role } = useAuth();
	const isDm = role === UserRole.DUNGEON_MASTER;
	const [isEditing, setIsEditing] = useState(false);
	return (
		<div className="p-4 min-h-[380px]">
			<div className="flex items-center justify-between mb-3">
				<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
					Colonist Roles
				</p>
				{isDm && (
					<button
						aria-label={
							isEditing ? "Cancel workforce editing" : "Edit workforce"
						}
						disabled={workforceIsLoading}
						onClick={() => setIsEditing((prev) => !prev)}
						type="button"
					>
						{isEditing ? (
							<X className="w-3.5 h-3.5" />
						) : (
							<Pencil className="w-3.5 h-3.5" />
						)}
					</button>
				)}
			</div>
			<div>
				{workforceIsLoading && (
					<div className="space-y-4">
						{Array.from({ length: 3 }).map((_, index) => (
							<Skeleton className="h-4 w-full" key={index} />
						))}
					</div>
				)}
				{isEditing ? (
					<EditWorkforceDetails
						colonyId={colonyId}
						{...(Object.fromEntries(
							WORKER_TYPE_OPTIONS.map((option) => [
								option.key,
								workforces.find((w) => w.workerType === option.key)?.count ?? 0,
							]),
						) as WorkerCountsEditForm)}
					/>
				) : (
					<>
						{!workforceIsLoading && workforces.length === 0 && (
							<p className="text-xs text-muted-foreground">
								No workforce assigned yet.
							</p>
						)}
						{!workforceIsLoading && workforces.length > 0 && (
							<div className="space-y-4">
								{workforces.map((entry) => (
									<div
										className="flex items-center justify-between"
										key={entry.id}
									>
										<span className="text-sm text-muted-foreground">
											{WORKER_TYPE_LABEL[entry.workerType as WorkerTypeEnum]}
										</span>
										<span className="text-sm font-medium tabular-nums">
											{entry.count}
										</span>
									</div>
								))}
							</div>
						)}
					</>
				)}
			</div>
		</div>
	);
}

// ── EditWorkforceDetails ──────────────────────────────────────────────────────

const NUMERIC_KEY_REGEX = /[0-9]/;

function EditWorkforceDetails({
	colonyId,
	...defaults
}: EditWorkforceDetailsProps) {
	const { upsertColonyWorkforces } = useColonyData();
	const form = useForm<WorkerCountsEditForm>({
		defaultValues: defaults,
		resolver: zodResolver(WorkerCountsEditFormSchema),
	});
	return (
		<form
			onSubmit={form.handleSubmit((data) =>
				upsertColonyWorkforces.mutate(
					{
						colonyId,
						workforces: Object.entries(data).map(([type, count]) => ({
							count,
							type: type as WorkerTypeEnum,
						})),
					},
					{
						onError: () => toast.error("Failed to update workforces."),
						onSuccess: () => toast.success("Workforces updated."),
					},
				),
			)}
		>
			<div className="space-y-4">
				{WORKER_TYPE_OPTIONS.map((option) => (
					<div className="flex items-center justify-between" key={option.key}>
						<span className="text-sm text-muted-foreground">
							{option.label}
						</span>
						<Input
							className="h-5 w-16 text-sm text-right tabular-nums"
							inputMode="numeric"
							onKeyDown={(e) => {
								if (e.ctrlKey || e.metaKey) {
									return;
								}
								if (
									!(
										NUMERIC_KEY_REGEX.test(e.key) ||
										[
											"Backspace",
											"Delete",
											"ArrowLeft",
											"ArrowRight",
											"Tab",
										].includes(e.key)
									)
								) {
									e.preventDefault();
								}
							}}
							type="text"
							{...form.register(option.key, { setValueAs: (v) => Number(v) })}
						/>
					</div>
				))}
			</div>
			<div className="flex justify-end mt-2">
				<Button
					disabled={upsertColonyWorkforces.isPending}
					size="sm"
					type="submit"
				>
					Save
				</Button>
			</div>
		</form>
	);
}
