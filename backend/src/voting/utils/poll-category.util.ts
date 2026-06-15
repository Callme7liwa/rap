import { BadRequestException } from '@nestjs/common';
import { PollCategory } from '@prisma/client';

export function parsePollCategory(value: string): PollCategory {
  switch (value.toLowerCase()) {
    case 'artist':
      return PollCategory.ARTIST;
    case 'album':
      return PollCategory.ALBUM;
    case 'song':
      return PollCategory.SONG;
    default:
      throw new BadRequestException('Invalid poll category');
  }
}

export function normalizePollCategoryInput(value: unknown): unknown {
  return typeof value === 'string' ? value.toUpperCase() : value;
}

export function getCurrentMonthlyPeriod(date = new Date()): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');

  return `${year}-${month}`;
}
