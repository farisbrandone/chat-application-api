import { Injectable, RawBodyRequest } from '@nestjs/common';
import { PrismaService } from 'src/user/prisma.service';
import Stripe from 'stripe';
import { type Request as RequestType } from 'express';

@Injectable()
export class StripeService {
  private readonly stripe: Stripe;
  /* private readonly prisma: PrismaService;*/
  constructor(
    private readonly prisma: PrismaService /**on importe ici pour profiter de l'injection de dépendance */,
  ) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20',
    });
  }
  async createConnectedAccount(
    {
      userId,
    }: {
      userId: string;
    } /**permet d'identifier l'utilisateur qui se connecte à la platforme */,
  ): Promise<{
    accountLink: string;
  }> /*on type fortement la valeur de retour de la fonction*/ {
    /**pour etre sur que l'utilisateur existe on fait un findUniqueOrThrow  ce qui declenche une erreur si utilisateur n'existe pas*/
    const existingUser = await this.prisma.user.findUniqueOrThrow({
      where: {
        id: userId,
      },
      select: {
        id: true,
        stripeAccountId: true,
        email: true,
      },
    });
    if (existingUser.stripeAccountId) {
      const accounLink = await this.createAccoountLink({
        stripeAccountId: existingUser.stripeAccountId,
      });
      return { accountLink: accounLink.url };
    }
    /**sinon on cree un nouveau compte stripe pour ce client qui c'est connecté */
    const stripeAccount = await this.stripe.accounts.create({
      type: 'express',
      email:
        existingUser.email /**Les champs à remplir dans le formulaire de stripe */,
      default_currency: 'EUR',
    });
    /**nous allons stocker l'id de ce compte connecter dans notre base de donnée 
  nous allons pour cela importer le service prisma*/
    await this.prisma.user.update({
      where: {
        id: existingUser.id,
      },
      data: {
        stripeAccountId: stripeAccount.id,
      },
    });
    /**ici nous récupéront  les coordonné bancaire du compte connecté
     * le client sera redirigé vers ces url pour entrer ces coordonné bancaire
     */
    /* const accountLink = await this.stripe.accountLinks.create({
      account: stripeAccount.id,
      refresh_url:
        'https://localhost:8000/pay' /**ici on met url qui permet de faire un don ,
      return_url: 'https://localhost:8000' /**et isi c'est url de retour ,
      type: 'account_onboarding',
    });*/
    const accounLink = await this.createAccoountLink({
      stripeAccountId: stripeAccount.id,
    });
    return { accountLink: accounLink.url };
  }

  async createAccoountLink({ stripeAccountId }: { stripeAccountId: string }) {
    /**ici nous récupéront  les coordonné bancaire du compte connecté
     * le client sera redirigé vers ces url pour entrer ces coordonné bancaire
     */
    const accountLink = await this.stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url:
        'https://localhost:3000/onboarding' /**ici on met url qui permet de faire un don */,
      return_url:
        'https://localhost3000' /**et isi c'est url de retour 3000 it is a port for frontend application*/,
      type: 'account_onboarding',
    });
    return accountLink;
  }

  async getStripeAccount({ stripeAccountId }: { stripeAccountId: string }) {
    const stripeAccount = await this.stripe.accounts.retrieve(stripeAccountId);
    /**verifions si ce compte client connecter peut recevoir de l'argent */
    const canReceiveMoney = stripeAccount.charges_enabled;

    return { stripeAccount, canReceiveMoney };
  }

  /**metre la logique de redirection vers le formulaire de stripe pour l'entrée des donnée bancaire */
  async createExempleDonation({
    receiverStripeAccountId /**c'est le stripe accounId de la personne qui va recevoir de l'argent */,
    firstname,
  }: {
    receiverStripeAccountId: string;
    firstname: string /**le nom de la personne qui recoit notre donc */;
  }) {
    const receiverStripeAccount = await this.stripe.accounts.retrieve(
      receiverStripeAccountId,
    ); /**on recupère les infos du compte associées à cet id dans stripe.
      ca permet également de vérifier que ce compte est présent dans stripe */

    /**créons un produit */
    /**les produit stripe n'est pas creer pour chaque donation puisque c'est l'utilisateur qui recoit le don. celui ci peut etre créer a la creation de chaque utilisateur */
    const product = await this.stripe.products.create({
      name: `Soutenez ${firstname} `,
    });

    /***************************** */
    /**créons un object de prix sur stripe et attachons notre produit a ce prix */

    const price = await this.stripe.prices.create({
      currency: 'EUR',
      custom_unit_amount: {
        enabled:
          true /**permet au utilisateur de choisir le montant qu'ils souhaitent payer */,
      },
      product: product.id,
    });

    /***************************** */
    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        /**tableau de prix ou d'article que nous vendons */
        {
          price: price.id,
          quantity: 1,
        },
      ],
      payment_intent_data: {
        /**les informations associées à nos payment */
        application_fee_amount: 0 /**taxe récupérer lors de la transaction comme c'est un don 0 */,
        transfer_data: {
          destination: receiverStripeAccount.id,
        },
      },
      success_url: 'https://localhost:3000' /**url de success */,
      cancel_url: 'https://localhost:3000',
    });
    /**cette session contient une url de payment qui est renvoyé coté client */
    return { sessionUrl: session.url };
  }

  /************************************************* */

  async createDonation({
    receivingUserId,
    givingUserId,
  }: {
    receivingUserId: string;
    givingUserId: string;
  }): Promise<{ error: boolean; message: string; sessionUrl: string | null }> {
    try {
      if (receivingUserId === givingUserId) {
        throw new Error('Vous ne pouvez pas vous faire de dons à vous-même');
      }
      const [receivingUser, givingUser] = await Promise.all([
        this.prisma.user.findUniqueOrThrow({
          where: {
            id: receivingUserId,
          },
          select: {
            id: true,
            firstName: true,
            stripeProductId: true,
            stripeAccountId: true,
          },
        }),
        this.prisma.user.findUniqueOrThrow({
          where: {
            id: givingUserId,
          },
          select: {
            id: true,
            stripeAccountId: true,
          },
        }),
      ]);

      if (!receivingUser.stripeAccountId) {
        throw new Error(
          "L'utilisateur recevant le don n'a pas de compte Stripe et ne peut pas recevoir de dons",
        );
      }
      if (!givingUser.stripeAccountId) {
        throw new Error(
          "L'utilisateur envoyant le don n'a pas de compte Stripe et ne peut pas recevoir de dons",
        );
      }
      const stripeAccount = await this.stripe.accounts.retrieve(
        receivingUser.stripeAccountId,
      );

      let { stripeProductId } = receivingUser;

      if (!stripeProductId) {
        const product = await this.stripe.products.create({
          name: `Soutenez ${receivingUser.firstName}`,
        });

        await this.prisma.user.update({
          where: {
            id: receivingUser.id,
          },
          data: {
            stripeProductId: product.id,
          },
        });
        stripeProductId = product.id;
      }

      const price = await this.stripe.prices.create({
        currency: 'EUR',
        custom_unit_amount: {
          enabled: true,
        },
        product: stripeProductId,
      });

      const createdDonation = await this.prisma.donation.create({
        data: {
          stripePriceId: price.id,
          stripeProductId: stripeProductId,
          receivingUser: {
            connect: {
              id: givingUser.id,
            },
          },
          givingUser: {
            connect: {
              id: receivingUser.id,
            },
          },
        },
      });

      const session = await this.stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [
          {
            price: price.id,
            quantity: 1,
          },
        ],
        payment_intent_data: {
          application_fee_amount: 0,
          metadata: {
            donationId: createdDonation.id,
          },
          transfer_data: {
            destination: stripeAccount.id,
          },
        },
        success_url: 'http://localhost:3000',
        cancel_url: 'http://localhost:3000',
      });

      return {
        sessionUrl: session.url,
        error: false,
        message: 'La session a bien été créée.',
      };
    } catch (error) {
      if (error instanceof Error) {
        return {
          error: true,
          message: error.message,
          sessionUrl: null,
        };
      }
    }
  }

  async handleWebhooks({
    request,
  }: {
    request: RawBodyRequest<RequestType>;
  }): Promise<{ error: boolean; message: string }> {
    try {
      const sig = request.headers['stripe-signature'];

      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!endpointSecret) {
        throw new Error('The endpoint secret is not defined');
      }

      const event = this.stripe.webhooks.constructEvent(
        request.rawBody,
        sig,
        endpointSecret,
      );

      // Handle the event
      switch (
        event.type /**exécution de logique selon les évènement renvoyé par stripe après connexion avec le cli de stripe */
      ) {
        case 'payment_intent.succeeded':
          const paymentIntentSucceeded = event.data.object;
          // Then define and call a function to handle the event payment_intent.succeeded
          const amount = paymentIntentSucceeded.amount;
          const donationId = paymentIntentSucceeded.metadata.donationId;

          console.log({ donationId, amount });
          await this.prisma.donation.update({
            where: {
              id: donationId,
            },
            data: {
              amount: amount,
            },
          });

          break;
        // ... handle other event types
        default:
          console.log(`Unhandled event type ${event.type}`);
      }

      // Return a 200 response to acknowledge receipt of the event
      return {
        error: false,
        message: 'Webhook handled successfully',
      };
    } catch (err) {
      console.error(`Webhook Error: ${err.message}`);
      return {
        error: true,
        message: `Webhook Error: ${err.message}`,
      };
    }
  }
}
