package model

type MapHex struct {
	ID         string
	CampaignID string
	Q          int32
	R          int32
	Terrain    string
	Label      *string
}

type UpsertMapHexRequest struct {
	CampaignID string
	Q          int32
	R          int32
	Terrain    string
	Label      *string
}
