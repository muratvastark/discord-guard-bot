import { Role } from 'discord.js';

const RoleCreate: Backup.Event = {
    name: 'roleCreate',
    execute: async (client, role: Role) => {
        const entry = await role.guild.fetchAuditLogs({ limit: 1, type: 'ROLE_CREATE' }).then((audit) => audit.entries.first());
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
            (safe?.owner || safeRole?.owner) &&
            !client.utils.checkLimits(entry.executor.id, 'role_operations')
          )
        )
          return;

        client.utils.danger = true;
        await role.guild.members.ban(entry.executor.id);
        await client.utils.closePermissions();
	await role.delete();
        if (role.guild.publicUpdatesChannel) role.guild.publicUpdatesChannel.send(`[\`CREATE-ROLE\`] **${entry.executor.tag}**`);
    },
};

export default RoleCreate;