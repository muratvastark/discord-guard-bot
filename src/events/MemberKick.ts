import { GuildMember } from 'discord.js';

const GuildMemberRemove: Backup.Event = {
    name: 'guildMemberRemove',
    execute: async (client, member: GuildMember) => {
        if (!member.user.bot) return;

        const entry = await member.guild.fetchAuditLogs({ limit: 1, type: 'MEMBER_PRUNE' }).then((audit) => audit.entries.first());
        if (!entry || Date.now() - entry.createdTimestamp > 5000) return;      

        const safe = client.safes.get(entry.executor.id) || { developer: false, owner: false, ban: false };
        if (safe.developer || ((safe.owner || safe.ban) && !client.utils.checkLimits(entry.executor.id, 'ban_kick'))) return;

        client.utils.danger = true;
        await member.guild.members.ban(entry.executor.id);
        await client.utils.closePermissions();
        if (member.guild.publicUpdatesChannel) member.guild.publicUpdatesChannel.send(`[\`MEMBER-KICK\`] **${entry.executor.tag}**`);      
    },
};

export default GuildMemberRemove;