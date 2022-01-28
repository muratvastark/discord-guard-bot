import { Role } from 'discord.js';
import { RoleModel } from '../models/Role';

const RoleUpdate: Backup.Event = {
    name: 'roleUpdate',
    execute: async (client, role: Role) => {
        const entry = await role.guild.fetchAuditLogs({ limit: 1, type: 'ROLE_UPDATE' }).then((audit) => audit.entries.first());
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
        if (role.guild.publicUpdatesChannel) role.guild.publicUpdatesChannel.send(`[\`UPDATE-ROLE\`] **${entry.executor.tag}**`);
       
        const data = await RoleModel.findOne({ id: role.id });
        if (!data) return client.logger.warning(`WARN: @${role.name} (${role.id}) was not created because the data could not be found.`);
      
        role.edit({
          name: data.name,
          color: data.color,
          hoist: data.hoist,
          permissions: data.permissions,
          position: data.position,
          mentionable: data.mentionable,
        });
    },
};

export default RoleUpdate;