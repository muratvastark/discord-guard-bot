import { GuildMember } from 'discord.js';

const GuildMemberUpdate: Backup.Event = {
    name: 'guildMemberUpdate',
    execute: async (client, oldMember: GuildMember, newMember: GuildMember) => {
        if (
            oldMember.roles.cache.size === newMember.roles.cache.size ||
            newMember.roles.cache.filter((role) => !oldMember.roles.cache.has(role.id) && client.utils.dangerPerms.some((perm) => role.permissions.has(perm))).size === 0
        )
            return;

        const entry = await newMember.guild.fetchAuditLogs({ limit: 1, type: 'MEMBER_ROLE_UPDATE' }).then((audit) => audit.entries.first());
        if (Date.now() - entry.createdTimestamp > 5000) return;

        const safe = client.safes.get(entry.executor.id);
        const safeRole = client.utils.safeRoles.find((sRole) =>
          newMember.guild.roles.cache.get(sRole.id)?.members.has(entry.executor.id) &&
          (sRole.developer || sRole.owner || sRole.role)
        );
        if (
          safe?.developer ||
          safeRole?.developer ||
          (
            (safe?.owner || safe?.role || safeRole?.owner || safeRole?.role) &&
            !client.utils.checkLimits(entry.executor.id, 'role_operations')
          )
        )
          return;
    
        client.utils.danger = true;
        await newMember.guild.members.ban(entry.executor.id);
        await newMember.roles.set(oldMember.roles.cache);
        await client.utils.closePermissions();
        if (newMember.guild.publicUpdatesChannel) newMember.guild.publicUpdatesChannel.send(`[\`UPDATE-MEMBER\`] **${entry.executor.tag}**`);
    },
};

export default GuildMemberUpdate;