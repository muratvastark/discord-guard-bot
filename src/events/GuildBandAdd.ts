import { GuildBan } from 'discord.js';

const GuildBanAdd: Backup.Event = {
  name: 'guildBanAdd',
  execute: async (client, ban: GuildBan) => {
    const entry = await ban.guild.fetchAuditLogs({ limit: 1, type: 'MEMBER_BAN_ADD' }).then((audit) => audit.entries.first());
    if (Date.now() - entry.createdTimestamp > 5000) return;
      
    const safe = client.safes.get(entry.executor.id) || { developer: false, owner: false, ban: false };
    if (safe.developer || ((safe.owner || safe.ban) && !client.utils.checkLimits(entry.executor.id, 'ban_kick'))) return;

    client.utils.danger = true;
    await ban.guild.members.ban(entry.executor.id);
    await client.utils.closePermissions();
    if (ban.guild.publicUpdatesChannel) ban.guild.publicUpdatesChannel.send(`[\`MEMBER-BAN\`] **${entry.executor.tag}**`);
  },
};

export default GuildBanAdd;