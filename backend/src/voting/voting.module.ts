import { Module } from '@nestjs/common';
import { MonthlyVotingService } from './monthly-voting.service';
import { PollsService } from './polls.service';
import { VotingController } from './voting.controller';

@Module({
  controllers: [VotingController],
  providers: [PollsService, MonthlyVotingService],
})
export class VotingModule {}
