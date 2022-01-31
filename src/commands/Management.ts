import { GuildChannel, Message, MessageActionRow, MessageButton } from 'discord.js';
import { RoleModel } from '../models/Role';
import { GuildModel } from '../models/Guild';
import { ChannelModel, ChannelSchema } from '../models/Channel';
import { Core } from '../base/Core';

const Management: Backup.Command = {
    usages: ['guard-menu', 'guard-panel', 'menu', 'panel', 'guardpanel', 'gpanel', 'gmenu', 'guardmenu'],
    execute: async ({ client, message }) => {
        const row = new MessageActionRow().addComponents([
            new MessageButton().setStyle('PRIMARY').setLabel('Check roles.').setCustomId('roles'),
            new MessageButton().setStyle('PRIMARY').setLabel('Check channels.').setCustomId('channels'),
            new MessageButton()
                .setStyle('DANGER')
                .setLabel(client.utils.danger === true ? 'Backup start.' : 'Backup stop.')
                .setCustomId('danger'),
        ]);

        const question = await message.channel.send({
            content: 'Change bot settings using the menu below!',
            components: [row],
        });

        const collector = await question.createMessageComponentCollector({
            componentType: 'BUTTON',
            filter: (component) => component.user.id === message.author.id,
            time: 60000,
        });

        collector.on('collect', async (interaction) => {
            interaction.deferUpdate();
            if (interaction.customId === 'danger') await setDanger(client, question, row);
            else if (interaction.customId === 'roles') await checkRoles(client, question, row);
            else if (interaction.customId === 'channels') await checkChannels(question, row);
        });

        collector.on('end', () => {
            question.delete();
        });
    },
};

export default Management;

async function setDanger(client: Core, question: Message, row: MessageActionRow) {
    client.utils.danger = !client.utils.danger;
    if (client.utils.danger === false) await client.utils.getBackup();
    (row.components[2] as MessageButton).setLabel(client.utils.danger === true ? 'Backup start.' : 'Backup stop.');
    question.edit({
        content: 'Change bot settings using the menu below!',
        components: [row],
    });
}

