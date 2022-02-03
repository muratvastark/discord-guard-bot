import { MessageSelectMenu, MessageActionRow, MessageEmbed, Message, Role } from 'discord.js';
import { Core } from '../base/Core';
import { GuildModel } from '../models/Guild';

const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

const Safes: Backup.Command = {
    usages: ['safe', 'safes'],
    execute: async ({ client, message, args }) => {
        const operation = args[0] ? args[0] : undefined;
        if (!operation) return message.channel.send('Please specified a valid argument. (`list`, `role` or `user`)');

        if (operation === 'list') return await showLists(client, message);
        await addSafe(client, message, args);
    },
};

export default Safes;

async function showLists(client: Core, message: Message) {
    const data = await GuildModel.findOne({ id: message.guildId });
    if (!data) return message.channel.send('List is not found.');

    let rows: MessageActionRow[] = [];
    ['safeChannels', 'safeBans', 'safeRoles', 'safeOwners', 'safeDevelopers'].forEach((key) => {
        const array: string[] = data[key];
        if (!array.length) return;
        rows.push(
            new MessageActionRow()
                .addComponents(
                    new MessageSelectMenu()
                        .setCustomId(`list-${key}`)
                        .setPlaceholder(`Nothing selected. (${capitalize(key.slice(4))})`)
                        .addOptions(
                            array.map((element) => {
                                const elementName = message.guild.roles.cache.get(element)?.name || client.users.cache.get(element)?.tag || element;
                                return { label: elementName, value: element, description: 'Click for remove!' };
                            })
                        )
                        .setMaxValues(array.length === 25 ? 25 : array.length)
                        .setMinValues(1)
                )
        )
    });

    const question = await message.channel.send({ content: rows.length ? 'I show you the lists.' : 'List is not found.', components: rows })
    const collector = await question.createMessageComponentCollector({
        componentType: 'SELECT_MENU',
        filter: (component) => component.user.id === message.author.id && component.customId.startsWith('list'),
        time: 60000,
    });

    collector.on('collect', async (interaction) => {
        interaction.deferUpdate();

        const componentId = interaction.customId.split('-')[1];
        const key = componentId.slice(4).slice(0, -1).toLowerCase();
        interaction.values.forEach(async (value) => {
            const safeRole = client.utils.safeRoles.find((sRole) => sRole.id === value);
            if (safeRole) safeRole[key] = false;

            const safe = client.safes.get(value);
            if (safe) safe[key] = false;

            await GuildModel.updateOne({ id: message.guildId }, { $pull: { [componentId]: value } })
        });
        
        rows = [...rows.filter(row => row.components[0].customId !== interaction.customId)];
        const array = data[componentId].filter((element) => !interaction.values.includes(element))
        if (array.length) {
            rows.push(
                new MessageActionRow()
                .addComponents(
                    new MessageSelectMenu()
                        .setCustomId(`list-${interaction.customId}`)
                        .setPlaceholder(`Nothing selected. (${capitalize(componentId.slice(4))})`)
                        .addOptions(
                            array.map((element) => {
                                const elementName = message.guild.roles.cache.get(element)?.name || client.users.cache.get(element)?.tag || element;
                                return { label: elementName, value: element, description: 'Click for remove!' };
                            })
                        )
                        .setMaxValues(array.length === 25 ? 25 : array.length)
                        .setMinValues(1)
                )
            )
        }        
        question.edit({ 
            content: rows.length ? 'I show you the lists.' : 'List is not found.', 
            components: rows
        });
    });

    collector.on('end', () => {
        question.delete();
    });
}

async function addSafe(client: Core, message: Message, args: string[]) {
    const target = args[0] ? (message.guild.members.cache.get(args[0].replace(/\D/g, '')) || message.guild.roles.cache.get(args[0].replace(/\D/g, ''))) : undefined;
    if (!target) return message.channel.send('Specify a valid user or role.');

    const row = new MessageActionRow()
        .addComponents(
            new MessageSelectMenu()
                .setCustomId('safes')
                .setPlaceholder('Nothing selected.')
                .addOptions([
                    { label: 'Developer', value: 'safeDeveloper' },
                    { label: 'Owner', value: 'safeOwner' },
                    { label: 'Role', value: 'safeRole' },
                    { label: 'Ban and Kick', value: 'safeBan' },
                    { label: 'Channel', value: 'safeChannel' },
                ])
                .setMaxValues(5)
                .setMinValues(1)
        );

    const question = await message.channel.send({
        embeds: [
            new MessageEmbed({
                author: {
                    name: message.author.tag,
                    icon_url: message.author.displayAvatarURL({ dynamic: true })
                },
                description: [
                    `**Developer:** Everything is free.`,
                    `**Owner:** Everything is free except deleting secure roles and everything is limited.`,
                    `**Role:** Only operations is limited.`,
                    `**Ban and Kick:** Only ban and kick operations is limited.`,
                    `**Channel:** Only channel operations is limited.`
                ].join('\n'),
                color: 'RANDOM',
                footer: {
                    text: 'Select tier using the menu below! To take back the permissions you have given, use the command and select the authorities you have given.'
                }
            })
        ],
        components: [row],
    });

    question.awaitMessageComponent({
        componentType: 'SELECT_MENU',
        filter: (component) => component.user.id === message.author.id,
        time: 60000,
    })
        .then(async (collected) => {
            const addedAuths = [];
            const removedAuths = [];
            for (const value of collected.values) {
                const newKey = value.toLowerCase().slice(4);
                if (target instanceof Role) {
                    const safeRole = client.utils.safeRoles.find((sRole) => sRole.id === target.id) || { ban: false, channel: false, developer: false, owner: false, role: false };
                    if (!safeRole[newKey]) {
                        await GuildModel.updateOne({ id: message.guildId }, { $push: { [`${value}s`]: target.id } }, { upsert: true });
                        safeRole[newKey] = true;
                        addedAuths.push(newKey);
                    } else {
                        await GuildModel.updateOne({ id: message.guildId }, { $pull: { [`${value}s`]: target.id } }, { upsert: true });
                        safeRole[newKey] = false;
                        removedAuths.push(newKey);
                    }
                    if (!client.utils.safeRoles.some((sRole) => sRole.id === target.id)) client.utils.safeRoles.push({ ...safeRole, id: target.id })
                    continue;
                }

                const person = client.safes.get(target.id) || { ban: false, channel: false, developer: false, owner: false, role: false };
                if (!person[newKey]) {
                    await GuildModel.updateOne({ id: message.guildId }, { $push: { [`${value}s`]: target.id } }, { upsert: true });
                    person[newKey] = true;
                    addedAuths.push(newKey);
                } else {
                    await GuildModel.updateOne({ id: message.guildId }, { $pull: { [`${value}s`]: target.id } }, { upsert: true });
                    person[newKey] = false;
                    removedAuths.push(newKey);
                }
                client.safes.set(target.id, person);
            }

            question.delete();
            collected.reply({
                content: [
                    'The specified operations were performed successfully.',
                    `\`Added Authorities:\` ${addedAuths.map(auth => capitalize(auth)).join(', ') || 'None'}.`,
                    `\`Removed Authorities:\` ${removedAuths.map(auth => capitalize(auth)).join(', ') || 'None'}.`,
                ].join('\n'),
                ephemeral: true
            });
        })
        .catch(() => question.delete());
}
