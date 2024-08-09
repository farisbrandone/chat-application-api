import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { z } from 'zod';
import { fileSchema } from 'src/file-utils';
import { AwsS3Service } from 'src/aws/aws-s3.service';
import { StripeService } from 'src/stripe/stripe.service';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly awsS3Service: AwsS3Service,
    private readonly stripe: StripeService,
  ) {}
  async getUsers() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        avatarFileKey: true,
      },
    });
    const usersWithAvatar = Promise.all(
      users.map(async (user, index) => {
        let avatarUrl = '';
        if (user.avatarFileKey) {
          avatarUrl = await this.awsS3Service.getFile({
            filekey: user.avatarFileKey,
          });
        }
        return { ...user, avatarUrl };
      }),
    );
    return usersWithAvatar;
  }

  async getUser({ userId }: { userId: string }) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        avatarFileKey: true,
        stripeAccountId: true,
      },
    });
    let avatarUrl = '';
    if (user.avatarFileKey) {
      avatarUrl = await this.awsS3Service.getFile({
        filekey: user.avatarFileKey,
      });
    }
    /**récupéront également les variables associé a stripe pour cet utilisateur que l'on souhaite renvoyé */
    let canReceiveMoney = false;
    if (user.stripeAccountId) {
      const stripeAccountData = await this.stripe.getStripeAccount({
        stripeAccountId: user.stripeAccountId,
      });
      canReceiveMoney = stripeAccountData.canReceiveMoney;
    }

    return { ...user, avatarUrl, canReceiveMoney };
  }

  /**add avatar functionnality for test amazone s3 services */

  async updateUser({
    userId,
    submittedFile,
  }: {
    userId: string;
    submittedFile: z.infer<typeof fileSchema>;
  }) {
    const existingUser = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        avatarFileKey: true,
      },
    });
    if (!existingUser) {
      throw new Error("L'utilisateur n'existe pas");
    }
    const { fileKey } = await this.awsS3Service.uploadFile({
      file: submittedFile,
    });

    const user = await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        avatarFileKey: fileKey,
      },
    });
    if (existingUser.avatarFileKey) {
      await this.awsS3Service.deleteFile({
        filekey: existingUser.avatarFileKey,
      });
    }
    return user;
  }
}
