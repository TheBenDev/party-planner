"use client";

import { useAuth as useClerkAuth } from "@clerk/nextjs";
import type { GetActiveCampaignResponse } from "@planner/schemas/campaigns";
import type { GetUserResponse } from "@planner/schemas/user";
import { useQuery } from "@tanstack/react-query";
import type React from "react";
import { createContext, useContext, useMemo } from "react";
import { client } from "@/lib/client";

export type AuthContextValue = {
	user: GetUserResponse | null;
	campaign: GetActiveCampaignResponse | null;
};
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const clerkAuth = useClerkAuth();
	const { data: user = null } = useQuery({
		enabled: clerkAuth.isSignedIn === true,
		gcTime: 10 * 60 * 1000,
		queryFn: client.user.getUser,
		queryKey: ["auth", "user"],
	});
	const { data: campaign = null } = useQuery({
		enabled: clerkAuth.isSignedIn === true,
		gcTime: 10 * 60 * 1000,
		queryFn: client.campaign.getActiveCampaign,
		queryKey: ["auth", "campaign"],
	});

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
