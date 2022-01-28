import { ClientEvents, Message, PermissionString } from 'discord.js';
import { Core } from '../../base/Core';

export {};

declare global {
  namespace Backup {
    interface PermissionObject {
      [key: PermissionString]: boolean;
    }

    interface Limit {
      count: number;
      lastDate: number;
    }
    
    interface GuildSettings {
      name: string;
      icon: string;
      banner: string;
    }

    interface CommandArgs {
      client: Core;
      message: Message;
      args: string[];
    }

    interface Command {
      usages: string[];
      execute: (arguments: CommandArgs) => any ;
    }

    interface Event {
      name: keyof ClientEvents;
      execute: (client: Core, ...args: any[]) => any | Promise<any>;
    }

    interface RoleOverwrites {
      id: string;
      permissions: PermissionObject;
    }

    interface Permission {
      ID: string;
      ALLOW: PermissionString[];
    }

    interface Safe {
      developer?: boolean;
      owner?: boolean;
      role?: boolean;
      ban?: boolean;
      channel?: boolean;
    }

    interface SafeRole extends Safe {
      id: string;
    }

    interface Config {
      GUILD_ID: string;
      PREFIX: string;
      STATUS: string;
      TOKENS: string[];
      MONGO_URL: string;
    }
  }
}
