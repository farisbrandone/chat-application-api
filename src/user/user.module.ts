import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { PrismaService } from './prisma.service';
import { AwsS3Service } from 'src/aws/aws-s3.service';
import { StripeService } from 'src/stripe/stripe.service';

@Module({
  controllers: [UserController],
  providers: [UserService, PrismaService, AwsS3Service, StripeService],
})
export class UserModule {}
