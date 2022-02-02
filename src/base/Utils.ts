import { readdirSync } from 'fs';
import { resolve } from 'path';
import { Client, Collection, Intents, PermissionString, Snowflake } from 'discord.js';
import { Core } from './Core';
import { RoleModel, RoleSchema } from '../models/Role';
import { ChannelModel, ChannelSchema } from '../models/Channel';
import { GuildModel } from '../models/Guild';

enum ChannelTypes {
  GUILD_TEXT = 0,
  DM = 1,
  GUILD_VOICE = 2,
  GROUP_DM = 3,
  GUILD_CATEGORY = 4,
  GUILD_NEWS = 5,
  GUILD_STORE = 6,
  UNKNOWN = 7,
  GUILD_NEWS_THREAD = 10,
  GUILD_PUBLIC_THREAD = 11,
  GUILD_PRIVATE_THREAD = 12,
  GUILD_STAGE_VOICE = 13,
}

export class Utils {
  private readonly client: Core;
  public danger: Boolean = true;
  public indelibleRoles: string[] = []
  public closingPermissions: Boolean = false;
  private limits = new Collection<string, Backup.Limit>();
  public guildSettings: Backup.GuildSettings;
  public safeRoles: Backup.SafeRole[] = [];
  public readonly dangerPerms: PermissionString[] = [
    'ADMINISTRATOR',
    'KICK_MEMBERS',
    'MANAGE_GUILD',
    'BAN_MEMBERS',
    'MANAGE_ROLES',
    'MANAGE_WEBHOOKS',
    'MANAGE_NICKNAMES',
    'MANAGE_CHANNELS',
  ];

  constructor(client) {
    this.client = client;
    this.danger = true;
  }

  startHelpers(): Promise<Client[]> {
    this.client.logger.info('The helpers is waking up.');

    const promises = [];
    for (const TOKEN of this.client.config.TOKENS) {
      promises.push(new Promise<any>((resolve) => {
        const helperClient = new Client({
          intents: [
            Intents.FLAGS.GUILDS,
            Intents.FLAGS.GUILD_PRESENCES
          ],
          presence: {
            activities: [{ name: this.client.config.STATUS, type: 'WATCHING' }],
          },
        });

        helperClient.on('ready', () => {
          const guild = helperClient.guilds.cache.get(this.client.config.GUILD_ID);
          if (!guild) {
            this.client.logger.warning(`WARN: ${helperClient.user.tag} is not in server!`);
            helperClient.destroy();
            return;
          }

          this.client.safes.set(helperClient.user.id, { developer: true });
          resolve(helperClient);
        });

        helperClient.on('rateLimit', (rateLimitData) => {
          this.client.logger.warning(`WARN: ${helperClient.user.tag} rate limited caught. Retrying in ${Math.round(rateLimitData.timeout / 1000)} seconds.`);
        });

        helperClient.login(TOKEN);
      }));
    }

    return Promise.all(promises);
  }

  async getBackup(): Promise<boolean> {
    const guild = this.client.guilds.cache.get(this.client.config.GUILD_ID);
    if (!guild || (!guild.roles.cache.size && !guild.channels.cache.size)) return false;

    await RoleModel.deleteMany();
    guild.roles.cache.sort((a, b) => a.position - b.position).filter(role => !role.managed).forEach(async (role) => {
      const channelOverwrites: Backup.RoleOverwrites[] = [];
      guild.channels.cache.forEach((channel) => {
        if (channel.isThread() || !channel.permissionOverwrites.cache.has(role.id)) return;

        const permission = channel.permissionOverwrites.cache.get(role.id);
        channelOverwrites.push({
          id: channel.id,
          permissions: { ...permission.deny.serialize(), ...permission.allow.serialize() },
        });
      });

      await RoleModel.create<RoleSchema>({
        id: role.id,
        channelOverwrites: channelOverwrites,
        members: role.members.map((member) => member.id),
        name: role.name,
        color: role.color,
        position: role.position,
        permissions: role.permissions.toArray(),
        mentionable: role.mentionable,
        hoist: role.hoist
      });
    });

    await ChannelModel.deleteMany();
    guild.channels.cache.forEach(async (channel) => {
      if (channel.isThread()) return;

      await ChannelModel.create<ChannelSchema>({
        id: channel.id,
        type: ChannelTypes[channel.type],
        parent: channel.parentId,
        name: channel.name,
        topic: channel.isText() ? channel.topic : undefined,
        position: channel.position,
        permissionOverwrites: channel.permissionOverwrites.cache.map((permission) => {
          return {
            id: permission.id,
            type: permission.type,
            allow: permission.allow.toArray(),
            deny: permission.deny.toArray(),
          };
        }),
        nsfw: channel.isText() ? channel.nsfw : undefined,
        userLimit: channel.isVoice() ? channel.userLimit : undefined,
      });
    });
    return true;
  }

  async closePermissions() {
    if (this.closingPermissions) return;

    this.closingPermissions = true;

    const guild = this.client.guilds.cache.get(this.client.config.GUILD_ID);
    if (!guild) return;

    const permissions = [];
    guild.roles.cache.
      filter((role) => this.dangerPerms.some((perm) => role.permissions.has(perm))).
      forEach((role) => {
        permissions.push({
          ID: role.id,
          ALLOW: role.permissions.toArray()
        });
        role.setPermissions([]);
      });
    await GuildModel.updateOne({ id: guild.id }, { $set: { permissions: permissions } }, { upsert: true });
  }

  checkLimits(id: Snowflake, type: 'ban_kick' | 'channel_operations' | 'role_operations', limit: number = 5, time: number = 1000 * 60 * 15) {
    const now = Date.now().valueOf();
    const key = `${id}_${type}`;
    const userLimits = this.limits.get(key);
    if (!userLimits) {
      this.limits.set(key, { count: 1, lastDate: now });
      return false;
    }

    userLimits.count++;
    const diff = now - userLimits.lastDate;
    if (diff < time && userLimits.count >= limit) return true;

    if (diff > time) this.limits.set(key, { count: 1, lastDate: now });;
    return false;
  }

  async loadEvents() {
    const files = readdirSync(resolve(__dirname, '..', 'events'));
    for (const file of files) {
      const event = (await import(resolve(__dirname, '..', 'events', file))).default as Backup.Event;
      this.client.on(event.name, (...args) => event.execute(this.client, ...args));
    }
  }

  async loadCommands() {
    const commandFiles = readdirSync(resolve(__dirname, '..', 'commands'));
    for (const name of commandFiles) {
      const command = (await import(resolve(__dirname, '..', 'commands', name))).default as Backup.Command;
      this.client.commands.set(command.usages[0], command);
    }
  }
}
