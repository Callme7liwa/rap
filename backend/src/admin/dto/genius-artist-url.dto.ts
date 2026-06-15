import { IsUrl } from 'class-validator';

export class GeniusArtistUrlDto {
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  url: string;
}
