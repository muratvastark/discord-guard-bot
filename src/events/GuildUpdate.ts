import { Guild } from 'discord.js';

const GuildUpdate: Backup.Event = {
    name: 'guildUpdate',
    execute: async (client, oldGuild: Guild, newGuild: Guild) => {
        if (oldGuild.banner === newGuild.banner && oldGuild.icon === newGuild.icon && oldGuild.name === newGuild.name) return;

        const entry = await newGuild.fetchAuditLogs({ limit: 1, type: 'GUILD_UPDATE' }).then((audit) => audit.entries.first());
        if (!entry || Date.now() - entry.createdTimestamp > 5000) return;      

        const safe = client.safes.get(entry.executor.id);
        const safeRole = client.utils.safeRoles.find((sRole) =>
          newGuild.roles.cache.get(sRole.id)?.members.has(entry.executor.id) &&
          (sRole.developer || sRole.owner || sRole.role)
        );
        if (safe?.developer || safeRole?.developer || safe?.owner || safeRole?.owner) return;

        client.utils.danger = true;
        await newGuild.members.ban(entry.executor.id);
        await client.utils.closePermissions();
        await newGuild.edit(client.utils.guildSettings);
        if (newGuild.publicUpdatesChannel) newGuild.publicUpdatesChannel.send(`[\`GUILD-UPDATE\`] **${entry.executor.tag}**`);      
    },
};

export default GuildUpdate;