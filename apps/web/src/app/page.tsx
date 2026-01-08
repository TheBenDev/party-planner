"use client";
import type { CreateCampaignRequest } from "@planner/schemas/campaigns";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/auth";
import { client } from "@/lib/client";

export type CreateCampaignFormType = {
	title: string;
	description: string;
};

export default function CreateCampaignForm() {
	const [tags, setTags] = useState<string[]>([]);
	const [tagInput, setTagInput] = useState("");
	const router = useRouter();
	const { user } = useAuth();

	const { mutate: createCampaign } = useMutation({
		mutationFn: async (c: CreateCampaignRequest) => {
			const res = await client.campaign.createCampaign.$post(c);
			return res.json();
		},
		onError: () => {
			toast("something went wrong creating campaign.");
		},
		onSuccess: (res) => {
			router.push(`campaign/${res.id}`);
		},
	});

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm({
		defaultValues: {
			description: "",
			title: "",
		},
	});

	if (!user) {
		return <div>Must be signed in to create a campaign</div>;
	}

	const addTag = (e: React.MouseEvent | React.KeyboardEvent) => {
		e.preventDefault();
		if (tagInput.trim() && !tags.includes(tagInput.trim())) {
			setTags([...tags, tagInput.trim()]);
			setTagInput("");
		}
	};

	const removeTag = (tagToRemove: string) => {
		setTags(tags.filter((tag) => tag !== tagToRemove));
	};

	const onSubmit = (data: CreateCampaignFormType) => {
		const formData: CreateCampaignRequest = {
			...data,
			tags,
		};

		createCampaign(formData);
	};

	return (
		<div className="min-h-screen bg-background py-12 px-4">
			<div className="max-w-2xl mx-auto">
				<div className="bg-card rounded-2xl shadow-lg border border-border p-8">
					{/* Header */}
					<div className="mb-8">
						<h1 className="text-4xl font-bold text-foreground mb-2">
							Create Your Campaign
						</h1>
						<p className="text-muted-foreground">
							Begin your next epic D&D adventure
						</p>
					</div>

					<div className="space-y-6">
						{/* Campaign Title */}
						<div>
							<label
								className="block text-sm font-medium text-foreground mb-2"
								htmlFor="title"
							>
								Campaign Title
							</label>
							<input
								{...register("title", {
									minLength: {
										message: "Title must be at least 3 characters",
										value: 3,
									},
									required: "Campaign title is required",
								})}
								className="w-full px-4 py-3 bg-background border border-input rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition"
								id="title"
								placeholder="The Lost Mines of Phandelver"
								type="text"
							/>
							{errors.title && (
								<p className="mt-1 text-sm text-destructive">
									{errors.title.message}
								</p>
							)}
						</div>

						{/* Campaign Description */}
						<div>
							<label
								className="block text-sm font-medium text-foreground mb-2"
								htmlFor="description"
							>
								Description
							</label>
							<textarea
								{...register("description", {
									minLength: {
										message: "Description must be at least 10 characters",
										value: 10,
									},
									required: "Description is required",
								})}
								className="w-full px-4 py-3 bg-background border border-input rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition resize-none"
								id="description"
								placeholder="A tale of heroes, dragons, and forgotten treasures..."
								rows={5}
							/>
							{errors.description && (
								<p className="mt-1 text-sm text-destructive">
									{errors.description.message}
								</p>
							)}
						</div>

						{/* Tags */}
						<div>
							<label
								className="block text-sm font-medium text-foreground mb-2"
								htmlFor="tags"
							>
								Tags
							</label>
							<div className="flex gap-2 mb-3">
								<input
									className="flex-1 px-4 py-3 bg-background border border-input rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition"
									id="tags"
									onChange={(e) => setTagInput(e.target.value)}
									onKeyDown={(e) => e.key === "Enter" && addTag(e)}
									placeholder="e.g., Fantasy, High-Level, Homebrew"
									type="text"
									value={tagInput}
								/>
								<Button
									className="px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition"
									onClick={addTag}
								>
									Add
								</Button>
							</div>

							{/* Tag Display */}
							{tags.length > 0 && (
								<div className="flex flex-wrap gap-2">
									{tags.map((tag, index) => (
										<span
											className="inline-flex items-center gap-2 px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm border border-border"
											key={index}
										>
											{tag}
											<button
												className="hover:text-destructive transition"
												onClick={() => removeTag(tag)}
												type="button"
											>
												×
											</button>
										</span>
									))}
								</div>
							)}
						</div>

						{/* Submit Button */}
						<button
							className="w-full py-4 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg shadow-lg transition transform hover:scale-[1.02] active:scale-[0.98]"
							onClick={handleSubmit(onSubmit)}
							type="button"
						>
							Create Campaign
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
