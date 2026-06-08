import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import type { UserRole } from "@planner/enums/user";
import type { GetActiveCampaignResponse } from "@/features/campaigns/types";
import type { GetUserResponse } from "@/shared/types";
import { useQuery } from "@tanstack/react-query";
import type React from "react";
import { createContext, useContext, useMemo } from "react";
import { client } from "@/shared/lib/client";
import { queryKeys } from "@/shared/lib/query-keys";

export type AuthContextValue = {
	user: GetUserResponse | null;
	userIsLoading: boolean;
	campaign: GetActiveCampaignResponse | null;
	campaignIsLoading: boolean;
	role: UserRole | null;
};
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const clerkAuth = useClerkAuth();
	const { data: user = null, isLoading: userIsLoading } = useQuery({
		enabled: clerkAuth.isSignedIn === true,
		gcTime: 10 * 60 * 1000,
		queryFn: async () => await client.user.getUser(),
		queryKey: queryKeys.auth.user(),
	});
	const { data: campaign = null, isLoading: campaignIsLoading } = useQuery({
		enabled: clerkAuth.isSignedIn === true,
		gcTime: 10 * 60 * 1000,
		queryFn: async () => await client.campaign.getActiveCampaign(),
		queryKey: queryKeys.auth.campaign(),
	});

	const value = useMemo(() => {
		return {
			campaign,
			campaignIsLoading,
			role: campaign?.role ?? null,
			user,
			userIsLoading,
		};
	}, [user, userIsLoading, campaign, campaignIsLoading]);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
	const context = useContext(AuthContext);

	if (!context) {
		throw new Error("useAuth must be used within an AuthProvider");
	}

	return context;
}
