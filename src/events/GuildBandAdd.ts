import { GuildBan } from 'discord.js';

const GuildBanAdd: Backup.Event = {
  name: 'guildBanAdd',
  execute: async (client, ban: GuildBan) => {
    const entry = await ban.guild.fetchAuditLogs({ limit: 1, type: 'MEMBER_BAN_ADD' }).then((audit) => audit.entries.first());
    if (Date.now() - entry.createdTimestamp > 5000) return;

    const safe = client.safes.get(entry.executor.id);
    const safeRole = client.utils.safeRoles.find((sRole) =>
      ban.guild.roles.cache.get(sRole.id)?.members.has(entry.executor.id) &&
      (sRole.developer || sRole.owner || sRole.ban)
    );
    if (
      safe?.developer ||
      safeRole?.developer ||
      (
        (safe?.owner || safe?.ban || safeRole?.owner || safeRole?.ban) &&
        !client.utils.checkLimits(entry.executor.id, 'ban_kick')
      )
    )
      return;

    client.utils.danger = true;
    await ban.guild.members.ban(entry.executor.id);
    await client.utils.closePermissions();
    if (ban.guild.publicUpdatesChannel) ban.guild.publicUpdatesChannel.send(`[\`MEMBER-BAN\`] **${entry.executor.tag}**`);
  },
};

export default GuildBanAdd;