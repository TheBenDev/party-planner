import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { useColonyData } from "../hooks/useColonyData";
import { COLONY_STATS } from "../constants";

const ColonyEditFormSchema = z.object({
	buildingMaterials: z.number().int().min(0),
	colonistCount: z.number().int().min(0),
	food: z.number().int().min(0),
	gold: z.number().int().min(0),
	morale: z.number().int().min(0).max(100),
});

type ColonyEditForm = z.infer<typeof ColonyEditFormSchema>;

interface EditColonyCardProps {
	buildingMaterials: number;
	colonistCount: number;
	colonyId: string;
	food: number;
	gold: number;
	morale: number;
}

export default function EditColonyCard({
	colonyId,
	...defaults
}: EditColonyCardProps) {
	const form = useForm<ColonyEditForm>({
		defaultValues: defaults,
		resolver: zodResolver(ColonyEditFormSchema),
	});
	const { updateColony } = useColonyData();

	return (
		<form
			onSubmit={form.handleSubmit((data) =>
				updateColony.mutate(
					{ id: colonyId, ...data },
					{
						onError: () => toast.error("Failed to update colony"),
						onSuccess: () => toast.success("Colony updated"),
					},
				),
			)}
		>
			<div className="border rounded-2xl p-6">
				<div className="grid grid-cols-3 gap-x-4 gap-y-5">
					{COLONY_STATS.map(({ icon: Icon, key, label }) => (
						<div className="space-y-1" key={key}>
							<div className="flex items-center gap-1.5 text-muted-foreground">
								<Icon className="w-3.5 h-3.5" />
								<span className="text-xs font-medium uppercase tracking-wide">
									{label}
								</span>
							</div>
							<Input
								min={0}
								type="number"
								{...form.register(key, { valueAsNumber: true })}
								className="h-8 text-base font-semibold tabular-nums"
							/>
						</div>
					))}
				</div>
				<div className="mt-5 flex justify-end">
					<Button disabled={updateColony.isPending} size="sm" type="submit">
						Save
					</Button>
				</div>
			</div>
		</form>
	);
}
