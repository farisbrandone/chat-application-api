import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { PrismaService } from 'src/user/prisma.service';
import { AwsS3Service } from 'src/aws/aws-s3.service';

@Module({
  controllers: [ChatController],
  providers: [ChatService, PrismaService, AwsS3Service],
})
export class ChatModule {}
