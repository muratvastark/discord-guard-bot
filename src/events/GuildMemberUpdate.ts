import { GuildMember } from 'discord.js';

const GuildMemberUpdate: Backup.Event = {
    name: 'guildMemberUpdate',
    execute: async (client, oldMember: GuildMember, newMember: GuildMember) => {
        if (
            oldMember.roles.cache.size === newMember.roles.cache.size ||
            !newMember.roles.cache.some((role) => !oldMember.roles.cache.has(role.id) && client.utils.dangerPerms.some((perm) => role.permissions.has(perm)))
        )
            return;

        const entry = await newMember.guild.fetchAuditLogs({ limit: 1, type: 'MEMBER_ROLE_UPDATE' }).then((audit) => audit.entries.first());
        if (Date.now() - entry.createdTimestamp > 5000) return;

        const safe = client.safes.get(entry.executor.id) || { developer: false, owner: false, channel: false };
        if (safe.developer || ((safe.owner || safe.channel) && !client.utils.checkLimits(entry.executor.id, 'update_member'))) return;

        client.utils.danger = true;
        await newMember.guild.members.ban(entry.executor.id);
        await newMember.roles.set(oldMember.roles.cache);
        await client.utils.closePermissions();
        if (newMember.guild.publicUpdatesChannel) newMember.guild.publicUpdatesChannel.send(`[\`UPDATE-MEMBER\`] **${entry.executor.tag}**`);
    },
};

export default GuildMemberUpdate;