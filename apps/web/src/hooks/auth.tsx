"use client";
import { useAuth as useClerkAuth } from "@clerk/nextjs";
import type { GetActiveCampaignResponse } from "@planner/schemas/campaigns";
import type { GetUserResponse } from "@planner/schemas/user";
import { useQuery } from "@tanstack/react-query";
import type React from "react";
import { createContext, useContext, useMemo } from "react";
import { client } from "@/lib/client";

export type AuthContextValue = {
	user: NonNullable<GetUserResponse>["user"] | null;
	campaign: NonNullable<GetActiveCampaignResponse>["campaign"] | null;
};
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const clerkAuth = useClerkAuth();
	const userQuery = useQuery({
		enabled: clerkAuth.isSignedIn === true,
		gcTime: 10 * 60 * 1000,
		queryFn: async () => {
			return await client.user.getUser();
		},
		queryKey: ["auth", "user"],
	});
	const campaignQuery = useQuery({
		enabled: clerkAuth.isSignedIn === true,
		gcTime: 10 * 60 * 1000,
		queryFn: async () => {
			return await client.campaign.getActiveCampaign();
		},
		queryKey: ["auth", "campaign"],
	});

	const user = useMemo(() => {
		if (!userQuery.data) return null;
		return userQuery.data.user;
	}, [userQuery.data]);

	const campaign = useMemo(() => {
		if (!campaignQuery.data) return null;
		return campaignQuery.data.campaign;
	}, [campaignQuery.data]);

	const value = useMemo(() => {
		return {
			campaign,
			user,
		};
	}, [user, campaign]);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
	const context = useContext(AuthContext);

	if (!context) {
		throw new Error("useAuth must be used within an AuthProvider");
	}

	return context;
}
