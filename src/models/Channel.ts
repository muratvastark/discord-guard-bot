import { prop, getModelForClass, modelOptions } from '@typegoose/typegoose';
import { OverwriteData } from 'discord.js';

@modelOptions({ options: { customName: 'Channels', allowMixed: 0 } })
export class ChannelSchema {
  @prop({ type: () => String, required: true, unique: true })
  id!: string;

  @prop({ type: () => String, required: true })
  name!: string;

  @prop({ type: () => Number, required: true })
  type!: number;

  @prop({ type: () => String, required: false, default: undefined })
  parent?: string;

  @prop({ type: () => String, required: false })
  topic!: string;

  @prop({ type: () => Number, required: true })
  position!: number;

  @prop({ type: () => Number, required: false })
  userLimit!: number;

  @prop({ type: () => Boolean, required: false })
  nsfw!: boolean;

  @prop({ type: () => [Object], required: true })
  permissionOverwrites!: OverwriteData[];
}

export const ChannelModel = getModelForClass(ChannelSchema);
