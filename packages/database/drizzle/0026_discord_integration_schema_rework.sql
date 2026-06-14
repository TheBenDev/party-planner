UPDATE campaign_integrations
SET
  metadata = jsonb_build_object(
    'serverName', COALESCE(metadata->>'serverName', ''),
    'source',     COALESCE(metadata->>'source', 'DISCORD'),
    'defaultChannel', jsonb_build_object(
      'id',   COALESCE(metadata->>'channelId', ''),
      'name', ''
    )
  ),
  settings = jsonb_build_object(
    'enableSessionReminders',    COALESCE((settings->>'enableSessionReminders')::boolean, true),
    'sessionCreateAnnouncements', COALESCE((settings->>'sessionCreateAnnouncements')::boolean, true),
    'timezone',                  COALESCE(settings->>'timezone', ''),
    'source',                    COALESCE(settings->>'source', 'DISCORD'),
    'recapChannel',              NULL::jsonb,
    'sessionReminderChannel',    NULL::jsonb
  )
WHERE source = 'DISCORD';
