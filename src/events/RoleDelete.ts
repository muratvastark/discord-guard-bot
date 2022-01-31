import { Role } from 'discord.js';

const RoleDelete: Backup.Event = {
    name: 'roleDelete',
    execute: async (client, role: Role) => {
        const entry = await role.guild.fetchAuditLogs({ limit: 1, type: 'ROLE_DELETE' }).then((audit) => audit.entries.first());
        if (!entry || Date.now() - entry.createdTimestamp > 5000) return;

        const safe = client.safes.get(entry.executor.id);
        const safeRole = client.utils.safeRoles.find((sRole) =>
            role.guild.roles.cache.get(sRole.id)?.members.has(entry.executor.id) &&
            (sRole.developer || sRole.owner)
        );
        if (
            safe?.developer ||
            safeRole?.developer ||
            (
                !client.utils.indelibleRoles.includes(role.id) &&
                (safe?.owner || safeRole?.owner) &&
                !client.utils.checkLimits(entry.executor.id, 'role_operations')
            )
        )
            return;

        client.utils.danger = true;
        await role.guild.members.ban(entry.executor.id);
        await client.utils.closePermissions();
        if (role.guild.publicUpdatesChannel) role.guild.publicUpdatesChannel.send(`[\`DELETE-ROLE\`] **${entry.executor.tag}**`);
    },
};

export default RoleDelete;
