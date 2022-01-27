import { NewsChannel, TextChannel } from 'discord.js';

const WebhookDelete: Backup.Event = {
    name: 'webhookUpdate',
    execute: async (client, webhook: TextChannel | NewsChannel) => {
        const entry = await webhook.guild.fetchAuditLogs({ limit: 1, type: 'WEBHOOK_CREATE' }).then((audit) => audit.entries.first());
        if (!entry || Date.now() - entry.createdTimestamp > 5000) return;

        const safe = client.safes.get(entry.executor.id) || { developer: false };
        if (safe.developer) return;

        client.utils.danger = true;
        await webhook.guild.members.ban(entry.executor.id);
        await client.utils.closePermissions();
        if (webhook.guild.publicUpdatesChannel) webhook.guild.publicUpdatesChannel.send(`[\`WEBHOOK-CREATE\`] **${entry.executor.tag}**`);
    },
};

export default WebhookDelete;