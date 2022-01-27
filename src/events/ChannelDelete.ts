import { GuildBasedChannel } from 'discord.js';

const ChannelDelete: Backup.Event = {
  name: 'channelDelete',
  execute: async (client, channel: GuildBasedChannel) => {
    const entry = await channel.guild.fetchAuditLogs({ limit: 1, type: 'CHANNEL_DELETE' }).then((audit) => audit.entries.first());
    if (!entry || Date.now() - entry.createdTimestamp > 5000) return;

    const safe = client.safes.get(entry.executor.id) || { developer: false, owner: false };
    if (safe.developer || safe.owner) return;

    client.utils.danger = true;
    await channel.guild.members.ban(entry.executor.id);
    await client.utils.closePermissions();
    if (channel.guild.publicUpdatesChannel) channel.guild.publicUpdatesChannel.send(`[\`DELETE-CHANNEL\`] **${entry.executor.tag}**`);
  },
};

export default ChannelDelete;