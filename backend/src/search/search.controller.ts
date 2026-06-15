import { Controller, Get, Query } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { SearchQueryDto } from './dto/search-query.dto';
import { SearchResponse } from './entities/search.response';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @Public()
  search(@Query() query: SearchQueryDto): Promise<SearchResponse> {
    return this.searchService.search(query);
  }
}
