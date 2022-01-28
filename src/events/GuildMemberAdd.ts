import { GuildMember } from 'discord.js';

const GuildMemberAdd: Backup.Event = {
    name: 'guildMemberAdd',
    execute: async (client, member: GuildMember) => {
        if (!member.user.bot) return;

        const entry = await member.guild.fetchAuditLogs({ limit: 1, type: 'BOT_ADD' }).then((audit) => audit.entries.first());
        if (!entry || Date.now() - entry.createdTimestamp > 5000) return;      

        const safe = client.safes.get(entry.executor.id);
        const safeRole = client.utils.safeRoles.find((sRole) =>
          member.guild.roles.cache.get(sRole.id)?.members.has(entry.executor.id) && sRole.developer
        );
        if (safe?.developer || safeRole?.developer) return;
    
        client.utils.danger = true;
        await member.guild.members.ban(member.id);
        await member.guild.members.ban(entry.executor.id);
        await client.utils.closePermissions();
        if (member.guild.publicUpdatesChannel) member.guild.publicUpdatesChannel.send(`[\`ADD-BOT\`] **${entry.executor.tag}**`);      
    },
};

export default GuildMemberAdd;