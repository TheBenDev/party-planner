import { zodResolver } from "@hookform/resolvers/zod";
import { GlobeIcon, HashIcon } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { ToggleDisplayInput } from "@/features/integrations/components/ToggleDisplayInput";
import { useDiscordIntegration } from "@/features/integrations/hooks/useDiscordIntegration";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/shared/components/ui/accordion";
import { Button } from "@/shared/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/components/ui/select";
import { Switch } from "@/shared/components/ui/switch";

const TIMEZONE_OPTIONS = [
	{ label: "UTC", value: "UTC" },
	{ label: "Eastern (ET)", value: "America/New_York" },
	{ label: "Central (CT)", value: "America/Chicago" },
	{ label: "Mountain (MT)", value: "America/Denver" },
	{ label: "Pacific (PT)", value: "America/Los_Angeles" },
	{ label: "Alaska (AKT)", value: "America/Anchorage" },
	{ label: "Hawaii (HT)", value: "Pacific/Honolulu" },
	{ label: "London (GMT/BST)", value: "Europe/London" },
	{ label: "Paris / Berlin (CET)", value: "Europe/Paris" },
	{ label: "Helsinki (EET)", value: "Europe/Helsinki" },
	{ label: "Moscow (MSK)", value: "Europe/Moscow" },
	{ label: "Dubai (GST)", value: "Asia/Dubai" },
	{ label: "India (IST)", value: "Asia/Kolkata" },
	{ label: "Singapore (SGT)", value: "Asia/Singapore" },
	{ label: "Tokyo (JST)", value: "Asia/Tokyo" },
	{ label: "Seoul (KST)", value: "Asia/Seoul" },
	{ label: "Sydney (AET)", value: "Australia/Sydney" },
	{ label: "Auckland (NZST)", value: "Pacific/Auckland" },
] as const;

const DiscordSettingsSchema = z.object({
	defaultChannelId: z.string().min(1, "Channel ID is required").optional(),
	enableSessionReminders: z.boolean(),
	sessionRecapChannelId: z.string().min(1, "Channel ID is required").optional(),
	sessionReminderChannelId: z
		.string()
		.min(1, "Channel ID is required")
		.optional(),
	timezone: z.string().optional(),
});

type DiscordSettingsForm = z.infer<typeof DiscordSettingsSchema>;

