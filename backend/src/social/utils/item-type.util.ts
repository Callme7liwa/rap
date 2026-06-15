import { BadRequestException } from '@nestjs/common';
import { ItemType } from '@prisma/client';

export function parseItemTypeParam(type: string): ItemType {
  switch (type.toLowerCase()) {
    case 'song':
      return ItemType.SONG;
    case 'album':
      return ItemType.ALBUM;
    default:
      throw new BadRequestException('Invalid item type');
  }
}
