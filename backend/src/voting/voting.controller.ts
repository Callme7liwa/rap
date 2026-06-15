import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { JwtUser } from '../auth/types/jwt-user.type';
import { CreateMonthlyVoteDto } from './dto/create-monthly-vote.dto';
import { CreatePollDto } from './dto/create-poll.dto';
import { CreatePollVoteDto } from './dto/create-poll-vote.dto';
import { VotingQueryDto } from './dto/voting-query.dto';
import {
  CountResponse,
  MonthlyTopItemResponse,
  MonthlyVoteResponse,
  PollResponse,
  PollVoteResponse,
} from './entities/voting.response';
import { MonthlyVotingService } from './monthly-voting.service';
import { PollsService } from './polls.service';

const USER_ROLES = [Role.USER, Role.ARTIST, Role.ADMIN] as const;

@Controller('voting')
export class VotingController {
  constructor(
    private readonly pollsService: PollsService,
    private readonly monthlyVotingService: MonthlyVotingService,
  ) {}

  @Get('polls')
  @Public()
  findActivePolls(): Promise<PollResponse[]> {
    return this.pollsService.findActivePolls();
  }

  @Get('polls/:id')
  @Public()
  findPoll(@Param('id', ParseIntPipe) id: number): Promise<PollResponse> {
    return this.pollsService.findOne(id);
  }

  @Post('polls')
  @Roles(Role.ADMIN)
  createPoll(
    @Body() dto: CreatePollDto,
    @CurrentUser() user: JwtUser,
  ): Promise<PollResponse> {
    return this.pollsService.create(dto, user);
  }

  @Put('polls/:id/close')
  @Roles(Role.ADMIN)
  closePoll(@Param('id', ParseIntPipe) id: number): Promise<PollResponse> {
    return this.pollsService.close(id);
  }

  @Post('polls/:id/vote')
  @Roles(...USER_ROLES)
  voteOnPoll(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreatePollVoteDto,
    @CurrentUser() user: JwtUser,
  ): Promise<PollVoteResponse> {
    return this.pollsService.vote(id, dto, user);
  }

  @Get('polls/:id/my-vote')
  @Roles(...USER_ROLES)
  findMyPollVote(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtUser,
  ): Promise<PollVoteResponse | null> {
    return this.pollsService.findMyVote(id, user);
  }

  @Get('user/votes')
  @Roles(...USER_ROLES)
  findMyPollVotes(@CurrentUser() user: JwtUser): Promise<PollVoteResponse[]> {
    return this.pollsService.findUserVotes(user);
  }

  @Post('monthly/vote')
  @Roles(...USER_ROLES)
  voteMonthly(
    @Body() dto: CreateMonthlyVoteDto,
    @CurrentUser() user: JwtUser,
  ): Promise<MonthlyVoteResponse> {
    return this.monthlyVotingService.vote(dto, user);
  }

  @Get('monthly/my-votes')
  @Roles(...USER_ROLES)
  findMyMonthlyVotes(
    @CurrentUser() user: JwtUser,
  ): Promise<MonthlyVoteResponse[]> {
    return this.monthlyVotingService.findMyVotes(user);
  }

  @Get('monthly/top')
  @Public()
  findMonthlyTop(
    @Query() query: VotingQueryDto,
  ): Promise<MonthlyTopItemResponse[]> {
    return this.monthlyVotingService.findTop(query);
  }

  @Get('monthly/:type/:id/count')
  @Public()
  countMonthlyItemVotes(
    @Param('type') type: string,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: VotingQueryDto,
  ): Promise<CountResponse> {
    return this.monthlyVotingService.countItemVotes(type, id, query);
  }
}