async function checkRoles(client: Core, question: Message, row: MessageActionRow) {
    const roles = await RoleModel.find();
    const deletedRoles = roles.filter((role) => !question.guild.roles.cache.has(role.id));
    if (!deletedRoles.length) return;

    (row.components[0] as MessageButton).setDisabled(true);
    await question.edit({
        content: 'Change bot settings using the menu below!',
        components: [row],
    });

    for (const deletedRole of deletedRoles) {
        const newRole = await question.guild.roles.create({
            name: deletedRole.name,
            color: deletedRole.color,
            hoist: deletedRole.hoist,
            position: deletedRole.position,
            permissions: deletedRole.permissions,
            mentionable: deletedRole.mentionable,
        });

        await RoleModel.updateOne({ id: deletedRole.id }, { id: newRole.id });
        await ChannelModel.updateMany({ 'permissions.$.id': deletedRole.id }, { 'permissions.$.id': newRole.id });

        for (const overwrite of deletedRole.channelOverwrites) {
            const channel = question.guild.channels.cache.get(overwrite.id) as GuildChannel;
            if (channel) channel.permissionOverwrites.create(newRole.id, overwrite.permissions);
        }

        const role = deletedRoles.find((role) => role.id === deletedRole.id);
        role.id = newRole.id;
        
        const safeRole = client.utils.safeRoles.find((sRole) => sRole.id === deletedRole.id);
        if (safeRole) {
            const operation: { [key: string]: string } = {};
            if (safeRole.developer) operation['safeDevelopers'] = newRole.id;
            if (safeRole.owner) operation['safeOwners'] = newRole.id;
            if (safeRole.role) operation['safeRoles'] = newRole.id;
            if (safeRole.ban) operation['safeBans'] = newRole.id;
            if (safeRole.channel) operation['safeChannels'] = newRole.id;

            safeRole.id = newRole.id;
            await GuildModel.updateOne(
                { id: question.guildId }, 
                { 
                    $push: operation, 
                    $pull: { 
                        safeDevelopers: deletedRole.id, 
                        safeOwners: deletedRole.id,
                        safeRoles: deletedRole.id,
                        safeBans: deletedRole.id,
                        safeChannels: deletedRole.id 
                    } 
                }, 
                { upsert: true }
            );
        }
        
        if (client.utils.indelibleRoles.includes(deletedRole.id)) {
            client.utils.indelibleRoles = client.utils.indelibleRoles.filter((iRole) => iRole !== deletedRole.id);
            client.utils.indelibleRoles.push(newRole.id);
            await GuildModel.updateOne({ id: question.guildId }, { $pull: { indelibleRoles: deletedRole.id }, $push: { indelibleRoles: newRole.id } }, { upsert: true });
        }
    }

    const arrayMembers = [...new Set<string>(deletedRoles.map((role) => role.members).reduce((a, b) => a.concat(b)))];
    if (!arrayMembers.length) return question.channel.send('Roles have not members.');

    client.utils.startHelpers().then(async (distributors) => {
        if (distributors.length === 0) return client.logger.error('Tokens length must be minimum 2.');

        const extraMembers = arrayMembers.length % distributors.length;
        const perMembers = (arrayMembers.length - extraMembers) / distributors.length;
        for (let index = 0; index < distributors.length; index++) {
            const members = arrayMembers.splice(0, index === 0 ? perMembers + extraMembers : perMembers);
            if (members.length <= 0) break;
    
            const guild = await distributors[index].guilds.fetch(client.config.GUILD_ID);
            members.forEach(async (id, i) => {
                const roles = deletedRoles.filter((role) => role.members.includes(id)).map((role) => role.id);
                const member = guild.members.cache.get(id);
                if (member) await member.roles.add(roles.filter((role) => !member.roles.cache.has(role)));

                if (members.length === i + 1) distributors[index].destroy();
            });
        }
    });
}

async function checkChannels(question: Message, row: MessageActionRow) {
    const channels = await ChannelModel.find();
    const deletedChannels: ChannelSchema[] = channels.filter((channel) => !question.guild.channels.cache.has(channel.id));
    if (!deletedChannels.length) return;

    (row.components[1] as MessageButton).setDisabled(true);
    question.edit({
        content: 'Change bot settings using the menu below!',
        components: [row],
    });

    const sortedChannels = [
        ...deletedChannels.filter((channel) => channel.type === 4),
        ...deletedChannels.filter((channel) => channel.type !== 4),
    ];
    for (const deletedChannel of sortedChannels) {
        const newChannel = (await question.guild.channels.create(deletedChannel.name, {
            nsfw: deletedChannel.nsfw,
            parent: deletedChannel.parent,
            type: deletedChannel.type,
            topic: deletedChannel.topic,
            position: deletedChannel.position,
            permissionOverwrites: deletedChannel.permissionOverwrites,
            userLimit: deletedChannel.userLimit,
        })) as GuildChannel;
        await RoleModel.updateMany({ 'channelOverwrites.$.id': deletedChannel.id }, { 'channelOverwrites.$.id': newChannel.id });
        await ChannelModel.updateOne({ id: deletedChannel.id }, { id: newChannel.id });

        if (newChannel.type === 'GUILD_CATEGORY') {
            for (const parentChannel of deletedChannels.filter((channel) => channel.parent === deletedChannel.id)) {
                parentChannel.parent = newChannel.id;
            }
            await ChannelModel.updateMany({ parent: deletedChannel.id }, { parent: newChannel.id });

            const parentChannels = channels.filter((channel) => channel.parent === deletedChannel.id);
            for (const parentChannel of parentChannels) {
                const channel = question.guild.channels.cache.get(parentChannel.id) as GuildChannel;
                if (channel) await channel.setParent(newChannel.id, { lockPermissions: false });
            }
        }
    }
}
