import {
  Controller,
  Get,
  Param,
  Post,
  RawBodyRequest,
  Request,
  UseGuards,
} from '@nestjs/common';
import { StripeService } from './stripe.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RequestWithUser } from 'src/auth/jwt.strategy';
import { type Request as RequestType } from 'express';
@Controller('stripe')
export class StripeController {
  constructor(private readonly stripe: StripeService) {}

  @UseGuards(JwtAuthGuard)
  @Post('connect')
  async getConversations(
    /*@Param('userId') userId: string,*/
    @Request() request: RequestWithUser,
  ): Promise<{
    accountLink: string;
  }> {
    return await this.stripe.createConnectedAccount({
      userId: request.user.userId,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('donate/:receivingUserId')
  //   localhost:3000/stripe/donate/id POST
  async createDonation(
    @Param('receivingUserId') receivingUserId: string,
    @Request() request: RequestWithUser,
  ): Promise<{ error: boolean; message: string; sessionUrl: string | null }> {
    return await this.stripe.createDonation({
      givingUserId: request.user.userId,
      receivingUserId,
    });
  }
  /**chemin de connection à stripe pour recevoir les notification sur la valeur des don fait p
   * fait par les utilisateurs ces valeurs seront stocker dans la base de données de donations
   * puisque le reglage de cette section se fait dans la session de stripe
   */
  @Post('webhook')
  //   localhost:3000/stripe/donate/id POST
  async handleWebhooks(@Request() request: RawBodyRequest<RequestType>) {
    return await this.stripe.handleWebhooks({ request });
  }
}