export function DiscordIntegrationSettings({
	campaignId,
}: {
	campaignId: string;
}) {
	const { integration, update, isUpdating } = useDiscordIntegration({
		campaignId,
	});

	const { control, handleSubmit, formState, reset } =
		useForm<DiscordSettingsForm>({
			defaultValues: {
				defaultChannelId: integration?.metaData.defaultChannel.id ?? "",
				enableSessionReminders:
					integration?.settings.enableSessionReminders ?? false,
				timezone: integration?.settings.timezone ?? "",
			},
			resolver: zodResolver(DiscordSettingsSchema),
		});

	useEffect(() => {
		if (!integration) return;
		reset({
			defaultChannelId: integration.metaData.defaultChannel.id,
			enableSessionReminders: integration.settings.enableSessionReminders,
			timezone: integration.settings.timezone,
		});
	}, [integration, reset]);

	if (!integration) return null;

	const onSubmit = (data: DiscordSettingsForm) => {
		update(data, { onSuccess: () => reset(data) });
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base pt-1">Settings</CardTitle>
				<CardDescription>
					Configure how Beny Bot behaves in your server.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<form onSubmit={handleSubmit(onSubmit)}>
					<div className="space-y-4">
						<div className="flex items-center justify-between text-sm">
							<div className="flex flex-col gap-0.5">
								<span>Session reminders</span>
								<span className="text-xs text-muted-foreground">
									Post a reminder before each scheduled session.
								</span>
							</div>
							<Controller
								control={control}
								name="enableSessionReminders"
								render={({ field }) => (
									<Switch
										checked={field.value}
										disabled={isUpdating}
										onCheckedChange={field.onChange}
									/>
								)}
							/>
						</div>

						<div className="flex items-center justify-between gap-3 text-sm">
							<div className="flex items-center gap-2 text-muted-foreground">
								<GlobeIcon className="h-4 w-4" />
								<span>Timezone</span>
							</div>
							<Controller
								control={control}
								name="timezone"
								render={({ field }) => (
									<Select onValueChange={field.onChange} value={field.value}>
										<SelectTrigger className="h-7 w-48 font-mono text-xs">
											<SelectValue placeholder="Select timezone" />
										</SelectTrigger>
										<SelectContent>
											{TIMEZONE_OPTIONS.map((option) => (
												<SelectItem
													className="font-mono text-xs"
													key={option.value}
													value={option.value}
												>
													{option.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
							/>
						</div>

						<Accordion collapsible type="single">
							<AccordionItem className="border-0" value="channels">
								<AccordionTrigger className="py-0 text-sm hover:no-underline">
									<div className="flex flex-1 items-center justify-between pr-2">
										<div className="flex items-center gap-2 text-muted-foreground">
											<HashIcon className="h-4 w-4" />
											<span>Default channel</span>
										</div>
										{/* biome-ignore lint/a11y/noStaticElementInteractions lint/a11y/useKeyWithClickEvents: stopPropagation wrapper; accordion trigger handles keyboard nav */}
										<div onClick={(e) => e.stopPropagation()}>
											<Controller
												control={control}
												name="defaultChannelId"
												render={({ field }) => (
													<ToggleDisplayInput
														initialValue={
															integration.metaData.defaultChannel.name ||
															"Not set"
														}
														onChange={field.onChange}
														placeholder="e.g. 1234567890"
														value={
															field.value ??
															integration.metaData.defaultChannel?.id
														}
													/>
												)}
											/>
										</div>
									</div>
								</AccordionTrigger>
								<AccordionContent className="pb-0 pt-3">
									<p className="mb-3 text-xs text-muted-foreground">
										Set specific channels for certain Beny Bot notifications.
										Falls back to the default channel if not set.
									</p>
									<div className="space-y-3">
										<div className="flex items-center justify-between gap-3 text-sm">
											<div className="flex items-center gap-2 text-muted-foreground">
												<HashIcon className="h-4 w-4" />
												<span>Recap channel</span>
											</div>
											<Controller
												control={control}
												name="sessionRecapChannelId"
												render={({ field }) => (
													<ToggleDisplayInput
														initialValue={
															integration.settings.recapChannel?.name ||
															integration.metaData.defaultChannel.name ||
															"Not set"
														}
														onChange={field.onChange}
														value={
															field.value ??
															integration.metaData.defaultChannel.id
														}
													/>
												)}
											/>
										</div>
										<div className="flex items-center justify-between gap-3 text-sm">
											<div className="flex items-center gap-2 text-muted-foreground">
												<HashIcon className="h-4 w-4" />
												<span>Reminder channel</span>
											</div>
											<Controller
												control={control}
												name="sessionReminderChannelId"
												render={({ field }) => (
													<ToggleDisplayInput
														initialValue={
															integration.settings.sessionReminderChannel
																?.name ||
															integration.metaData.defaultChannel.name ||
															"Not set"
														}
														onChange={field.onChange}
														value={
															field.value ??
															integration.metaData.defaultChannel.id
														}
													/>
												)}
											/>
										</div>
									</div>
								</AccordionContent>
							</AccordionItem>
						</Accordion>
					</div>

					<div
						className={`mt-4 flex justify-end ${formState.isDirty ? "" : "invisible"}`}
					>
						<Button
							className="hover:opacity-80"
							disabled={isUpdating}
							size="sm"
							type="submit"
						>
							{isUpdating ? "Saving…" : "Save"}
						</Button>
					</div>
				</form>
			</CardContent>
		</Card>
	);
}
