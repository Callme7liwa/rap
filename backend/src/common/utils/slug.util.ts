import { BadRequestException } from '@nestjs/common';

export function normalizeSlug(value: string): string {
  const slug = value
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!slug) {
    throw new BadRequestException('Slug cannot be empty');
  }

  return slug;
}
