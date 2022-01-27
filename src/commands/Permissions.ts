import { GuildModel } from '../models/Guild';

const Permissions: Backup.Command = {
    usages: ['close-permissions', 'close-perms', 'closeperms', 'cperms', 'perms', 'permissions'],
    execute: async ({ client, message, args }) => {
        const operation = args[0] ? args[0].toLowerCase() : undefined;
        if (!operation || !['on', 'off'].some(arg => operation === arg)) return message.channel.send('Please specified a valid argument. (`off` or `on`)');

        if (client.utils.closingPermissions) client.utils.closingPermissions = false;

        const data = await GuildModel.findOne({ id: message.guildId }) || new GuildModel({ id: message.guildId });
        if (operation === 'on') {
            data.permissions.forEach((permission) => {
                const role = message.guild.roles.cache.get(permission.ID);
                if (role) role.setPermissions(permission.ALLOW);
            });
        } else {
            data.permissions = [];
            message.guild.roles.cache
                .filter((role) => client.utils.dangerPerms.some((perm) => role.permissions.has(perm)) && !role.managed)
                .forEach((role) => {
                    data.permissions.push({
                        ID: role.id,
                        ALLOW: role.permissions.toArray()
                    });
                    role.setPermissions([]);
                });
            data.save();
        }

        message.channel.send({ content: `All perms ${operation === 'on' ? 'actived.' : 'deactived.'}` })
    },
};

export default Permissions;
